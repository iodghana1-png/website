# IoD-Gh backend — Phases 2A and 2B

This directory contains the Django and Django REST Framework foundation for the IoD-Gh platform. Phase 2A provides settings, PostgreSQL configuration, a versioned API, OpenAPI documentation, health checks, structured logs, and the foundational custom user model. Phase 2B adds session authentication, registration, email verification, password reset, staff profiles, role groups, rate limiting, and auditable authentication events. Phase 2C adds membership types, applications, confidential application tracking, staff review and decisions, member profiles and status history, renewals, and public good-standing verification.

It does not yet provide courses, examinations, payment collection or provider verification, notifications, production email/SMS providers, or storage integrations. The Next.js frontend connects the authentication flows, membership application, and member membership/profile portal to these endpoints.

## Local setup

1. Create and activate a Python virtual environment from the repository root.
2. Install dependencies:

   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r backend\requirements\base.txt
   ```

3. Copy `backend/.env.example` to `backend/.env` and use development-only values. The backend loads this local file automatically; it is ignored by Git.
4. Start PostgreSQL and pgAdmin:

   ```powershell
   docker compose -f backend\docker-compose.yml up -d
   ```

   pgAdmin is available at `http://localhost:5050`. Sign in with the
   `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD` values in
   `backend/.env`, then select **IoD-Gh PostgreSQL**. When prompted, use the
   PostgreSQL password configured for the `database` service.

5. Apply migrations and run the API:

   ```powershell
   .\.venv\Scripts\python.exe backend\manage.py migrate
   .\.venv\Scripts\python.exe backend\manage.py runserver
   ```

The health endpoint is available at `http://localhost:8010/api/v1/health/` when running the local API on port 8010. OpenAPI JSON is at `/api/schema/` and Swagger documentation at `/api/docs/`.

## Authentication API

Browser clients first request `GET /api/v1/auth/csrf/`, retain the CSRF cookie, then send its value in the `X-CSRFToken` header for state-changing requests.

- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/logout/`
- `GET /api/v1/auth/me/`
- `POST /api/v1/auth/email-verification/confirm/`
- `POST /api/v1/auth/email-verification/resend/`
- `POST /api/v1/auth/password-reset/`
- `POST /api/v1/auth/password-reset/confirm/`
- `POST /api/v1/auth/password-change/`

## Public document requests

- `POST /api/v1/document-requests/` — public, CSRF-protected submission for an admission letter or attestation. The request is retained for staff follow-up and sends a receipt to the client plus a reply-ready notification to `DOCUMENT_REQUEST_RECIPIENTS` (falling back to `CONTACT_ENQUIRY_RECIPIENTS`).

Without a configured SMTP host, development sends verification, password-reset, and membership messages to the console. Membership application receipt, approval, rejection, and renewal-created emails are sent by Django once SMTP is configured. This project is prepared for Resend: set `EMAIL_HOST=smtp.resend.com`, `EMAIL_PORT=587`, `EMAIL_HOST_USER=resend`, a Resend API key as `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS=true`, `EMAIL_USE_SSL=false`, and a verified IoD-Gh sender address in `backend/.env`. This repository does not contain provider credentials.

## Membership API

Membership policy is configuration and staff decision data—not application code. Staff create the available membership types and set their descriptions, eligibility wording, fees, currency, renewal period, and active state. No payment is captured in this phase.

- `GET /api/v1/membership/types/` — public active membership types
- `POST /api/v1/membership/types/` and `PATCH /api/v1/membership/types/{id}/` — Membership Officer only
- `POST /api/v1/membership/applications/` — multipart submission with applicant details and a PDF/DOC/DOCX CV; the applicant chooses new membership or an upgrade request, not a category
- `GET /api/v1/membership/applications/{reference}/` — applicant-owned session or the `X-Application-Access-Token` header required
- `GET/PATCH /api/v1/membership/members/me/` — authenticated member profile
- `GET /api/v1/membership/members/me/renewals/` — authenticated member renewal history
- `GET /api/v1/membership/members/verify/?member_number=...` — exact-number public verification only for an active, voluntarily publicly listed, non-expired member
- `GET /api/v1/membership/staff/applications/` — Membership Officer application queue
- `GET /api/v1/membership/staff/applications/{reference}/cv/` — Membership Officer-only CV download
- `POST /api/v1/membership/staff/applications/{reference}/review|approve|reject/` — Membership Officer decisions; approval assigns the membership type after committee review
- `GET /api/v1/membership/staff/members/` — Membership Officer member register
- `PATCH /api/v1/membership/staff/members/{membership_number}/status/` — Membership Officer status/listing changes
- `GET /api/v1/membership/staff/members/{membership_number}/status-history/` — Membership Officer status history
- `GET/POST /api/v1/membership/staff/members/{membership_number}/renewals/` — Membership Officer renewal management

State-changing browser requests require the CSRF cookie/header flow described above. Submitted application tracking tokens are stored only as SHA-256 hashes; the raw token is returned once, at submission. Public verification has no name search or directory endpoint. Membership receipt, approval, rejection, and renewal-created emails are sent directly in this stage; queued delivery, delivery tracking, SMS, and reminder scheduling remain notification-system work.

## Settings

- `config.settings.development` is the local default and expects PostgreSQL through `DATABASE_URL`.
- `config.settings.test` uses an in-memory SQLite database only for automated tests.
- `config.settings.production` requires an explicit `DJANGO_SECRET_KEY` and `DATABASE_URL`, and enables secure-cookie and HTTPS settings.

The Django admin is enabled in development only. It is a fallback for trusted staff and must be protected by production network and account controls before it is enabled there. The seeded role groups are Super Admin, Membership Officer, Training Officer, Finance, Content Manager, and Read Only; domain-specific endpoint enforcement will be added alongside each later module.

## Test commands

```powershell
$env:DJANGO_SETTINGS_MODULE = "config.settings.test"
.\.venv\Scripts\python.exe backend\manage.py test
```

## Important follow-up decisions

IoD-Gh must approve membership rules, which membership records may be publicly listed, retention periods, grading boundaries, pass marks, payment/refund rules, and production provider choices before their respective modules are implemented.
