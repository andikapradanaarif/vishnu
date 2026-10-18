# Components

List of all publicly exported components in `@nexus/ui-component`.

Only components exported from `index.ts` are documented here. Internal source files that are not exported are not public API.

## Core Components

- **ActionBar** — Action bar component for toolbar-like functionality
- **Button** — Customizable button with variants (filled, outlined, text), sizes, and loading states
- **ButtonGroup** — Grouped buttons with connected borders
- **Input** — Text input with label, error states, icons, and validation styling
- **PasswordInput** — Password input with show/hide toggle
- **Dialog** — Modal dialog component
- **Drawer** — Side drawer/off-canvas component
- **Popover** — Popover/tooltip positioning component
- **Tooltip** — Simple tooltip component
- **ClickOutside** — Wrapper that fires a callback when clicking outside its bounds

## Data Display

- **Table** — Data table with sorting and pagination
- **DataList** — List component for displaying data items
- **Pagination** — Pagination controls
- **Calendar** — Calendar date picker
- **Chip** — Chip/tag component
- **Tabs** — Tab navigation component
- **RichDescription** — Rich text display with HTML sanitization (DOMPurify)
- **Rating** — Star rating component with half-star precision, keyboard nav, and readOnly mode
- **MenuItem** — Menu item component for dropdown/menu lists
- **UserImageIcon** — User avatar/image icon component

## Form Components

- **Select** — Dropdown select component
- **Checkbox** — Checkbox input component
- **Switch** — Toggle switch component
- **Radio** — Radio button group component
- **TextAreaInput** — Text area input with auto-resize
- **DatePicker** — Date picker with calendar popover
- **DateRangePicker** — Date range picker with calendar popover
- **MultipleSelect** — Multi-value select with search and select-all
- **SearchInput** — Search input with clear button
- **SegmentedControl** — Segmented control for option selection
- **FormValidator** — Form field validation display (requires @tanstack/react-form)
- **PasswordFormValidator** — Password-specific validation display (requires @tanstack/react-form)
- **FormList** — Form list container for grouping form fields
- **DateTimeValidator** — Date/time cross-field validation display (requires @tanstack/react-form)
- **TimeTrackingValidator** — Time-tracking duration validation display (requires @tanstack/react-form)
- **TimePicker** — Time picker with hour/minute selection

## Feedback

- **Message** — Message display component
- **LoadingAnimation** — Loading dots animation
- **LoadingSpinner** — Loading spinner SVG
- **ProgressBar** — Linear progress bar with determinate/indeterminate variants, animated stripes (e.g. upload progress)
- **CircularProgress** — Circular/ring progress indicator with determinate/indeterminate variants and center label
- **Skeleton** — Skeleton loading placeholder
- **Alert** — Alert component for inline or overlay notifications
- **AlertInline** — Inline alert variant
- **AlertToast** — Toast alert variant with overlay positioning

## Typography

- **Title** — Title/heading component
- **Subtitle** — Subtitle component
- **Caption** — Caption text component
- **Paragraph** — Paragraph body text component
- **PageTitle** — Page-level title/heading component

## Layout

- **ContentWrapper** — Wrapper for standard content spacing/width
- **PageWrapper** — Wrapper for full page layout

## Component Examples

### Button

```tsx
import {Button} from "@nexus/ui-component";

<Button variant="filled" color="primary">Click Me</Button>
<Button variant="outlined" color="danger">Danger</Button>
<Button isLoading>Loading...</Button>
```

### ButtonGroup

```tsx
import {ButtonGroup} from "@nexus/ui-component";

<ButtonGroup
	items={[
		{children: "Left", variant: "outlined"},
		{children: "Center", variant: "outlined"},
		{children: "Right", variant: "outlined"},
	]}
/>;
```

### Input

```tsx
import {Input} from "@nexus/ui-component";

<Input label="Email" type="email" placeholder="Enter your email" />
<Input label="Password" type="password" error="Required" />
```

### PasswordInput

```tsx
import {PasswordInput} from "@nexus/ui-component";

<PasswordInput label="Password" name="password" value={pw} onChange={(e) => setPw(e.target.value)} />;
```

