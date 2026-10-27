# shared-ui Agent Rules

These rules apply to files under `shared-ui/`.

## Package Identity

- **Package name**: `@vishnu/ui-component`
- **Repository folder**: `shared-ui`

## Canonical Public API Sources

- `index.ts` — barrel exports (the single source of truth for what is public)
- `package.json#exports` — declared entrypoints

## Supported Entry Points

The following entrypoints are supported for consumers:

1. `@vishnu/ui-component` — main barrel (all exports)
2. `@vishnu/ui-component/styles.css` — global stylesheet
3. Per-component subpaths (e.g. `@vishnu/ui-component/button`, `@vishnu/ui-component/accordion`) — declared in `package.json#exports` and `scripts/build.sh`/`scripts/dev.sh`

## Import Policy

- Use `@vishnu/ui-component` for all JS/TS symbols.
- Use `@vishnu/ui-component/styles.css` for styles.
- Do not document or suggest undeclared subpath imports unless `package.json#exports` is intentionally updated.

## Common Commands

All commands run from the `shared-ui/` directory:

- `bun run build` — clean `dist/`, bundle with Bun, generate `.d.ts` via `tsc`.
- `bun run dev` — watch mode (rebuild on change).
- `bun run lint` — run `oxlint`.

## Tech Stack

- **React**: 19.2+ (peer dependency)
- **TypeScript**: 7.x, strict mode, `moduleResolution: "bundler"`, `jsx: "react-jsx"`
- **Bundler**: Bun (`scripts/build.sh`) — NOT Rolldown. Output: `dist/index.mjs` + `dist/index.d.ts`.
- **Linter**: `oxlint`
- **Styling**: Tailwind CSS + CSS variables (`styles.css` at package root)
- **Runtime deps**: `classnames`, `@iconify/react`, `dompurify`
- **Peer deps**: `react`, `react-dom`, `@tanstack/react-form`, `tailwindcss`

## Repository Layout

```
shared-ui/
├── index.ts              # Public barrel — THE source of truth for exports
├── styles.css            # Global styles (shipped as styles.css entrypoint)
├── package.json          # Package config + exports map
├── tsconfig.json         # Type-checking config
├── tsconfig.build.json   # Declaration emit config (used by build.sh)
├── scripts/              # build.sh, dev.sh
├── ui-component/         # All UI components (one dir per component, including wrapper/)
│                         #   tests colocate in ui-component/<component>/__tests__/
├── hooks/                # useScreenSize, useSlicedPages — tests in hooks/__tests__/
├── utils/                # array, date, form, ripple, storage, translation — tests in utils/__tests__/
├── types/                # Shared .d.ts type definitions — tests in types/__tests__/
├── constants/            # Shared constants (presenceStatus, storageKeys, etc.)
├── assets/               # Translations (en.json, id.json) + images
├── test/                 # Shared test setup (setup.ts) + cross-cutting tests only
└── docs/                 # PUBLIC_API.json/.md + user-guide/
```

## Component Conventions

Each component lives in `ui-component/<componentName>/` with this structure:

| File              | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `<Component>.tsx` | Main component implementation                            |
| `type.ts`         | Props interfaces and variant/size type aliases           |
| `index.css`       | Component-specific styles (optional, imported in `.tsx`) |
| `__tests__/`      | Component tests (`*.test.tsx`)                           |

### Naming

- **Components**: PascalCase (e.g., `Button`, `DataList`, `TextAreaInput`)
- **Props interfaces**: `<Component>Props` extending React HTML attributes where applicable
- **Variant types**: `<Component>Variant` (e.g., `"filled" | "outlined" | "text"`)
- **Size types**: `<Component>Size` (e.g., `"sm" | "md" | "lg"`)
- **Exports**: Some components use `export const` (named), others use `export default`. Check `index.ts` for the re-export style.

### Canonical Reference Files

When adding a new component, read these as exemplars:

| What                            | Reference file                                 |
| ------------------------------- | ---------------------------------------------- |
| Simple component (named export) | `ui-component/button/Button.tsx` + `type.ts`   |
| Component with default export   | `ui-component/input/Input.tsx`                 |
| Component with CSS              | `ui-component/dialog/Dialog.tsx` + `index.css` |
| Hook                            | `hooks/useScreenSize.ts`                       |

## Public API Documentation Sync

When `index.ts` or `package.json#exports` changes, update in the same change:

1. `docs/PUBLIC_API.json` — machine-readable manifest (add/remove entries, update counts and `generatedAt` date)
2. `docs/PUBLIC_API.md` — human-readable mirror (update tables and counts)
3. `README.md` — update the "Public Exports" section if components/types changed

Then run `bun run build` to verify.

## Preferred Skill

- `shared-ui-sync-api` — wraps the full sync workflow (code changes → doc updates → build verification)

## General Rules

- Keep changes localized to `shared-ui/`; do not touch `backend/` or `contract/`.
- Run `bun run build` before committing.
- Per-component subpath exports are declared in `package.json#exports` and wired in `scripts/build.sh` and `scripts/dev.sh`. Add new subpaths to all three files when adding a component.
- The repository contains internal components/hooks/utils not exported from `index.ts` — their existence in source does not make them public API.
