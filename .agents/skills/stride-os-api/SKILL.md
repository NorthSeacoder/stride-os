---
name: stride-os-api
description: Use when an agent needs to discover, authenticate against, or call the Stride OS external HTTP API from outside the repo. Covers the public OpenAPI contract, llm.txt discovery entrypoint, bearer token usage, and Stride-specific calling conventions for tasks, OKRs, reviews, and activity endpoints.
---

# Stride OS API

Use this skill when calling a deployed Stride OS instance over HTTP.

## Entry points

- `GET /llm.txt`: discovery entrypoint for general LLM agents
- `GET /api/openapi.json`: machine-readable API contract
- `GET /docs/api-external-access.md`: human-oriented guide and caveats

If these sources disagree, use this priority order:

1. Live API behavior
2. `openapi.json`
3. `docs/api-external-access.md`
4. Prior examples or cached prompts

## Authentication

Preferred for agents:

```http
Authorization: Bearer <api_key>
```

Supported but not preferred for external automation:

- session cookie after `POST /api/auth/login`

Recommended verification step before any mutating call:

1. Call `GET /api/v1/me`
2. Only continue if the identity matches the intended user

## Recommended workflow

1. Read `llm.txt` to discover the API entrypoints
2. Fetch `openapi.json`
3. Verify auth with `GET /api/v1/me`
4. Use the OpenAPI contract for request/response details
5. Fall back to `docs/api-external-access.md` only for Stride-specific usage notes

## Stride-specific conventions

- Prefer Bearer API keys for agents, scripts, cron jobs, and external automation
- Do not assume delete means hard delete; many destructive semantics are modeled as `archive`
- When creating tasks for inbox-style capture, pass an explicit `listId` if your workflow depends on a specific list
- Use `GET /api/v1/me` as the canary call for token validation
- Treat `POST /api/tokens` responses as one-time secret material; persist `plainToken` immediately

## Endpoint groups

- Identity: `/api/v1/me`
- Tasks: `/api/v1/tasks`, `/api/v1/tasks/{id}`, state transitions, smart-source helpers
- OKR: `/api/v1/okr/*`, `/api/v1/key-results/{id}/check-ins`
- Reviews: `/api/v1/reviews/*`
- Activity: `/api/v1/activity`
- Session/token management: `/api/auth/*`, `/api/tokens/*`
- Health: `/api/health`

## Guardrails

- Do not invent undocumented fields; read them from `openapi.json`
- Do not infer route prefixes from examples; use the published path exactly
- Before writing automation against a new Stride OS deployment, re-fetch `openapi.json` instead of relying on stale cached knowledge