### Dialog

```tsx
import {Dialog} from "@nexus/ui-component";

<Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Confirm">
	<p>Are you sure?</p>
</Dialog>;
```

### Table

```tsx
import {Table} from "@nexus/ui-component";

<Table
	columns={[
		{key: "name", label: "Name"},
		{key: "email", label: "Email"},
	]}
	data={[{id: 1, name: "John", email: "john@example.com"}]}
/>;
```

### Pagination

```tsx
import {Pagination} from "@nexus/ui-component";

<Pagination currentPage={1} totalPages={10} onPageChange={setPage} />;
```

### Tabs

```tsx
import {Tabs} from "@nexus/ui-component";
import type {Tab} from "@nexus/ui-component";

<Tabs
	tabs={[
		{id: "1", label: "Tab 1", content: <div>Content 1</div>},
		{id: "2", label: "Tab 2", content: <div>Content 2</div>},
	]}
	activeTab={activeTab}
	onTabChange={setActiveTab}
/>;
```

### Calendar

```tsx
import {Calendar} from "@nexus/ui-component";

<Calendar value={date} onChange={setDate} />;
```

### Chip

```tsx
import {Chip} from "@nexus/ui-component";

<Chip>Tag</Chip>
<Chip value="tag-1" color="blue" variant="solid" onRemove={(value) => console.log(value)}>Dismissible</Chip>
```

### Drawer

```tsx
import {Drawer} from "@nexus/ui-component";

<Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} position="right">
	<nav>Content</nav>
</Drawer>;
```

### Popover

```tsx
import {Popover} from "@nexus/ui-component";

<Popover content={<div>Content</div>} position="top">
	<Button>Hover me</Button>
</Popover>;
```

### Tooltip

```tsx
import {Tooltip} from "@nexus/ui-component";

<Tooltip content="Help text" position="top">
	<Button>Hover me</Button>
</Tooltip>;
```

### Select

```tsx
import {Select} from "@nexus/ui-component";
import type {SelectOption} from "@nexus/ui-component";

const options: SelectOption[] = [
	{value: "1", label: "Option 1"},
	{value: "2", label: "Option 2"},
];

<Select options={options} value={selected} onChange={setSelected} />;
```

### Checkbox

```tsx
import {Checkbox} from "@nexus/ui-component";

<Checkbox label="Accept terms" checked={isChecked} onChange={setIsChecked} />;
```

### Switch

```tsx
import {Switch} from "@nexus/ui-component";

<Switch name="notifications" checked={enabled} onChange={setEnabled} label="Enable notifications" />;
```

### Radio

```tsx
import {Radio} from "@nexus/ui-component";
import type {RadioOption} from "@nexus/ui-component";

const options: RadioOption[] = [
	{value: "small", label: "Small"},
	{value: "medium", label: "Medium"},
	{value: "large", label: "Large"},
];

<Radio name="size" value={selected} options={options} onChange={setSelected} />;
```

### TextAreaInput

```tsx
import {TextAreaInput} from "@nexus/ui-component";

<TextAreaInput label="Description" placeholder="Enter description" />;
```

### DatePicker

```tsx
import {DatePicker} from "@nexus/ui-component";

<DatePicker name="birthday" value={date} onChange={setDate} language="en" />;
```

### DateRangePicker

```tsx
import {DateRangePicker} from "@nexus/ui-component";

<DateRangePicker
	name="range"
	startDate={start}
	endDate={end}
	onDateRangeChange={({startDate, endDate}) => {
		setStart(startDate);
		setEnd(endDate);
	}}
	language="en"
/>;
```

### MultipleSelect

```tsx
import {MultipleSelect} from "@nexus/ui-component";
import type {SelectOption} from "@nexus/ui-component";

const options: SelectOption[] = [
	{value: "1", label: "Tag 1"},
	{value: "2", label: "Tag 2"},
];

<MultipleSelect options={options} value={selected} onChange={setSelected} language="en" />;
```

### SearchInput

```tsx
import {SearchInput} from "@nexus/ui-component";

<SearchInput
	placeholder="Search..."
	value={query}
	onChange={(e) => setQuery(e.target.value)}
	onClear={() => setQuery("")}
/>;
```

