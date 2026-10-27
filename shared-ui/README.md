# @vishnu/ui-component

Shared UI component library for Nexus frontend projects, built with React and TypeScript.

## Canonical API References

Use these as source of truth for public API usage:

- `docs/PUBLIC_API.md` (human-readable)
- `docs/PUBLIC_API.json` (machine-readable)

## Documentation

- [Getting Started](docs/user-guide/getting-started.md) - Installation, setup, and quick start guide
- [Components](docs/user-guide/components.md) - Component reference and usage examples
- [Development](docs/user-guide/development.md) - Development setup and project structure
- [Styling](docs/user-guide/styling.md) - Styling guide, theming, and customization
- [Utilities](docs/user-guide/utilities.md) - Utility and helper notes
- [Publishing](docs/user-guide/publishing.md) - Build, versioning, and publishing

## Installation

```bash
bun add @vishnu/ui-component
bun add react@^19.3.1 react-dom@^19.3.1 @tanstack/react-form@^1.33.5 tailwindcss@^4.3.3
```

`tailwindcss` is a required peer dependency: **Tailwind CSS v4.3.3 or newer
is required.** The library ships its token layer with v4's `@theme` directive,
which has no Tailwind v3 equivalent — v3 consumers get a peer-dependency
warning and cannot load the stylesheet correctly.

## Supported Entry Points

- `@vishnu/ui-component` — root barrel (curated: components, their prop types, and common hooks; the full helper surface is in the `utils` and `hooks` subpaths)
- `@vishnu/ui-component/styles.css` — global stylesheet
- Per-component subpaths (for tree-shaking):
  - `@vishnu/ui-component/accordion`
  - `@vishnu/ui-component/actionBar`
  - `@vishnu/ui-component/alert`
  - `@vishnu/ui-component/breadcrumb`
  - `@vishnu/ui-component/browserWarning`
  - `@vishnu/ui-component/button`
  - `@vishnu/ui-component/calendar`
  - `@vishnu/ui-component/chip`
  - `@vishnu/ui-component/clickOutside`
  - `@vishnu/ui-component/dataList`
  - `@vishnu/ui-component/dialog`
  - `@vishnu/ui-component/drawer`
  - `@vishnu/ui-component/emptyData`
  - `@vishnu/ui-component/emptyState`
  - `@vishnu/ui-component/form`
  - `@vishnu/ui-component/hooks`
  - `@vishnu/ui-component/input`
  - `@vishnu/ui-component/loadingAnimation`
  - `@vishnu/ui-component/menu`
  - `@vishnu/ui-component/message`
  - `@vishnu/ui-component/pagination`
  - `@vishnu/ui-component/popover`
  - `@vishnu/ui-component/progressBar`
  - `@vishnu/ui-component/qrCode`
  - `@vishnu/ui-component/rating`
  - `@vishnu/ui-component/richTextEditor`
  - `@vishnu/ui-component/slider`
  - `@vishnu/ui-component/stepper`
  - `@vishnu/ui-component/table`
  - `@vishnu/ui-component/tabs`
  - `@vishnu/ui-component/text`
  - `@vishnu/ui-component/timePicker`
  - `@vishnu/ui-component/tooltip`
  - `@vishnu/ui-component/userImageIcon`
  - `@vishnu/ui-component/utils`
  - `@vishnu/ui-component/wrapper`

## Quick Start

```tsx
import {Button, Input} from "@vishnu/ui-component";

function App() {
	return (
		<div>
			<Button variant="filled" color="primary">
				Click Me
			</Button>
			<Input label="Email" type="email" />
		</div>
	);
}
```

Load the stylesheet through your Tailwind-processed CSS entry — not a JS
import — so its `@theme` block registers the `--color-*` tokens:

```css
/* e.g. src/index.css (Vite/CRA) or globals.css (Next.js) */
@import "tailwindcss";
@import "@vishnu/ui-component/styles.css";
@source "../node_modules/@vishnu/ui-component";
```

`@source` makes Tailwind scan the package's emitted class strings; adjust
the relative path to your `node_modules`. See
[docs/user-guide/styling.md](docs/user-guide/styling.md) for details. The
stylesheet relies on v4's `@theme` directive, so Tailwind CSS v4.3.3+ is
required.

### Tree-Shaking with Per-Component Imports

For maximum tree-shaking, import from per-component subpaths instead of the root barrel:

```tsx
import {Button} from "@vishnu/ui-component/button";
import {Input, Select} from "@vishnu/ui-component/input";
```

## Theming (Color Tokens)

Components never hardcode palette names — they use semantic tokens
(`bg-primary-600`, `text-danger-600`, `bg-neutral-200`, …). Defaults ship as
Tailwind v4 `@theme` custom properties in `styles.css`, so the look is
unchanged out of the box and you can retheme the whole library by overriding
the variables (no component changes):

```css
/* your app's global stylesheet */
@theme {
	--color-primary-500: #7c3aed; /* retheme "primary" off the indigo default */
	--color-neutral-200: #d4d4d8; /* component borders consume neutral-* */
}
```

