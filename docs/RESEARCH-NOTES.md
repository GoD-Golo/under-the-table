# Foundation research notes

Research date: 2026-08-16. Primary sources were preferred because these libraries are changing rapidly.

## Colyseus

- Current line selected: 0.17.x.
- 0.17 migration guide replaces `colyseus.js` with `@colyseus/sdk` on the frontend and moves `@colyseus/schema` to 4.x.
- Official state docs define the server as the state owner; clients request mutations through messages and receive synchronized state patches.
- Official deployment docs support self-hosting behind an HTTP/WebSocket reverse proxy.

Sources:
- https://docs.colyseus.io/migrating/0.17
- https://docs.colyseus.io/state
- https://docs.colyseus.io/deployment
- https://docs.colyseus.io/getting-started/typescript

## SurrealDB

- Current stable selected: 3.2.3.
- JavaScript SDK selected: 2.0.8, documented compatible with SurrealDB through 3.2.3.
- Self-hosted single-node RocksDB is the conservative on-disk recommendation; SurrealKV remains beta.
- JS SDK 2 supports client-side atomic transactions.
- Schemafull tables can contain intentionally flexible object fields using `TYPE object FLEXIBLE`.

Sources:
- https://surrealdb.com/releases/3.2
- https://surrealdb.com/docs/build/deployment/self-hosted/docker
- https://surrealdb.com/docs/reference/javascript
- https://surrealdb.com/docs/reference/javascript/concepts/transactions
- https://surrealdb.com/docs/reference/query-language/statements/define/field

## HUD layout

React-Grid-Layout v2 is a TypeScript rewrite with draggable/resizable widgets and serializable layout data. New projects are recommended to use its v2 hooks API.

Source:
- https://github.com/react-grid-layout/react-grid-layout

## Known SDK type workaround

`@colyseus/sdk` 0.17.43 currently emits two generic constraint errors from its `HTTP.d.ts` when dependency declarations are checked, reproduced with both TypeScript 5.9.3 and 5.8.3. `apps/web/tsconfig.json` therefore sets `skipLibCheck: true` locally. Application source remains under `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; server/domain/protocol packages keep library declaration checking enabled. Remove the workaround when the upstream SDK declarations compile cleanly.

## SurrealDB namespace/database bootstrap

SurrealDB 3 creates `main/main` for convenience on a fresh instance. A custom database must exist before the SDK can select it, and `DEFINE DATABASE` requires a namespace selection first. Vertical Slice 001 therefore connects/authenticates at root scope, explicitly defines the configured namespace, selects it, defines the configured database as `STRICT`, selects the namespace/database pair, then applies the atomic table schema. Environment-provided names are restricted to simple identifiers before interpolation.

Sources:
- https://surrealdb.com/docs/reference/query-language/statements/define/namespace
- https://surrealdb.com/docs/reference/query-language/statements/define/database
- https://surrealdb.com/docs/reference/query-language/statements/use
