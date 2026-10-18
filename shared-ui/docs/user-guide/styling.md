# Styling

This guide covers styling, theming, and customization options for @nexus/ui-component.

## Global Styles

Load the global stylesheet through your Tailwind-processed CSS entry — see
[Configuration](#configuration) for the full
`@import` + `@source` wiring. A JS `import ".../styles.css"` bypasses
Tailwind on setups where only the entry CSS is processed, leaving
`@theme` unregistered and the library unstyled.

The global styles include:

- Base CSS resets
- Utility classes
- Component-specific base styles
- Animation keyframes

## Tailwind CSS

This library uses Tailwind CSS for styling. **Tailwind CSS v4.3.3 or newer
is required** — the library's token layer uses v4's `@theme` directive and
has no v3 equivalent, so a v3 project cannot load `styles.css` correctly.
Ensure your project has Tailwind CSS v4.3.3+ configured.

### Installation

If you don't have Tailwind CSS installed, follow the [official installation guide](https://tailwindcss.com/docs/installation).

### Configuration

Load the library stylesheet through your Tailwind-processed CSS entry and
point `@source` at the installed package so every class the components emit
gets generated:

```css
@import "tailwindcss";
@import "@nexus/ui-component/styles.css";
@source "../node_modules/@nexus/ui-component";
```

- `@import` (not a bundler `import` in JS) is required so `styles.css`'s
  `@theme` block registers the `--color-*` tokens as Tailwind utilities.
- `@source` must cover the package — components emit class strings like
  `bg-primary-600`/`text-neutral-500` that Tailwind only generates for
  scanned sources. Adjust the relative path to your `node_modules`.

## Custom Styling

All components accept a `className` prop for custom styling:

```tsx
<Button className="custom-class">Custom Button</Button>
<Input className="border-red-500" />
<Message type="info" className="fixed top-4 right-4">Notification</Message>
```

### Combining Classes

Use the `classnames` package for conditional styling in your own components:

```tsx
import classNames from "classnames";

const MyComponent = ({isActive, variant}) => {
	return (
		<div className={classNames("base-class", isActive && "active-class", variant === "primary" && "primary-class")}>
			Content
		</div>
	);
};
```

## Color Tokens (Theming)

Components use semantic tokens (`bg-primary-600`, `text-danger-600`,
`border-neutral-200`, …) instead of hardcoded palette names. Defaults ship as
Tailwind v4 `@theme` custom properties in `styles.css`; override any variable
to retheme the library without touching component code:

```css
@theme {
	--color-primary-500: #7c3aed;
	--color-neutral-200: #d4d4d8; /* component borders consume neutral-* */
}
```

Token families: `primary`, `secondary`, `neutral`, `danger`, `success`,
`warning`, `info`, `pink` (each `50`–`950`). Note: `neutral` is also a stock
Tailwind family — the library ramp overrides `neutral-*` wherever its
stylesheet is loaded, so stock `neutral` can't be recovered under that name;
use a different ramp (`gray`, `zinc`, `slate`) for app markup. Role tokens: `primary` (alias of
`primary-500`, used for focus borders), `surface`, `surface-alt`, `line`,
`line-strong`, `ink`, `ink-2`, and `on-primary`.

> The role tokens are defined for future/dark-mode theming but **no component
> emits them yet** — component borders/text/surfaces currently use the
> `neutral-*` shades. Only `primary` (the `primary-500` alias) is consumed
> today, via focus borders. The `secondary` family is likewise defined ahead
> of use — no component emits `secondary-*` yet, so overriding it changes
> nothing today.

For a one-off color, components with a `color`/`severity` prop accept
`"custom"` plus a `colorClassName` appended after the variant classes (only
guaranteed to take effect with `"custom"`, since a named color also emits its
variant classes):

```tsx
<Button color="custom" colorClassName="bg-fuchsia-600 text-white hover:bg-fuchsia-700">
	Custom
</Button>
```

`color="custom"` emits no text color of its own — include one (e.g.
`text-white`) or the button inherits your app's text color.

> Tailwind CSS v4.3.3+ is required: these tokens are declared with v4's
> `@theme` directive and the library ships no v3 fallback.

## CSS Variables

The library ships one theming surface: the `--color-*` token layer declared in the `@theme` block of `styles.css` (`primary`, `secondary`, `neutral`, `danger`, `success`, `warning`, `info`, `pink` — each `50`–`950` — plus the role tokens `surface`, `surface-alt`, `line`, `line-strong`, `ink`, `ink-2`, `on-primary`, `primary`). Components reference these tokens in their Tailwind classes, so overriding a token rethemes every component that uses it.

### Overriding Variables

Override tokens in your own CSS, after the library's `styles.css` is loaded:

```css
/* src/styles/globals.css — the Tailwind-processed entry */
@import "tailwindcss";
@import "@nexus/ui-component/styles.css";
@source "../node_modules/@nexus/ui-component";

@theme {
	--color-primary-500: #8b5cf6;
	--color-primary-600: #7c3aed;
	--color-danger-500: #f43f5e;
}
```

Or with plain CSS specificity if you prefer not to use `@theme`:

```css
:root {
	--color-primary-500: #8b5cf6;
	--color-danger-500: #f43f5e;
}
```

Or for a specific theme scope:

```css
[data-theme="dark"] {
	--color-neutral-50: #1f2937;
	--color-neutral-900: #f9fafb;
	--color-surface: #111827;
	--color-ink: #f9fafb;
}
```

## Theming

### Light/Dark Mode

Implement dark mode by toggling a data attribute:

```tsx
// App.tsx
import {useEffect} from "react";

function App() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
	}, [isDark]);

	return <button onClick={() => setIsDark(!isDark)}>Toggle Theme</button>;
}
```

Define the dark theme by overriding the tokens:

```css
[data-theme="dark"] {
	--color-primary-500: #818cf8;
	--color-neutral-50: #1f2937;
	--color-neutral-100: #374151;
	--color-neutral-200: #4b5563;
	--color-neutral-800: #f3f4f6;
	--color-neutral-900: #ffffff;
	--color-surface: #111827;
	--color-ink: #f9fafb;
}
```

### Custom Themes

Create custom themes by scoping token overrides to a data attribute:

```css
[data-theme="ocean"] {
	--color-primary-500: #0ea5e9;
	--color-danger-500: #f43f5e;
}

[data-theme="forest"] {
	--color-primary-500: #22c55e;
	--color-danger-500: #ef4444;
}
```

## Component-Specific Styling

### Button Styling

Buttons use variant and color props for styling:

```tsx
// Primary filled button
<Button variant="filled" color="primary">Primary</Button>

// Custom styling
<Button className="bg-purple-500 hover:bg-purple-600 text-white">
  Custom
</Button>
```

### Input Styling

Inputs support error and success states:

```tsx
// Error state
<Input error="This field is required" />

// Success state
<Input success="Valid" />

// Custom border
<Input className="border-2 border-purple-500" />
```

### Message Styling

Messages support different types:

```tsx
<Message type="success">Success!</Message>
<Message type="error">Error!</Message>
<Message type="info">Information</Message>
```

## Responsive Design

Use Tailwind's responsive utilities with components:

```tsx
<Button className="w-full md:w-auto">
  Responsive Button
</Button>

<Input className="flex-col md:flex-row" direction="column md:row" />
```

## Animation

The library includes built-in animations:

### Loading Animation

```tsx
import {LoadingAnimation} from "@nexus/ui-component";

<LoadingAnimation />;
```

### Custom Animations

Add custom animations in your CSS:

```css
@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.my-component {
	animation: fadeIn 0.3s ease-in;
}
```

## Overriding Component Styles

### Using CSS Selectors

Override component styles with more specific selectors:

```css
/* Override all buttons */
.shared-button {
	border-radius: 8px;
}

/* Override specific button variant */
.shared-button[data-variant="filled"] {
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### Using Inline Styles

For dynamic styles, use inline styles:

```tsx
<Button
	style={{
		backgroundColor: customColor,
		padding: "12px 24px",
	}}
>
	Custom Style
</Button>
```

## Best Practices

### 1. Use CSS Variables for Theming

Prefer CSS variables over hard-coded values:

```css
/* Good */
.my-component {
	background-color: var(--color-primary-500);
}

/* Avoid */
.my-component {
	background-color: #4f46e5;
}
```

### 2. Use Tailwind Utilities

Leverage Tailwind's utility classes:

```tsx
// Good
<Button className="flex items-center gap-2 p-4 rounded-lg">Button</Button>

// Avoid custom CSS when possible
```

### 3. Keep Custom CSS Minimal

Only add custom CSS when Tailwind utilities aren't sufficient:

```tsx
// Use Tailwind when possible
<div className="flex items-center justify-center">

// Use custom CSS for complex animations
<div className="custom-animation">
```

### 4. Use Semantic Class Names

Use meaningful class names for custom styles:

```css
/* Good */
.user-profile-card {
	/* styles */
}

/* Avoid */
.card-1 {
	/* styles */
}
```

### 5. Test Responsive Designs

Test your custom styles across different screen sizes:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">{/* content */}</div>
```

## Troubleshooting

### Styles Not Applying

If styles are not applying:

1. Ensure the global styles are loaded through your Tailwind-processed CSS entry (`@import "@nexus/ui-component/styles.css";` + `@source` — see Configuration)
2. Check that Tailwind CSS is properly configured
3. Verify your bundler is processing CSS files
4. Clear your cache and rebuild

### CSS Variables Not Working

If CSS variables aren't working:

1. Ensure variables are defined in `:root` or a specific selector
2. Check for typos in variable names
3. Verify the variable is used with `var(--variable-name)`
4. Check specificity - more specific selectors override variables

### Conflicting Styles

If you have style conflicts:

1. Use more specific selectors
2. Use `!important` sparingly
3. Check the order of CSS imports
4. Use browser DevTools to inspect applied styles
