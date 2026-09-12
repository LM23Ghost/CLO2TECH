# Cloud2Tech API Architecture

## Conventions

- JSON APIs are versioned under `/api/v1`.
- Authentication will use OIDC with Microsoft Entra ID for staff/admin flows and email-based identity for customer/citizen flows.
- IDs are opaque strings. Timestamps are ISO 8601 UTC.
- APIs return `{ data, error, meta }` envelopes as the persistence and auth layers are introduced.
- File uploads use object storage URLs, never database blobs.

## SME Cloud Hub

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Service health check |
| POST | `/api/v1/auth/signup` | Create an SME account |
| GET | `/api/v1/billing/subscriptions` | List customer subscriptions |
| POST | `/api/v1/billing/checkout` | Start monthly or annual checkout |
| GET | `/api/v1/support/tickets` | List support tickets |
| POST | `/api/v1/support/tickets` | Open a support ticket |
| GET | `/api/v1/onboarding/status` | Read Microsoft 365 and backup setup status |
| POST | `/api/v1/onboarding/start` | Start guided onboarding |

## School Digital Inclusion Platform

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Service health check |
| GET | `/api/v1/inventory/devices` | List donated/refurbished devices |
| POST | `/api/v1/inventory/devices` | Register a device |
| GET | `/api/v1/edu365/tenants` | List education tenants |
| POST | `/api/v1/edu365/setup` | Queue Microsoft 365 Education setup |
| GET | `/api/v1/device-management/policies` | List baseline policies |
| POST | `/api/v1/device-management/sync` | Queue an Intune synchronization |
| GET | `/api/v1/training/modules` | List teacher and learner modules |

## Municipal Service Dashboard

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Service health check |
| POST | `/api/v1/citizen/reports` | Submit a geotagged service report |
| GET | `/api/v1/dashboard/summary` | Read SLA and status summary |
| GET | `/api/v1/dashboard/heatmap` | Read map aggregation data |
| POST | `/api/v1/workflow/route` | Route a report to a department |
| GET | `/api/v1/reporting/transparency` | Generate transparency metrics |
| GET | `/api/v1/municipality/research` | Read aggregate research data, area/category breakdowns, and report register |
| POST | `/api/v1/municipality/notifications/broadcast` | Queue an email notification for all registered residents |

Municipal report records include `loggedAt` (ISO 8601 UTC). Open reports expose elapsed time from `loggedAt`; resolved reports include `resolvedHours`. Broadcasts currently enter an in-memory queue and return the recipient count. Connect the queue to Azure Communication Services, SendGrid, or another SMTP provider for production delivery.