Token families: `primary`, `secondary`, `neutral`, `danger`, `success`,
`warning`, `info`, `pink` (each `50`–`950`), plus the role tokens `surface`,
`surface-alt`, `line`, `line-strong`, `ink`, `ink-2`, and `on-primary` — and
the bare `primary` alias of `primary-500` (used for focus borders). The role
tokens besides the `primary` alias are defined but not yet emitted by any
component, and `secondary` is likewise defined ahead of use (nothing emits
`secondary-*` yet) —
they exist for future theming; see `docs/user-guide/styling.md`.

For a one-off color, any component with a `color`/`severity` prop accepts
`"custom"` plus a `colorClassName` appended after the variant classes (only
guaranteed to take effect with `"custom"`, since a named color also emits its
variant classes):

```tsx
<Button color="custom" colorClassName="bg-fuchsia-600 text-white hover:bg-fuchsia-700">
	Custom
</Button>
```

`color="custom"` emits no text color — include one (e.g. `text-white`).

> **Tailwind CSS v4.3.3+ is required.** These tokens are declared with v4's
> `@theme` directive and the library provides no v3 fallback — a v3 project
> cannot load `styles.css` correctly. Upgrade to Tailwind v4.3.3 or newer to
> use this package.

## Public Exports

### Components / Values

- `ActionBar`
- `Alert`
- `AlertInline`
- `AlertToast`
- `Breadcrumb`
- `Button`
- `ButtonGroup`
- `BrowserNotSupportedDialog`
- `Calendar`
- `Caption`
- `Checkbox`
- `Chip`
- `CircularProgress`
- `ClickOutside`
- `ContentWrapper`
- `DataList`
- `DatePicker`
- `DateRangePicker`
- `DateTimeValidator`
- `Dialog`
- `Drawer`
- `FormList`
- `FormValidator`
- `Input`
- `LoadingAnimation`
- `LoadingSpinner`
- `MenuItem`
- `MenuLink`
- `Message`
- `MultipleSelect`
- `PageTitle`
- `PageWrapper`
- `Pagination`
- `Paragraph`
- `PasswordFormValidator`
- `PasswordInput`
- `Popover`
- `ProgressBar`
- `Radio`
- `Rating`
- `RichDescription`
- `SearchInput`
- `Select`
- `SegmentedControl`
- `Skeleton`
- `Subtitle`
- `Switch`
- `Table`
- `Tabs`
- `TextAreaInput`
- `TimePicker`
- `TimeTrackingValidator`
- `Title`
- `Tooltip`
- `UserImageIcon`
- `UserAvatarFallback`
- `Accordion`
- `EmptyData`
- `EmptyState`
- `QrCode`
- `Stepper`
- `Slider`
- `RichTextEditor`

### Utils

- `delay`
- `getStringHash`
- `decodeHtml`
- `getFullName`
- `pasteFromClipboard`
- `getLocaledDateTimeString`
- `stringComparisonFn`
- `numberComparisonFn`
- `dateComparisonFn`
- `downloadUrlViaDOM`
- `dataSourceFormatter`
- `EMPTY_RICH_TEXT_VALUE`
- `createEmptyRichTextValue`
- `serializeRichText`
- `deserializeRichText`
- `isRichTextEmpty`
- `serializeRichTextToHtml`

### Hooks

- `useDebounce`
- `useDebounceFunc`
- `useTimer`
- `useBrowserSupport`
- `useRichTextField`

### Types

- `SelectOption`
- `BreadcrumbItem`
- `BreadcrumbProps`
- `UserAvatarFallbackProps`
- `UserImageIconSize`
- `DataListDirection`
- `DataListItemProps`
- `DataListLabelProps`
- `DateTimeRules`
- `TimeTrackingRules`
- `FormRules`
- `FormRulesOptions`
- `PasswordRules`
- `TimerFormatter`
- `Language`
- `TranslationKey`
- `TranslationMap`
- `BrowserNotSupportedDialogProps`
- `MenuLinkProps`
- `SelectProps`
- `BrowserName`
- `BrowserInfo`
- `MinBrowserVersions`
- `AccordionProps`
- `EmptyDataProps`
- `EmptyStateProps`
- `QrCodeProps`
- `StepperProps`
- `StepperStep`
- `StepperOrientation`
- `StepStatus`
- `StepperSize`
- `SliderProps`
- `SliderInputProps`
- `SliderMarkProps`
- `RichTextEditorProps`
- `InputProps`
- `TextAreaInputProps`
- `RadioOption`
- `RadioProps`
- `SwitchProps`
- `MultipleSelectProps`
- `DatePickerProps`
- `DateRangePickerProps`
- `DateRangeType`
- `SegmentedControlOption`
- `SegmentedControlProps`
- `SegmentedControlSize`
- `TimePickerProps`
- `Tab`
- `TabsProps`
- `ButtonVariant`
- `ButtonColor`
- `ButtonSize`
- `ButtonProps`
- `ButtonGroupProps`
- `ChipProps`
- `ChipColorsType`
- `ChipSizeType`
- `ChipVariant`
- `RatingProps`
- `RatingSize`
- `RatingColor`
- `ProgressBarProps`
- `ProgressBarColor`
- `ProgressBarSize`
- `ProgressBarVariant`
- `CircularProgressProps`
- `CircularProgressColor`
- `CircularProgressVariant`
- `PageTitleProps`
- `AlertOverlayPosition`
- `AlertSeverity`
- `AlertInput`
- `AlertItem`

## License

[Specify your license here]
