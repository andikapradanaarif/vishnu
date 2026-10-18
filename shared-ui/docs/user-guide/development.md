# Development

This guide covers development setup, adding new components, project structure, and contributing to the @nexus/ui-component library.

## Prerequisites

- Node.js (v18 or higher)
- Bun
- Git

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd shared-ts
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Start Development Mode

```bash
bun run dev
```

This will start Bun in watch mode, automatically rebuilding when you make changes.

## Available Scripts

| Script          | Description                           |
| --------------- | ------------------------------------- |
| `bun run dev`   | Start development build in watch mode |
| `bun run playground` | Serve the component playground at http://localhost:5173 (override with `PORT`) |
| `bun run build` | Build the library for production      |
| `bun run lint`  | Run linter (oxlint)                   |

## Project Structure

```
shared-ts/
├── ui-component/          # UI components
│   ├── actionBar/        # Action bar component
│   ├── alert/            # Alert/toast component
│   ├── button/           # Button component
│   ├── calendar/         # Calendar component
│   ├── chip/             # Chip/tag component
│   ├── clickOutside/     # Click outside detector
│   ├── dataList/         # Data list component
│   ├── dialog/           # Modal dialog
│   ├── drawer/           # Side drawer
│   ├── form/             # Form components
│   ├── input/            # Input components
│   ├── loadingAnimation/ # Loading animations
│   ├── menu/             # Menu component
│   ├── message/          # Message component
│   ├── pagination/       # Pagination
│   ├── popover/          # Popover component
│   ├── richDescription/  # Rich text description
│   ├── table/            # Table component
│   ├── tabs/             # Tabs component
│   ├── text/             # Typography (Title, Subtitle, Caption, Paragraph, PageTitle)
│   ├── tooltip/          # Tooltip component
│   ├── userImageIcon/    # User avatar/icon
│   └── wrapper/          # Wrapper components (ContentWrapper, PageWrapper)
├── assets/               # Static assets (translations, images)
├── constants/            # Shared constants
├── hooks/                # Custom React hooks
│   ├── useScreenSize.ts
│   └── useSlicedPages.ts
├── types/                # Shared TypeScript type definitions (.d.ts)
├── utils/                # Utility functions
│   ├── array.ts
│   ├── date.ts
│   ├── form.ts
│   ├── ripple.ts
│   ├── storage.ts
│   └── translation.ts
├── test/                 # Shared test setup (setup.ts) + cross-cutting tests;
│                         #   other tests colocate in <dir>/__tests__/ (e.g. ui-component/button/__tests__/)
├── playground/           # Dev-only component playground (bun run playground)
├── scripts/              # Build scripts (build.sh, dev.sh) + playground.ts
├── docs/                 # Documentation (PUBLIC_API.json/.md + user-guide/)
├── index.ts              # Main export file (public barrel)
├── styles.css            # Global styles
├── package.json          # Package configuration + exports map
├── tsconfig.json         # TypeScript configuration
└── tsconfig.build.json   # Declaration emit config (used by build.sh)
```

## Adding New Components

### Step 1: Create Component Directory

Create a new directory in `ui-component/` for your component:

```bash
mkdir -p ui-component/myComponent
```

### Step 2: Create Component Files

Create the following files in your component directory:

#### `MyComponent.tsx` (Main Component)

```tsx
import classNames from "classnames";
import type {MyComponentProps} from "./type";

export const MyComponent = ({children, className, variant = "default"}: MyComponentProps) => {
	return (
		<div className={classNames("base-styles", variant === "primary" && "primary-styles", className)}>{children}</div>
	);
};
```

#### `type.ts` (Type Definitions)

```tsx
export type MyComponentVariant = "default" | "primary" | "secondary";

export interface MyComponentProps {
	children?: React.ReactNode;
	className?: string;
	variant?: MyComponentVariant;
	// Add other props here
}
```

#### `index.ts` (Export File - Optional)

```tsx
export {MyComponent} from "./MyComponent";
export type {MyComponentProps, MyComponentVariant} from "./type";
```

### Step 3: Add Styles (Optional)

If your component needs custom CSS, create an `index.css` file:

```css
.my-component {
	/* your styles here */
}
```

Import the styles in your component:

```tsx
import "./index.css";
```

### Step 4: Export from Main Index

Add your component to the main `index.ts` file in the root directory:

```ts
// Add this line
export {MyComponent} from "./ui-component/myComponent/MyComponent";
```

### Step 5: Build and Test

Build the library to ensure everything compiles:

```bash
bun run build
```

### Step 6: Synchronize Public API Docs

When you add or remove an export from `index.ts`, update the canonical API docs in the same change:

1. `docs/PUBLIC_API.json` — add/remove the export entry, update `counts` and `generatedAt`
2. `docs/PUBLIC_API.md` — mirror the JSON (tables and counts)
3. `README.md` — update the "Public Exports" section
4. `docs/user-guide/components.md` — add usage examples

Alternatively, invoke the `shared-ts-sync-api` Devin skill which wraps this workflow.

## Component Best Practices

### 1. TypeScript

