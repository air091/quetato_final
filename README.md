# quetato_final

## Redis cache

Set `REDIS_URL` to enable caching for `GET /api/communities/sessions/public`.
The cache is optional: when it is unset or Redis is unavailable, requests read
from PostgreSQL normally. `PUBLIC_SESSIONS_CACHE_TTL_SECONDS` controls the TTL
and defaults to `60` seconds.
