# No cookie → gateway must reject before touching null-core
GET http://localhost:55550/api/transactions
HTTP 401
[Asserts]
jsonpath "$.error" == "Unauthorized"


# No cookie on POST
POST http://localhost:55550/api/transactions
Content-Type: application/json
{}
HTTP 401
[Asserts]
jsonpath "$.error" == "Unauthorized"


# Sign in to get a session for the authenticated proxy tests below
POST http://localhost:55550/api/auth/sign-in/email
Content-Type: application/json
{
  "email": "test@null.lab",
  "password": "hunter2hunter2"
}
HTTP 200
[Captures]
session_cookie: cookie "better-auth.session_token"


# Authenticated request reaches null-core (expects null-core running at NULL_CORE_URL)
GET http://localhost:55550/api/health
Cookie: better-auth.session_token={{session_cookie}}
HTTP *
[Asserts]
status >= 200
status < 600
