# Utilities & Hooks

This guide covers the publicly exported hooks and utility functions from `@nexus/ui-component`.

They are reachable through the `@nexus/ui-component/hooks` and `@nexus/ui-component/utils` subpaths. A subset is also re-exported from the root barrel.

## Table of Contents

- [Subpaths](#subpaths)
- [Translation Pattern](#translation-pattern)
- [Language Prop](#language-prop)
- [Supported Languages](#supported-languages)

---

## Subpaths

| Subpath                          | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nexus/ui-component/hooks`      | `useDebounce`, `useDebounceFunc`, `useTimer`, `TimerFormatter`, `useBrowserSupport`, `BrowserName`, `BrowserInfo`, `MinBrowserVersions`, `DEFAULT_MIN_VERSIONS`, `detectBrowser`, `useRichTextField`, `useIsSmallerThanTablet`, `useIsSmallPhone`, `useSlicedPages`, `TranslationProvider`, `TranslationProviderProps`, `Language`, `TranslationKey`, `TranslationMap`                                                                                                                                                   |
| `@nexus/ui-component/utils`      | `delay`, date and time helpers (`isSameTime`, `intlFormatDate`, `formatDate`, `addDays`, `getStartOfDay`, `formatDuration`, …), form validators (`validator`, `passwordValidator`, `startTimeValidator`, `endTimeValidator`), string helpers (`getStringHash`, `decodeHtml`, `getFullName`, `pasteFromClipboard`), sorting comparators, storage helpers (`getLanguage`, `setLanguage`), `translate`, `filterTree`, `flatten`, `downloadUrlViaDOM`, `dataSourceFormatter`, rich-text helpers, and the `FormRules`, `FormRulesOptions`, `PasswordRules`, `DateTimeRules`, `TimeTrackingRules`, `Language`, `TranslationKey`, `TranslationMap` types |
| `@nexus/ui-component/emptyState` | `EmptyData`, `EmptyState`, `EmptyDataProps`, `EmptyStateProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

```tsx
import {useDebounce, TranslationProvider} from "@nexus/ui-component/hooks";
import {formatDate, validator, type FormRules} from "@nexus/ui-component/utils";

const rules: FormRules[] = ["required", "minLength"];
```

---

## Translation Pattern

The library defaults to a **prop-based translation system**. Components that display translatable text accept a `language` prop and resolve labels internally via the `translate()` helper, so an app can localize per component with no setup.

For app-wide overrides there is also `TranslationProvider`, exported from `@nexus/ui-component/hooks`. On mount it merges extra strings into that language's global map and renders its children, so an app can layer its own copy on top of the bundled defaults. The override applies app-wide for the lifetime of the page — it is not scoped to the provider's subtree, is not removed when the provider unmounts, and already-mounted components only pick it up on their next render:

```tsx
import {TranslationProvider} from "@nexus/ui-component/hooks";

<TranslationProvider language="id" translations={{common_save: "Simpan"}}>
	<App />
</TranslationProvider>;
```

It is optional — components fall back to the default `"en"` (or the `language` prop you pass) when no provider is used.

### Import

Components are imported as usual; no separate translation import is needed:

```tsx
import {Pagination, Select, Calendar} from "@nexus/ui-component";
```

### How It Works

1. Each translatable component accepts an optional `language` prop (defaults to `"en"`).
2. The component resolves labels through `translate(language, key, fallback)`, also public via `@nexus/ui-component/utils`.
3. Translations are loaded from `assets/translations/{lang}.json` (flat key-value pairs).
4. If a key is missing, the fallback string is used.
5. `TranslationProvider` merges additional strings into the language's global map for the lifetime of the page (not scoped to its children, not removed on unmount).

### Example

```tsx
import {Pagination} from "@nexus/ui-component";

<Pagination
	total={100}
	currentPage={1}
	pageSize={10}
	onChangeCurrentPage={setPage}
	onChangePageSize={setPageSize}
	name="users"
	language="id"
/>;
```

---

## Language Prop

Components that support the `language` prop:

| Component               | Prop       | Default |
| ----------------------- | ---------- | ------- |
| `ActionBar`             | `language` | `"en"`  |
| `Calendar`              | `language` | `"en"`  |
| `DatePicker`            | `language` | `"en"`  |
| `DateRangePicker`       | `language` | `"en"`  |
| `FormValidator`         | `language` | `"en"`  |
| `MultipleSelect`        | `language` | `"en"`  |
| `Pagination`            | `language` | `"en"`  |
| `PasswordFormValidator` | `language` | `"en"`  |
| `DateTimeValidator`     | `language` | `"en"`  |
| `TimeTrackingValidator` | `language` | `"en"`  |
| `SearchInput`           | `language` | `"en"`  |
| `Select`                | `language` | `"en"`  |

---

## Supported Languages

- `"en"` — English (default)
- `"id"` — Indonesian

To add a new language, add a `{lang}.json` file to `assets/translations/` and register it in `assets/translations/index.ts`.