Always define proper TypeScript types in a `type.ts` file:

```tsx
// Good
export interface MyComponentProps {
	value: string;
	onChange: (value: string) => void;
}

// Bad - avoid any
export interface MyComponentProps {
	value: any;
}
```

### 2. ClassNames

Use the `classnames` package for conditional styling:

```tsx
import classNames from "classnames";

const className = classNames(
	"base-class",
	isActive && "active-class",
	variant === "primary" && "primary-class",
	customClassName,
);
```

### 3. Props

Extend appropriate React HTML attributes when applicable:

```tsx
// Good - extends HTML button attributes
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "filled" | "outlined";
}

// Bad - doesn't extend
export interface ButtonProps {
	onClick?: () => void;
	// manually adding all HTML attributes
}
```

### 4. Forward Ref

Use `forwardRef` for components that wrap HTML elements:

```tsx
import {forwardRef} from "react";

const MyComponent = forwardRef<HTMLDivElement, MyComponentProps>((props, ref) => {
	return <div ref={ref} {...props} />;
});

MyComponent.displayName = "MyComponent";
```

### 5. Accessibility

Include proper ARIA attributes and keyboard navigation:

```tsx
<button aria-label="Close dialog" aria-pressed={isPressed} onKeyDown={handleKeyDown}>
	Close
</button>
```

### 6. Variants

Use consistent naming for variants:

```tsx
// Good - consistent naming
export type Variant = "default" | "primary" | "secondary" | "danger";

// Bad - inconsistent naming
export type Variant = "normal" | "main" | "sub" | "error";
```

### 7. Sizes

Use consistent size naming when applicable:

```tsx
// Good
export type Size = "sm" | "md" | "lg";

// Bad
export type Size = "small" | "medium" | "large";
```

### 8. Default Props

Provide sensible defaults for optional props:

```tsx
export const MyComponent = ({variant = "default", size = "md", disabled = false}: MyComponentProps) => {
	// ...
};
```

## Adding New Hooks

### Step 1: Create Hook File

Create a new file in the `hooks/` directory:

```tsx
// hooks/useMyHook.ts
import {useState, useEffect} from "react";

export function useMyHook(initialValue: string) {
	const [value, setValue] = useState(initialValue);

	useEffect(() => {
		// side effects
	}, [value]);

	return {value, setValue};
}
```

### Step 2: Export from Index

Add the hook to the main `index.ts`:

```ts
export {useMyHook} from "./hooks/useMyHook";
```

## Adding New Utilities

### Step 1: Create Utility File

Create a new file in the `utils/` directory:

```ts
// utils/myUtility.ts
export function myUtility(input: string): string {
	return input.toUpperCase();
}
```

### Step 2: Export from Index

Add the utility to the main `index.ts`:

```ts
export {myUtility} from "./utils/myUtility";
```

## Testing Components

Add tests in a `__tests__/` folder next to the code they cover (e.g. `ui-component/button/__tests__/button.test.tsx`) and run them with `bun run test` — `bun:test` + `@testing-library/react` are already configured (`test/setup.ts` is preloaded via `bunfig.toml`).

You should also manually test your components:

1. Build the library: `bun run build`
2. Create a test project or use an existing one
3. Install the local version: `bun add ../shared-ts`
4. Test your component in various scenarios

## Code Style

- Use TypeScript for all new code
- Follow existing component structure
- Use `classnames` for conditional classes
- Add proper TypeScript types
- Document complex logic with comments
- Use meaningful variable and function names
- Keep functions small and focused

## Linting

Run the linter before committing:

```bash
bun run lint
```

Fix any linting errors before pushing your changes.

## Building

### Production Build

```bash
bun run build
```

This will:

1. Clean the `dist` directory
2. Build the library using Bun (scripts/build.sh)
3. Generate TypeScript declaration files

The output will be in the `dist/` directory:

- `dist/index.mjs` - Main ESM bundle
- `dist/index.d.ts` - TypeScript declarations

### Development Build

```bash
bun run dev
```

Starts Bun in watch mode for development.

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Check TypeScript errors in your component
2. Ensure all imports are correct
3. Verify peer dependencies are installed
4. Check `scripts/build.sh` for external dependencies

### Type Errors

If you encounter type errors:

1. Ensure all types are properly defined
2. Check that you're extending the correct React types
3. Verify imports from `type.ts` files
4. Run `tsc --noEmit` to check for type errors

### Import Errors

If you encounter import errors:

1. Verify the component is exported in `index.ts`
2. Check the file path is correct
3. Ensure the file has the correct extension (.tsx, .ts)
4. Restart your TypeScript server

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the component structure
4. Add tests if applicable
5. Ensure the build passes (`bun run build`)
6. Ensure linting passes (`bun run lint`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Commit Message Guidelines

Use clear and descriptive commit messages:

```
Add Button component with variants
Fix Input validation error
Update Alert to support auto-close
Refactor Table to use new API
```

### Pull Request Guidelines

- Describe what your PR does
- Include screenshots for UI changes
- Reference related issues
- Ensure all checks pass
- Request review from maintainers
