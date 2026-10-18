# Getting Started

This guide will help you install, set up, and start using the @nexus/ui-component library in your project.

## Installation

### Install the Package

Install the library using Bun:

```bash
bun add @nexus/ui-component
```

### Install Peer Dependencies

The library requires the following peer dependencies to be installed in your project:

```bash
bun add react@^19.3.1 react-dom@^19.3.1 @tanstack/react-form@^1.33.5 tailwindcss@^4.3.3
```

Tailwind CSS v4.3.3 or newer is required — the library's token layer uses
v4's `@theme` directive and has no v3 equivalent.

## Setup

### 1. Import Global Styles

Load the global stylesheet through your Tailwind-processed CSS entry
(`src/index.css` for Vite/CRA, `globals.css` for Next.js) — a JS
`import ".../styles.css"` bypasses Tailwind on setups where only the entry
CSS is processed, leaving `@theme` unregistered and the library unstyled:

```css
@import "tailwindcss";
@import "@nexus/ui-component/styles.css";
@source "../node_modules/@nexus/ui-component";
```

`@source` makes Tailwind generate the classes the components emit; adjust
the relative path to your `node_modules`. Tailwind CSS v4.3.3+ is required
— see [styling.md](styling.md) for details.

### 2. TypeScript Configuration

Ensure your `tsconfig.json` is configured correctly for the library:

```json
{
	"compilerOptions": {
		"moduleResolution": "bundler",
		"esModuleInterop": true,
		"jsx": "react-jsx"
	}
}
```

### 3. Tailwind CSS Configuration

