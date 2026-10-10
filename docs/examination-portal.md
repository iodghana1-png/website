# Dedicated IoD-Gh Examination Portal

The portal is a separate Next.js application in `apps/exam-portal`. It uses the existing Django session authentication for staff, PostgreSQL database, institutional email sender and audit service. Candidates do not need a website account. It has no course, lesson, progress, payment or certificate module.

## Local operation

From the repository root:

```powershell
.\.venv\Scripts\python.exe backend/manage.py migrate examinations --settings=config.settings.development
npm run exam:dev
```

Open `http://localhost:3001/login`. The existing API must be running on `http://localhost:8010`. Development CORS and CSRF settings allow ports 3000 and 3001. Use the same hostname consistently (do not mix `localhost` with `127.0.0.1`).

Run the expiry/release worker in another terminal or process supervisor:

```powershell
.\.venv\Scripts\python.exe backend/manage.py process_examinations --watch --settings=config.settings.development
```

Alternatively schedule the command without `--watch` every minute. Requests also reconcile expired attempts and due results; backend write deadlines are enforced even when the worker is stopped. The worker is required for unattended expiration and scheduled notifications without student traffic.

## Administration

Use `/admin/examinations` on the main website. Access requires a verified, active superuser or a verified, active staff account in the existing **Training Officer** group. Being a CMS editor or merely having the staff flag does not grant examination access. Assign that role using existing authorized account administration; this installation does not elevate any account automatically.

1. Create questions in the question bank. Select exactly one correct option. Marks may be fractional.
2. Create an exam, select its question pool, configure duration, availability, pass mark, maximum attempts, randomization and release mode. New exams default to inactive and manual result release.
3. Create one cohort code, then add each eligible student by full name only (first name followed by last name). The same cohort code works for every active name on that exam.
4. Activate the exam when ready. Students enter their recorded full name, their own email address and the cohort code. The email is captured with their attempt and receives their submitted percentage.
5. Review attempts and their audit trail, release results, or export a selected exam's results as CSV.

Edits create new question/exam versions, never overwrite active or historical snapshots. Removing a question retires it from the future question bank; it does not erase the immutable versions already used in an exam or attempt. Result scores cannot be manually edited. Manual amendments would require a separate append-only adjustment model and approval workflow, which are deliberately not implemented.

Revoking eligibility prevents future starts; it does not silently cancel an already-started attempt. Deactivating an exam also prevents new starts while retaining attempts already issued. All attempts count toward the configured maximum. The current version governs future eligibility; the version recorded on an attempt governs its timing and grading.

The availability end is a hard deadline: an attempt expires at the earlier of its duration limit and the examination's end time. Late starts receive less time. Grade bands are A ≥80%, B ≥70%, C ≥60%, D ≥50%, otherwise F. Pass/fail uses the exam's configured pass mark and the official percentage rounded to two decimal places. Approve these policies before a real examination.

## Deployment — still requires hosting and DNS

This repository does not provision `exam.iodghana.org`, DNS, a hosting account or TLS certificates. A successful local build is not a live deployment.

- Deploy the existing Django API at `https://api.iodghana.org` using its production settings and existing PostgreSQL database. Back up before applying migrations.
- Deploy the separate exam frontend from this repository, using root `npm ci` and `npm run exam:build`; start with `npm run exam:start` behind an HTTPS reverse proxy. It listens on port 3001; keep that port private behind the proxy.
- Set the exam app's build-time `NEXT_PUBLIC_API_BASE_URL=https://api.iodghana.org` and `NEXT_PUBLIC_MAIN_SITE_URL=https://iodghana.org`.
- Set the main site's build-time `NEXT_PUBLIC_EXAM_PORTAL_URL=https://exam.iodghana.org` and rebuild it. The existing navigation item is reused; old `/training/exams` links redirect. CMS-managed links to the old path are mapped at rendering time, without rewriting navigation history.
- Add `https://exam.iodghana.org` to Django `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`, alongside the main website. Do not use wildcard origins.
- Set `EXAM_PORTAL_URL=https://exam.iodghana.org`. Enable `EXAM_EMAIL_NOTIFICATIONS=true` only after verifying the existing production mail transport. On submitted examinations, the candidate-provided email receives the recorded percentage; emails never include answers or credentials. Email failures are logged and do not roll back submitted examinations; delivery currently uses the platform's existing sender, not a new message queue.
- Keep Django cookies host-only, HttpOnly for sessions, Secure and SameSite=Lax. All three applications must use HTTPS under the same site. The frontends obtain the masked CSRF token from Django's JSON endpoint, so cross-subdomain JavaScript never needs access to the API's cookie.
- Run `process_examinations --watch` as a supervised backend process, or run it via a reliable one-minute scheduler. Monitor worker errors and API/DB health, synchronize server clocks, and configure backups, retention and recovery drills.
- Configure DNS and TLS for the exam hostname on the chosen host. Confirm the API is reachable, cookies work, permitted origins pass CSRF checks, and the HTTPS exam link is operational before announcing launch.

## Security and operational boundaries

- Student endpoints use explicit response allowlists: no answer keys, grading thresholds, explanations or question-bank snapshots are delivered. Even after submission, the student sees only their own released score/grade/pass status. Authorized staff review is a separate audited API. Question order is randomized server-side for every attempt; refreshing does not change an attempt's stored order.
- Attempt ownership and active status are checked on every answer, question, submission and result request. PostgreSQL uniqueness constraints and row locks serialize starts/submissions. An answer revision detects stale writes from multiple tabs. Same-answer retries and repeated submissions are idempotent.
- Submitted and expired attempts cannot receive answer updates through the API. Historical model rows are protected from deletion by foreign keys. Database operator access must still be tightly controlled; application authorization is not a substitute for securing privileged database credentials.
- Timers in the browser use monotonic elapsed time for display only. Django enforces the real expiry independently of browser clocks, hidden fields or submitted scores. Expiration grades only already-saved answers.
- Unsaved offline choices remain in memory and retry automatically. They are not persisted in local/session storage. Closing a tab before those choices are saved may lose them; a warning is shown. Saved answers survive refresh and reconnect. The timer never pauses for disconnection.
- This is not a proctoring or lockdown-browser system. Browser-reported question-view events are informational, not proof of attention or cheating. No invasive device fingerprint, webcam, audio recording or raw-IP examination log is collected.
- Exam pages use nonce-based CSP, anti-framing headers, no-referrer and no-store. APIs use no-store/private responses. Production API settings enforce secure cookies and HTTPS. Accounts have session expiry, CSRF protection, per-IP and per-identifier login throttles and existing password reset protections. Exam traffic is throttled per authenticated account so a shared examination venue does not share one IP quota.
- Grade policy, permitted administrator roles, question content, real-account workflows, expected peak load and a production security review require IoD approval before high-stakes use.

## Verification

```powershell
.\.venv\Scripts\python.exe backend/manage.py test apps.accounts apps.content apps.examinations --settings=config.settings.test --noinput
.\.venv\Scripts\python.exe backend/manage.py test apps.examinations --settings=config.settings.test_postgres --noinput
npm run build
npm run exam:build
```

PostgreSQL tests create a uniquely named isolated test database and destroy only that database. They cover real concurrent starts/submissions, not SQLite's lack of row locks. Browser sign-in, keyboard navigation, disconnect/reconnect, submission and cross-subdomain cookie behavior must also be exercised in the deployment environment before launch.
