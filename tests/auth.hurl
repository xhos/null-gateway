# Sign up a new user
POST http://localhost:55550/api/auth/sign-up/email
Content-Type: application/json
{
  "email": "test@null.lab",
  "password": "hunter2hunter2",
  "name": "Test User"
}
HTTP 200


# Sign in and capture the session cookie
POST http://localhost:55550/api/auth/sign-in/email
Content-Type: application/json
{
  "email": "test@null.lab",
  "password": "hunter2hunter2"
}
HTTP 200
[Captures]
session_cookie: cookie "better-auth.session_token"
[Asserts]
jsonpath "$.user.email" == "test@null.lab"
cookie "better-auth.session_token" exists
cookie "better-auth.session_token[HttpOnly]" exists


# JWKS endpoint must return valid structure for null-core to validate JWTs
GET http://localhost:55550/api/auth/jwks
HTTP 200
[Asserts]
header "Content-Type" contains "application/json"
jsonpath "$.keys" isCollection
jsonpath "$.keys[0].kty" exists
jsonpath "$.keys[0].kid" exists


# Session should be retrievable after sign-in
GET http://localhost:55550/api/auth/get-session
Cookie: better-auth.session_token={{session_cookie}}
HTTP 200
[Asserts]
jsonpath "$.user.email" == "test@null.lab"
jsonpath "$.session" exists