This library uses Tailwind CSS for styling, and **requires Tailwind CSS
v4.3.3 or newer**. If you don't have Tailwind CSS v4 set up in your project,
follow the [Tailwind CSS installation guide](https://tailwindcss.com/docs/installation).

v4 is configured in CSS rather than a `tailwind.config.js`. Point your CSS
entry at the library's stylesheet and source it (see step 1):

```css
@import "tailwindcss";
@import "@nexus/ui-component/styles.css";
@source "../node_modules/@nexus/ui-component";
```

No `tailwind.config.js` is needed — `@import` registers the `--color-*`
tokens and `@source` generates the classes the components emit.

## Quick Start Example

Here's a complete example of how to use the library in a React application:

```tsx
// src/App.tsx
import {Button, Input, Message} from "@nexus/ui-component";
import {useState} from "react";

function App() {
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState<{type: "info" | "success"; text: string} | null>(null);

	const handleSubmit = () => {
		if (!email) {
			setMessage({type: "info", text: "Please enter your email"});
			return;
		}

		setMessage({type: "success", text: "Form submitted successfully!"});
	};

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-md mx-auto">
				<h1 className="text-2xl font-bold mb-6 text-gray-800">Welcome to @nexus/ui-component</h1>

				<div className="bg-white p-6 rounded-lg shadow-md">
					<Input
						label="Email Address"
						type="email"
						placeholder="Enter your email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="mb-4"
						required
					/>

					<Button onClick={handleSubmit} variant="filled" color="primary" size="md" className="w-full">
						Submit
					</Button>
				</div>

				{message && (
					<div className="mt-4">
						<Message type={message.type}>{message.text}</Message>
					</div>
				)}
			</div>
		</div>
	);
}

export default App;
```

## Using in Different Project Types

### Vite Project

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // the Tailwind entry with the @import lines above

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
```

### Next.js Project

```tsx
// pages/_app.tsx or app/layout.tsx
import "./globals.css"; // the Tailwind entry with the @import lines above

export default function App({Component, pageProps}: AppProps) {
	return <Component {...pageProps} />;
}
```

### Create React App

```tsx
// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // the Tailwind entry with the @import lines above

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
```

## Tree-Shaking with Per-Component Imports

For maximum tree-shaking, import from per-component subpaths instead of the root barrel. This ensures your bundler only includes the code for the components you actually use:

```tsx
// Instead of: import {Button, Input} from "@nexus/ui-component";
import {Button} from "@nexus/ui-component/button";
import {Input, Select} from "@nexus/ui-component/input";
```

Available subpath entry points:

| Subpath                                | Exports                                                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `@nexus/ui-component/actionBar`        | `ActionBar`                                                                                                       |
| `@nexus/ui-component/button`           | `Button`                                                                                                          |
| `@nexus/ui-component/calendar`         | `Calendar`                                                                                                        |
| `@nexus/ui-component/chip`             | `Chip`                                                                                                            |
| `@nexus/ui-component/dataList`         | `DataList`, `DataListDirection`, `DataListItemProps`, `DataListLabelProps`                                                                                                        |
| `@nexus/ui-component/dialog`           | `Dialog`                                                                                                          |
| `@nexus/ui-component/drawer`           | `Drawer`                                                                                                          |
| `@nexus/ui-component/emptyData`        | `EmptyData`, `EmptyDataProps`                                                                                     |
| `@nexus/ui-component/emptyState`       | `EmptyData`, `EmptyState`, `EmptyDataProps`, `EmptyStateProps`                                    |
| `@nexus/ui-component/input`            | `Input`, `Select`, `TextAreaInput`, `Checkbox`, `SelectOption`, `SelectProps`, `InputProps`, `TextAreaInputProps` |
| `@nexus/ui-component/loadingAnimation` | `LoadingAnimation`                                                                                                |
| `@nexus/ui-component/message`          | `Message`                                                                                                         |
| `@nexus/ui-component/pagination`       | `Pagination`                                                                                                      |
| `@nexus/ui-component/popover`          | `Popover`                                                                                                         |
| `@nexus/ui-component/table`            | `Table`                                                                                                           |
| `@nexus/ui-component/tabs`             | `Tabs`, `Tab`, `TabsProps`                                                                                        |
| `@nexus/ui-component/text`             | `Title`, `Subtitle`, `Caption`, `Paragraph`                                                                       |
| `@nexus/ui-component/tooltip`          | `Tooltip`                                                                                                         |
| `@nexus/ui-component/hooks` | `TranslationProviderProps`, `TranslationProvider`, `BrowserName`, `BrowserInfo`, `MinBrowserVersions`, `DEFAULT_MIN_VERSIONS`, `detectBrowser`, `useBrowserSupport`, `useDebounce`, `useDebounceFunc`, `useRichTextField`, `useIsSmallerThanTablet`, `useIsSmallPhone`, `useSlicedPages`, `TimerFormatter`, `useTimer`, `Language`, `TranslationKey`, `TranslationMap` |
| `@nexus/ui-component/utils` | `filterTree`, `flatten`, `delay`, `isSameTime`, `intlFormatDate`, `intlFormatDateWithTime`, `shortWeekNames`, `monthsNames`, `getYearsUntilNow`, `listYears`, `getStartOfDay`, `getEndOfDay`, `getStartOfMonth`, `getEndOfMonth`, `getStartOfWeek`, `getEndOfWeek`, `getStartOfYear`, `getEndOfYear`, `getDateBeforeMonths`, `addDays`, `subDays`, `addWeeks`, `addMonths`, `addYears`, `getFormattedTimeString`, `getFormattedDateString`, `getDurationBetweenDates`, `mergeDateAndTime`, `formatDateToLocalizedString`, `pad`, `formatDuration`, `getDayDescription`, `getDurationMs`, `formatTime`, `formatDate`, `formatMonthYear`, `formatYear`, `formatDateRange`, `roundUpToNearestByMinutes`, `roundToNearestByMinutes`, `addHours`, `formatRelativeDate`, `downloadUrlViaDOM`, `validator`, `passwordValidator`, `startTimeValidator`, `endTimeValidator`, `EMPTY_RICH_TEXT_VALUE`, `createEmptyRichTextValue`, `serializeRichText`, `deserializeRichText`, `isRichTextEmpty`, `serializeRichTextToHtml`, `RipplePointer`, `createRipple`, `stringComparisonFn`, `dateComparisonFn`, `numberComparisonFn`, `getLanguage`, `setLanguage`, `getStringHash`, `decodeHtml`, `getFullName`, `pasteFromClipboard`, `dataSourceFormatter`, `getLocaledDateTimeString`, `translate`, `FormRules`, `FormRulesOptions`, `PasswordRules`, `DateTimeRules`, `TimeTrackingRules`, `Language`, `TranslationKey`, `TranslationMap` |

> The root barrel `@nexus/ui-component` remains the simplest way to import and is recommended for most use cases. Use subpath imports when bundle size is critical.

## Common Issues

### Styles Not Applying

If styles are not applying, ensure:

1. The stylesheet is loaded through your Tailwind-processed CSS entry (`@import "@nexus/ui-component/styles.css";` + `@source` — see step 1), not a JS import
2. Tailwind CSS is properly configured in your project
3. Your bundler is processing CSS files

### TypeScript Errors

If you encounter TypeScript errors:

1. Ensure peer dependencies are installed
2. Check your `tsconfig.json` has correct `moduleResolution` set to `"bundler"`
3. Restart your TypeScript server/IDE

### Import Errors

If you get import errors:

1. Verify the package is installed: `bun pm ls @nexus/ui-component`
2. Check your package.json for the correct version
3. Clear node_modules and reinstall: `rm -rf node_modules && bun install`

## Next Steps

- Learn about [Styling](styling.md) for customization options
- Check [Utilities & Hooks](utilities.md) for additional functionality
- Read [Development](development.md) if you want to contribute or modify the library
