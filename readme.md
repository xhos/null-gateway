# null-gateway

This gateway manages auth for the null financial tracker. All of the requests comming from null-web or null-mobile to null-core go thru this. Yes, this is yet another microservice.

## config

| variable | default | description |
|----------|---------|-------------|
| `BETTER_AUTH_SECRET` | | better-auth secret key (required) |
| `BETTER_AUTH_URL` | | public URL of this gateway (required) |
| `AUTH_DATABASE_URL` | | postgres connection string for auth tables (required) |
| `NULL_CORE_URL` | | internal URL of null-core backend (required) |
| `TRUSTED_ORIGINS` | | comma-separated allowed CORS origins (required) |
| `COOKIE_DOMAIN` | | parent domain for cross-subdomain cookies (e.g. `.example.com`) |
| `HOSTNAME` | `127.0.0.1` | bind address |
| `PORT` | `55550` | listen port |
| `LOG_LEVEL` | `info` | log level: debug, info, warn, error |
| `LOG_FORMAT` | `text` | log format: text or json. when json, logs are written to both stdout and `null-gateway.log` |