### SegmentedControl

```tsx
import {SegmentedControl} from "@nexus/ui-component";

<SegmentedControl
	name="view"
	value="week"
	options={[
		{value: "day", label: "Day"},
		{value: "week", label: "Week"},
		{value: "month", label: "Month"},
	]}
	onChange={(v) => setView(v)}
/>;
```

### RichDescription

```tsx
import {RichDescription} from "@nexus/ui-component";

<RichDescription text="<p>Hello <a href='example.com'>world</a></p>" />;
```

Plain text renders as paragraphs split on blank lines. When `text` contains HTML it is sanitized
through DOMPurify with an explicit allowlist — `p`, `b`, `strong`, `i`, `em`, `u`, `s`, `code`,
`ul`, `ol`, `li`, `blockquote`, `br`, `a` (with `href`/`target`/`rel` only) — and anything else is
stripped while keeping its text content.

### Message

```tsx
import {Message} from "@nexus/ui-component";

<Message type="info">Information</Message>
<Message type="success">Success</Message>
```

### LoadingAnimation

```tsx
import {LoadingAnimation} from "@nexus/ui-component";

<LoadingAnimation />
<LoadingAnimation size="lg" />
```

### LoadingSpinner

```tsx
import {LoadingSpinner} from "@nexus/ui-component";

<LoadingSpinner size={24} />;
```

### Title, Subtitle, Caption, Paragraph

```tsx
import {Title, Subtitle, Caption, Paragraph} from "@nexus/ui-component";

<Title level={1}>Heading 1</Title>
<Subtitle>Subtitle text</Subtitle>
<Caption>Caption text</Caption>
<Paragraph>Body paragraph text</Paragraph>
```

### Rating

```tsx
import {Rating} from "@nexus/ui-component";
import {useState} from "react";

function App() {
	const [value, setValue] = useState(3.5);
	return <Rating value={value} max={5} step={0.5} size="md" color="warning" showValue onChange={setValue} />;
}

// Read-only display
<Rating value={4} readOnly showValue />;
```

### ProgressBar

```tsx
import {ProgressBar} from "@nexus/ui-component";

// Determinate (e.g. upload progress)
<ProgressBar value={65} showLabel color="primary" animated />

// Indeterminate (unknown duration)
<ProgressBar variant="indeterminate" color="primary" />

// Striped + animated stripes (upload feel)
<ProgressBar value={40} stripedAnimated color="success" showLabel />
```

### CircularProgress

```tsx
import {CircularProgress} from "@nexus/ui-component";

// Determinate with center label
<CircularProgress value={72} size={48} thickness={4} showLabel color="primary" />

// Indeterminate spinner
<CircularProgress variant="indeterminate" size={40} color="primary" />
```

## Quick Reference

