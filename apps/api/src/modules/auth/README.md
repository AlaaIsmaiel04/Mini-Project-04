# Authentication — Mustafa

POST `/api/auth/login`: normalized email, bcrypt verification, HS256 JWT valid for one hour. GET `/api/auth/me`: reloads the current account through JwtAuthGuard. Responses allowlist id/email/role/pharmacyId; passwords and hashes are never returned. Global AuthModule exports the shared guards and JwtModule. Requires a random JWT_SECRET of at least 32 characters.

See [implementation and guard handoff](../../../../../docs/MUSTAFA-IMPLEMENTATION.md).
