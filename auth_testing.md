# Flavouria Auth Testing Playbook

Auth supports BOTH JWT email/password and Emergent Google OAuth session. All users share the
`users` collection keyed by a UUID `id` field.

## Admin
- Email: admin@flavouria.com / Password: Flavouria@2026 (role=admin)

## Creator demo accounts (password: Creator@2026)
- rahuls-kitchen@flavouria.com, nonna-lucia@flavouria.com, etc. (role=creator)

## API tests
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@flavouria.com","password":"Flavouria@2026"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
curl -b cookies.txt http://localhost:8001/api/admin/overview
```

## Notes
- Cookies are httpOnly, secure, samesite=none. Frontend uses axios withCredentials:true.
- Bearer token fallback: Authorization: Bearer <access_token or session_token>.
- get_current_user resolves JWT access token first, then Google session_token.
- Register creates role=user. Becoming a creator (POST /api/auth ... /creator/apply) upgrades role to creator.