| Component             | Import                                                      | Usage                   |
| --------------------- | ----------------------------------------------------------- | ----------------------- |
| ActionBar             | `import {ActionBar} from "@nexus/ui-component"`             | Toolbar actions         |
| Alert                 | `import {Alert} from "@nexus/ui-component"`                 | Alert notifications     |
| AlertInline           | `import {AlertInline} from "@nexus/ui-component"`           | Inline alerts           |
| AlertToast            | `import {AlertToast} from "@nexus/ui-component"`            | Toast alerts            |
| Button                | `import {Button} from "@nexus/ui-component"`                | Buttons with variants   |
| ButtonGroup           | `import {ButtonGroup} from "@nexus/ui-component"`           | Grouped buttons         |
| Calendar              | `import {Calendar} from "@nexus/ui-component"`              | Calendar date picker    |
| Caption               | `import {Caption} from "@nexus/ui-component"`               | Caption text            |
| Checkbox              | `import {Checkbox} from "@nexus/ui-component"`              | Checkbox input          |
| Chip                  | `import {Chip} from "@nexus/ui-component"`                  | Tags/labels             |
| CircularProgress      | `import {CircularProgress} from "@nexus/ui-component"`      | Circular progress       |
| ClickOutside          | `import {ClickOutside} from "@nexus/ui-component"`          | Click-outside detection |
| ContentWrapper        | `import {ContentWrapper} from "@nexus/ui-component"`        | Content layout wrapper  |
| DataList              | `import {DataList} from "@nexus/ui-component"`              | Data list display       |
| DatePicker            | `import {DatePicker} from "@nexus/ui-component"`            | Date picker             |
| DateRangePicker       | `import {DateRangePicker} from "@nexus/ui-component"`       | Date range picker       |
| DateTimeValidator     | `import {DateTimeValidator} from "@nexus/ui-component"`     | Date/time validation    |
| Dialog                | `import {Dialog} from "@nexus/ui-component"`                | Modal dialogs           |
| Drawer                | `import {Drawer} from "@nexus/ui-component"`                | Side panels             |
| FormList              | `import {FormList} from "@nexus/ui-component"`              | Form field grouping     |
| FormValidator         | `import {FormValidator} from "@nexus/ui-component"`         | Form validation display |
| Input                 | `import {Input} from "@nexus/ui-component"`                 | Form inputs             |
| LoadingAnimation      | `import {LoadingAnimation} from "@nexus/ui-component"`      | Loading dots            |
| LoadingSpinner        | `import {LoadingSpinner} from "@nexus/ui-component"`        | Loading spinner         |
| MenuItem              | `import {MenuItem} from "@nexus/ui-component"`              | Menu items              |
| Message               | `import {Message} from "@nexus/ui-component"`               | Message display         |
| MultipleSelect        | `import {MultipleSelect} from "@nexus/ui-component"`        | Multi-value select      |
| PageTitle             | `import {PageTitle} from "@nexus/ui-component"`             | Page-level title        |
| PageWrapper           | `import {PageWrapper} from "@nexus/ui-component"`           | Page layout wrapper     |
| Pagination            | `import {Pagination} from "@nexus/ui-component"`            | Pagination              |
| Paragraph             | `import {Paragraph} from "@nexus/ui-component"`             | Body text               |
| PasswordFormValidator | `import {PasswordFormValidator} from "@nexus/ui-component"` | Password validation     |
| PasswordInput         | `import {PasswordInput} from "@nexus/ui-component"`         | Password input          |
| Popover               | `import {Popover} from "@nexus/ui-component"`               | Popover positioning     |
| ProgressBar           | `import {ProgressBar} from "@nexus/ui-component"`           | Linear progress bar     |
| Radio                 | `import {Radio} from "@nexus/ui-component"`                 | Radio button group      |
| Rating                | `import {Rating} from "@nexus/ui-component"`                | Star rating             |
| RichDescription       | `import {RichDescription} from "@nexus/ui-component"`       | Rich text display       |
| SearchInput           | `import {SearchInput} from "@nexus/ui-component"`           | Search input            |
| Select                | `import {Select} from "@nexus/ui-component"`                | Dropdown select         |
| SegmentedControl      | `import {SegmentedControl} from "@nexus/ui-component"`      | Segmented control       |
| Skeleton              | `import {Skeleton} from "@nexus/ui-component"`              | Skeleton placeholder    |
| Subtitle              | `import {Subtitle} from "@nexus/ui-component"`              | Subtitle text           |
| Switch                | `import {Switch} from "@nexus/ui-component"`                | Toggle switch           |
| Table                 | `import {Table} from "@nexus/ui-component"`                 | Data tables             |
| Tabs                  | `import {Tabs} from "@nexus/ui-component"`                  | Tab navigation          |
| TextAreaInput         | `import {TextAreaInput} from "@nexus/ui-component"`         | Text area input         |
| TimePicker            | `import {TimePicker} from "@nexus/ui-component"`            | Time picker             |
| TimeTrackingValidator | `import {TimeTrackingValidator} from "@nexus/ui-component"` | Time-tracking validation|
| Title                 | `import {Title} from "@nexus/ui-component"`                 | Title/heading           |
| Tooltip               | `import {Tooltip} from "@nexus/ui-component"`               | Tooltips                |
| UserImageIcon         | `import {UserImageIcon} from "@nexus/ui-component"`         | User avatar icon        |
