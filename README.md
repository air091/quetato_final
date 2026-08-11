# quetato_final

## Redis cache

Set `REDIS_URL` to enable caching for the public and per-community session
listing endpoints. The cache is optional: when it is unset or Redis is
unavailable, requests read from PostgreSQL normally.
`PUBLIC_SESSIONS_CACHE_TTL_SECONDS` controls the TTL and defaults to `60`
seconds. `COMMUNITIES_CACHE_TTL_SECONDS` controls the shared community listing
and community-detail TTL, also defaulting to `60` seconds.
