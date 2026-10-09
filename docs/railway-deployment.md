# Railway deployment

This repository is prepared for three public Railway services from the same
GitHub repository. Railway service configuration is versioned with each app.
It is intentionally not linked to a Railway project and contains no secrets.

## Service map

| Railway service | Repository root | Config file | Public domain | Health check |
| --- | --- | --- | --- | --- |
| `website` | `/` | `/railway.json` | `iodghana.org` | `/api/health` |
| `examinations` | `/apps/exam-portal` | `/apps/exam-portal/railway.json` | `exam.iodghana.org` | `/api/health` |
| `api` | `/backend` | `/backend/railway.json` | `api.iodghana.org` | `/api/v1/health/` |

The API configuration installs Gunicorn, migrates the database as a Railway
pre-deploy command, binds to Railway's injected `PORT`, and only becomes live
after its health check succeeds. Do not expose PostgreSQL or ClamAV publicly.

## Create the Railway project

1. Create a new Railway project and connect
   `iodghana1-png/website` from GitHub.
2. Add a Railway PostgreSQL service named `Postgres`. Keep it private; do not
   create a public TCP proxy for it.
3. Add the three GitHub services in the table above. Set each service's root
   directory and, if Railway does not auto-detect it, its config path exactly as
   shown in the table.
4. Generate temporary Railway domains for `website`, `examinations`, and `api`.
   Add custom domains only after all health checks pass.
5. Add a private ClamAV service from the `clamav/clamav:1.4` image. Name it
   `upload-scanner`, do not give it a public domain, and allow enough memory for
   its virus database (the local reference configuration uses 4 GiB).
6. Add a private Railway Bucket named `cmsmedia` for CMS images and documents.
   The API, rather than the bucket, delivers published CMS assets to visitors.

Railway's public proxy supplies HTTPS and sets `X-Forwarded-Proto: https`. The
API uses that header only when `DJANGO_TRUST_PROXY_SSL_HEADER=true` is explicitly
set. Do not enable a TCP proxy on the API service.

## Variables

Set these values in Railway's **Production** environment. Replace the example
domains with the generated Railway domains first, then the final custom domains.

### `api`

```text
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=<new random value of at least 50 characters>
DATABASE_URL=${{Postgres.DATABASE_URL}}
CMS_PUBLIC_API_BASE_URL=https://<your-api>.up.railway.app
DJANGO_ALLOWED_HOSTS=api.iodghana.org,<api Railway domain>
CSRF_TRUSTED_ORIGINS=https://iodghana.org,https://exam.iodghana.org
CORS_ALLOWED_ORIGINS=https://iodghana.org,https://exam.iodghana.org
FRONTEND_BASE_URL=https://iodghana.org
EXAM_PORTAL_URL=https://exam.iodghana.org
DJANGO_TRUST_PROXY_SSL_HEADER=true
DJANGO_ENABLE_ADMIN=false
CLAMAV_HOST=upload-scanner.railway.internal
CLAMAV_PORT=3310
CMS_MEDIA_STORAGE=s3
CMS_MEDIA_S3_ENDPOINT=${{cmsmedia.ENDPOINT}}
CMS_MEDIA_S3_ACCESS_KEY_ID=${{cmsmedia.ACCESS_KEY_ID}}
CMS_MEDIA_S3_SECRET_ACCESS_KEY=${{cmsmedia.SECRET_ACCESS_KEY}}
CMS_MEDIA_S3_BUCKET_NAME=${{cmsmedia.BUCKET}}
CMS_MEDIA_S3_REGION=${{cmsmedia.REGION}}
DEFAULT_FROM_EMAIL=<verified IoD-Gh sender>
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=<production SMTP host>
EMAIL_PORT=587
EMAIL_HOST_USER=<SMTP user>
EMAIL_HOST_PASSWORD=<SMTP password or API key>
EMAIL_USE_TLS=true
EMAIL_USE_SSL=false
MEMBERSHIP_APPLICATION_RECIPIENTS=<IoD-Gh inbox>
CONTACT_ENQUIRY_RECIPIENTS=<IoD-Gh inbox>
```

Use the exact HTTPS origins, separated with commas and without trailing slashes.
When using a Railway Free, Trial, or Hobby plan, outbound SMTP is unavailable;
use an HTTPS transactional-email integration instead or upgrade before enabling
account emails.

### `website`

```text
NEXT_PUBLIC_API_BASE_URL=https://api.iodghana.org
NEXT_PUBLIC_EXAM_PORTAL_URL=https://exam.iodghana.org
```

### `examinations`

```text
NEXT_PUBLIC_API_BASE_URL=https://api.iodghana.org
NEXT_PUBLIC_MAIN_SITE_URL=https://iodghana.org
```

`NEXT_PUBLIC_*` values are compiled into the Next.js client bundle. Redeploy the
relevant frontend after changing one.

## CMS media storage

CMS uploads use the private `cmsmedia` Railway Bucket when
`CMS_MEDIA_STORAGE=s3` is set. The API stores files under generated paths and
serves a stable CMS-media URL, so the bucket credentials and raw object URLs
are never exposed in page content. CMS images therefore persist across API
deployments.

Keep the bucket private. The CMS client uses the media endpoint URL rather than
a bucket URL, keeping bucket credentials and storage topology out of page
content. Do not use a public Railway volume as a substitute for confidential
membership documents; their retention and storage policy remains a separate
production decision.

## Scheduled maintenance

Create a fourth, private Railway **Cron** service named `api-maintenance` from
the same repository with root `/backend`. Copy the API variables and use:

```text
python manage.py clear_expired_rate_limits
```

Schedule it once daily, for example `20 02 * * *` (UTC). It must exit after the
command completes.

## Release checklist

1. Confirm all three health endpoints return `200` over their Railway domains.
2. Run `python manage.py check --deploy --settings=config.settings.production`
   in the API service and review all output.
3. Test the full HTTPS flows: registration, email verification, sign-in,
   password reset, membership application, staff CMS login, and an examination
   attempt/resume.
4. Confirm a clean upload is accepted and the EICAR test file is rejected by
   ClamAV in a non-production test environment.
5. Configure database backups, restore testing, an external uptime monitor, and
   an authenticated error-log review process before accepting live users.
