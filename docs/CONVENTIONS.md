# Development Conventions

## Naming

- Functions, variables, types and code comments: English
- UI copy: French
- camelCase for TypeScript identifiers
- Function parameters are prefixed with `p` (example: `pRatingA`, `pWinnerId`)
- Class members are prefixed with `m` when classes are used

## Architecture layers

1. `src/app` — routes, layouts, server actions entry points
2. `src/components` — presentation only
3. `src/domain` — business rules (Elo, match workflow, account status)
4. `src/lib` — infrastructure helpers (Supabase clients, env parsing)
5. `src/validation` — Zod schemas shared by UI and server

Sensitive mutations and Elo calculations must run on the server or in PostgreSQL, never only in the browser.

## Security

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Prefer Row Level Security + server-side authorization checks
- Do not trust client-provided match status transitions
