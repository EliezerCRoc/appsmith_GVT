# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

This file covers `app/client/` — the Appsmith frontend. The full repo is a polyglot monorepo
(`app/server/` = Java/Spring Boot WebFlux, `app/client/packages/rts/` = Node/Express real-time
server, `deploy/` = Docker/Helm/Caddy). Architecture-wide notes live in `.cursor/rules/*.mdc` at
the repo root; the client-specific rules are in `.cursor/rules/frontend.mdc` and
`.cursor/rules/testing/`, `.cursor/rules/quality/`.

## Environment

- Node **v24.14.1** (`.nvmrc`), Yarn **3.5.1** (Yarn Berry, workspaces). Run `nvm use` / `fnm use` if versions mismatch.
- All commands below run from `app/client/` unless noted.
- Local dev serves at `https://dev.appsmith.com` (HTTPS + mkcert required, no `:3000` in the URL). See `contributions/ClientSetup.md` for one-time setup (mkcert certs in `docker/`, `/etc/hosts` entry, `.env` from `.env.example`).

## Common commands

| Task | Command |
|---|---|
| Install | `yarn install` |
| Start dev server | `yarn start` (needs nginx proxy running: `./start-https.sh https://release.app.appsmith.com` points the local UI at Appsmith's staging backend) |
| Production build | `yarn build` (wraps `./build.sh`) |
| Unit tests (watch) | `yarn test:jest` |
| Unit tests (full, with coverage) | `yarn test:unit` |
| **Single unit test file** | `yarn jest src/path/to/File.test.tsx` |
| **Single test by name** | `yarn jest src/path/to/File.test.tsx -t "describe/it text"` |
| Lint (ESLint, src + cypress) | `yarn lint` |
| Lint autofix | `npx eslint --fix --cache ./src` |
| Prettier check / fix | `yarn prettier` / `npx prettier --write ./src ./cypress` |
| Type check | `yarn check-types` (`tsc --noEmit`) |
| Cypress E2E (headless, one spec) | `yarn cypress run --browser chrome --headless --spec "cypress/e2e/.../foo.spec.ts"` |
| Playwright E2E | `yarn test:pw` (also `:smoke`, `:sanity`, `:regression`) |
| Scaffold a new widget | `yarn generate:widget` |
| Storybook (design system) | `yarn storybook` |

Husky pre-commit runs lint-staged (`.lintstagedrc.json`): Prettier + ESLint on staged files.

## Monorepo packages (`packages/`)

Workspace deps are referenced as `@appsmith/*` / `@design-system/*` / `@shared/*` (`workspace:^`).

| Package | Purpose |
|---|---|
| `design-system/` | Component libraries: `ads` (`@appsmith/ads`, current), `ads-old` (`@appsmith/ads-old`, Blueprint-based legacy), `wds`/`wds-headless`/`wds-theming` (widget design system), `widgets`/`widgets-old` |
| `ast/` (`@shared/ast`) | AST parsing/manipulation of JS binding expressions (acorn) |
| `dsl/` (`@shared/dsl`) | DSL schema + migration transformers for the app page JSON |
| `icons/` (`appsmith-icons`) | Icon library |
| `utils/` (`@appsmith/utils`) | Shared utilities |
| `rts/` | Real-time server (Node/Express) — not part of the React app |
| `eslint-plugin/` (`@appsmith/eslint-plugin`) | Custom lint rules |

## CE / EE code split (critical)

Community and Enterprise code coexist in one tree. Every feature has a `ce/` implementation and an
`ee/` counterpart under `src/` (and inside packages). In this (CE) checkout, most `ee/` files simply
re-export their `ce/` sibling:

```ts
// src/ee/reducers/index.tsx
export * from "ce/reducers";
```

Rules:
- **Always import from `ee/…`, never `ce/…`** — ESLint enforces this (`no-restricted-imports` blocks `**/ce/*`). The `ee/` path resolves to CE code here and to overridden logic in the EE build.
- When adding a feature, add it under `ce/` and make sure the matching `ee/` file re-exports (or extends) it.
- `ee/*` is aliased in `tsconfig.path.json`; other path aliases (`utils`, `components`, `sagas`, `actions`, `selectors`, `reducers`, `api`, `constants`, `assets`) come from `.babelrc` (babel-plugin-module-resolver) and `src` is on the module path.

## Application architecture

React 17 + Redux + Redux-Saga. Entry: `src/index.tsx` → `src/store.ts` → `src/ee/AppRouter.tsx`.

- **State**: Redux store built from `reducers/` (combined via `ce/reducers` → `ee/reducers`). All async work and side effects go through **sagas** (`src/sagas/`, `src/ce/sagas/`, `src/ee/sagas/`), not thunks. Actions in `src/actions/` + `src/ce/actions/`, memoized selectors in `src/selectors/` (reselect / proxy-memoize).
- **API layer**: `src/api/` + `src/ce/api/` — Axios-based service classes. Components/sagas call services; components never call Axios directly.
- **Widgets** (`src/widgets/`, ~80): each widget dir has a widget class (extends `BaseWidget`), a `*.tsx` component, and `*/widget/index.ts` config (property pane, default props, autocomplete metadata). `WidgetProvider/` + `WidgetQueryGenerators/` register and wire them.
- **Layout systems** (`src/layoutSystems/`): `fixedlayout` (classic drag-drop grid), `autolayout`, and `anvil` (newest). `CanvasFactory.tsx` selects the renderer.
- **Evaluation** (`src/workers/Evaluation/`): the "DataTree" — bindings like `{{ Widget.value }}` and JSObjects are evaluated in a **Web Worker** (`evaluation.worker.ts`). This dependency-graph evaluation engine (toposort, `evalTreeWithChanges.ts`) is central and performance-sensitive; it re-runs on every data/widget change. `src/workers/Tern/` powers autocomplete.
- **IDE** (`src/IDE/`): shared framework (tabs, panes, editor state) for the app editor surfaces; `src/pages/Editor/` holds the concrete editor UI, `src/pages/AppViewer/` the published-app runtime.
- **PluginActionEditor/**, `src/plugins/`: datasource/query (API, DB, JS) editing UI.
- **git/**, `git-artifact-helpers/`: in-app Git version control for applications.
- **Entities** (`src/entities/`): core domain models (DataTree, Action, JSCollection, AppTheme, etc.) shared between the main thread and workers.
- **Theming/branding**: `src/utils/BrandingUtils.ts`, `src/utils/hooks/useBrandingTheme.ts`, `packages/design-system/ads/src/__theme__/`.

## Testing conventions

- Unit tests are **colocated**: `Thing.test.ts(x)` next to `Thing.ts(x)`. Jest + React Testing Library (`@testing-library/react` v12, React 17). Config: `jest.config.js` (jsdom, `test/setup.ts`, CSS/SVG/asset mocks, `ts-jest` isolatedModules).
- Cypress specs: `cypress/e2e/**/*.spec.ts`. Playwright: `playwright/` — see `.cursor/rules/playwright.mdc` (strict Page Object Model: POMs never assert/sleep, import `test`/`expect` from custom `../../fixtures`).
- `knip.json` tracks unused exports/deps.

## Notable constraints

- Don't `import CodeMirror from "codemirror"` — use `getCodeMirrorNamespaceFromEditor/Doc()` (bundle size). Same policy for `lottie-web` (use `utils/lazyLottie`) and `sql-formatter`'s `format` (import a specific dialect). All enforced by ESLint.
- Two lodash entries (`lodash`, `lodash-es`); `underscore` is aliased to `lodash` in `.babelrc`.
- `moment` is present but legacy — prefer `date-fns` / `dayjs` for new code.
