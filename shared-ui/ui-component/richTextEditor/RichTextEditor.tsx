import { Icon } from "@iconify/react";
import classNames from "classnames";
import {
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
	type KeyboardEvent,
	type MouseEvent,
} from "react";
import type { RenderElementProps, RenderLeafProps } from "slate-react";
import { Editor, Element as SlateElement, Transforms, createEditor, type Descendant } from "slate";
import { withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, useSlate, withReact } from "slate-react";
import Caption from "../text/Caption";
import { createEmptyRichTextValue } from "../../utils/richText";
import type { RichTextEditorProps } from "./type";

type TextFormat = "bold" | "italic" | "underline" | "strikethrough";
type BlockType = "bulleted-list" | "numbered-list" | "block-quote";

const FORMAT_ICONS: Record<TextFormat, string> = {
	bold: "material-symbols:format-bold",
	italic: "material-symbols:format-italic",
	underline: "material-symbols:format-underlined",
	strikethrough: "material-symbols:format-strikethrough",
};

const FORMAT_TITLES: Record<TextFormat, string> = {
	bold: "Bold",
	italic: "Italic",
	underline: "Underline",
	strikethrough: "Strikethrough",
};

const BLOCK_ICONS: Record<BlockType, string> = {
	"bulleted-list": "material-symbols:format-list-bulleted",
	"numbered-list": "material-symbols:format-list-numbered",
	"block-quote": "material-symbols:format-quote",
};

const BLOCK_TITLES: Record<BlockType, string> = {
	"bulleted-list": "Bulleted list",
	"numbered-list": "Numbered list",
	"block-quote": "Block quote",
};

const FORMATS: TextFormat[] = ["bold", "italic", "underline", "strikethrough"];
const BLOCKS: BlockType[] = ["bulleted-list", "numbered-list", "block-quote"];

type ListType = "bulleted-list" | "numbered-list";

function isListType(type: string | undefined): type is ListType {
	return type === "bulleted-list" || type === "numbered-list";
}

function normalizeInitialValue(value: Descendant[]): Descendant[] {
	const nodes = structuredClone(value) as Array<{
		type?: string;
		children?: Array<{ type?: string; children?: unknown[] }>;
	}>;
	const normalized: Array<Record<string, unknown>> = [];

	for (let index = 0; index < nodes.length; index += 1) {
		const node = nodes[index];
		if (!isListType(node.type)) {
			normalized.push(node);
			continue;
		}
		if (node.children?.some((child) => child.type === "list-item")) {
			normalized.push(node);
			continue;
		}

		const items: Array<Record<string, unknown>> = [];
		while (index < nodes.length && nodes[index].type === node.type) {
			const item = nodes[index];
			items.push({ type: "list-item", children: item.children ?? [{ text: "" }] });
			index += 1;
		}
		index -= 1;
		normalized.push({ type: node.type, children: items });
	}

	return normalized as unknown as Descendant[];
}

function isFormatActive(editor: Editor, format: TextFormat): boolean {
	const marks = Editor.marks(editor);
	return marks ? (marks as Record<string, unknown>)[format] === true : false;
}

function toggleFormat(editor: Editor, format: TextFormat) {
	const isActive = isFormatActive(editor, format);
	if (isActive) {
		Editor.removeMark(editor, format);
	} else {
		Editor.addMark(editor, format, true);
	}
}

export function isBlockActive(editor: Editor, blockType: BlockType): boolean {
	const { selection } = editor;
	if (!selection) return false;
	const [match] = Editor.nodes(editor, {
		at: selection,
		mode: "lowest",
		match: (n) => (n as { type?: string }).type === blockType,
	});
	return !!match;
}

export function toggleBlock(editor: Editor, blockType: BlockType) {
	const isActive = isBlockActive(editor, blockType);
	if (blockType === "block-quote") {
		Transforms.setNodes(
			editor,
			{ type: isActive ? "paragraph" : "block-quote" } as Partial<SlateElement>,
			{
				mode: "lowest",
				match: (n) => {
					if (!SlateElement.isElement(n)) return false;
					const type = (n as { type?: string }).type;
					return type === "paragraph" || type === "block-quote";
				},
			},
		);
		return;
	}

	if (isActive) {
		Transforms.setNodes(editor, { type: "paragraph" } as Partial<SlateElement>, {
			mode: "lowest",
			match: (n) => SlateElement.isElement(n) && (n as { type?: string }).type === "list-item",
		});
		Transforms.unwrapNodes(editor, {
			mode: "lowest",
			match: (n) => SlateElement.isElement(n) && isListType((n as { type?: string }).type),
		});
		return;
	}

	// If the cursor is inside a different list type, convert it in place.
	const [currentList] = Editor.nodes(editor, {
		at: editor.selection ?? undefined,
		mode: "lowest",
		match: (n) => SlateElement.isElement(n) && isListType((n as { type?: string }).type),
	});
	if (currentList) {
		const currentType = (currentList[0] as { type?: string }).type;
		if (currentType && currentType !== blockType) {
			Transforms.setNodes(editor, { type: blockType } as Partial<SlateElement>, {
				mode: "lowest",
				match: (n) => SlateElement.isElement(n) && isListType((n as { type?: string }).type),
			});
			return;
		}
		// Same list type already active but cursor not on a list-item (e.g. nested); unwrap.
		Transforms.unwrapNodes(editor, {
			mode: "lowest",
			match: (n) => SlateElement.isElement(n) && isListType((n as { type?: string }).type),
		});
		return;
	}

	Transforms.wrapNodes(editor, { type: blockType, children: [] } as SlateElement, {
		mode: "lowest",
		match: (n) => SlateElement.isElement(n) && (n as { type?: string }).type === "paragraph",
	});
	Transforms.setNodes(editor, { type: "list-item" } as Partial<SlateElement>, {
		mode: "lowest",
		match: (n) => SlateElement.isElement(n) && (n as { type?: string }).type === "paragraph",
	});
}

function ToolbarButton({
	format,
	icon,
	title,
	tabIndex,
}: {
	format: TextFormat;
	icon: string;
	title: string;
	tabIndex: number;
}) {
	const editor = useSlate();
	const isActive = isFormatActive(editor, format);

	const handleMouseDown = useCallback((event: MouseEvent) => {
		event.preventDefault();
	}, []);

	const handleClick = useCallback(() => {
		toggleFormat(editor, format);
	}, [editor, format]);

	return (
		<button
			type="button"
			tabIndex={tabIndex}
			aria-label={title}
			title={title}
			aria-pressed={isActive}
			onMouseDown={handleMouseDown}
			onClick={handleClick}
			className={classNames(
				"p-1.5 rounded transition-colors cursor-pointer",
				isActive ? "bg-primary-100 text-primary-700" : "text-neutral-600 hover:bg-neutral-100",
			)}
		>
			<Icon icon={icon} className="text-xl" />
		</button>
	);
}

function BlockButton({
	blockType,
	icon,
	title,
	tabIndex,
}: {
	blockType: BlockType;
	icon: string;
	title: string;
	tabIndex: number;
}) {
	const editor = useSlate();
	const isActive = isBlockActive(editor, blockType);

	const handleMouseDown = useCallback((event: MouseEvent) => {
		event.preventDefault();
	}, []);

	const handleClick = useCallback(() => {
		toggleBlock(editor, blockType);
	}, [editor, blockType]);

	return (
		<button
			type="button"
			tabIndex={tabIndex}
			aria-label={title}
			title={title}
			aria-pressed={isActive}
			onMouseDown={handleMouseDown}
			onClick={handleClick}
			className={classNames(
				"p-1.5 rounded transition-colors cursor-pointer",
				isActive ? "bg-primary-100 text-primary-700" : "text-neutral-600 hover:bg-neutral-100",
			)}
		>
			<Icon icon={icon} className="text-xl" />
		</button>
	);
}

const TOOLBAR_BUTTON_COUNT = FORMATS.length + BLOCKS.length;

function FormattingToolbar() {
	const toolbarRef = useRef<HTMLDivElement>(null);
	const [focusIndex, setFocusIndex] = useState(0);
	const hasUserNavigated = useRef(false);

	const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
		event.preventDefault();
		hasUserNavigated.current = true;
		const lastIndex = TOOLBAR_BUTTON_COUNT - 1;
		setFocusIndex((prev) => {
			if (event.key === "ArrowRight") return prev >= lastIndex ? 0 : prev + 1;
			return prev <= 0 ? lastIndex : prev - 1;
		});
	}, []);

	useEffect(() => {
		if (!hasUserNavigated.current) return;
		const buttons = toolbarRef.current?.querySelectorAll<HTMLButtonElement>("button");
		buttons?.[focusIndex]?.focus();
	}, [focusIndex]);

	return (
		<div
			ref={toolbarRef}
			role="toolbar"
			aria-label="Rich text formatting"
			onKeyDown={handleKeyDown}
			className="flex items-center gap-0.5 px-1.5 py-1 border-b border-neutral-200 bg-neutral-50"
		>
			{FORMATS.map((format, index) => (
				<ToolbarButton
					key={format}
					format={format}
					icon={FORMAT_ICONS[format]}
					title={FORMAT_TITLES[format]}
					tabIndex={index === focusIndex ? 0 : -1}
				/>
			))}
			<div className="w-px h-6 bg-neutral-300 mx-1" role="separator" aria-orientation="vertical" />
			{BLOCKS.map((blockType, index) => (
				<BlockButton
					key={blockType}
					blockType={blockType}
					icon={BLOCK_ICONS[blockType]}
					title={BLOCK_TITLES[blockType]}
					tabIndex={FORMATS.length + index === focusIndex ? 0 : -1}
				/>
			))}
		</div>
	);
}

export default function RichTextEditor({
	label,
	placeholder,
	name,
	initialValue,
	value,
	valueVersion,
	onChange,
	required,
	error,
	className,
	rows = 4,
	direction = "column",
}: RichTextEditorProps) {
	const resolvedInitialValue = value ?? initialValue ?? createEmptyRichTextValue();
	const [editor] = useState(() => withReact(withHistory(createEditor())));
	const instanceId = useId();
	const editorId = `${instanceId}-editor`;
	const labelId = `${instanceId}-editor-label`;
	const [editorInitialValue] = useState(() => normalizeInitialValue(resolvedInitialValue));
	const previousValueRef = useRef(resolvedInitialValue);
	const previousValueVersionRef = useRef(valueVersion);
	const minHeight = rows * 24;

	useEffect(() => {
		if (value === undefined) return;
		// If a valueVersion token is provided, use it for an O(1) reset check.
		if (valueVersion !== undefined) {
			if (valueVersion === previousValueVersionRef.current) return;
			previousValueVersionRef.current = valueVersion;
		} else if (JSON.stringify(value) === JSON.stringify(editor.children)) {
			// For consumers that do not pass a version token, fall back to a
			// content comparison so cloned values coming back from onChange do
			// not reset the editor on every keystroke.
			previousValueRef.current = value;
			return;
		} else if (value === previousValueRef.current) {
			return;
		}
		previousValueRef.current = value;
		editor.children = normalizeInitialValue(value);
		editor.selection = null;
		// Replace the editor without clearing the editor instance. Clear the
		// history stacks so undo/redo do not pull in old states, and reset marks.
		const editorWithHistory = editor as unknown as {
			history?: { undos: unknown[]; redos: unknown[] };
			marks?: Record<string, unknown> | null;
		};
		if (editorWithHistory.history) {
			editorWithHistory.history.undos = [];
			editorWithHistory.history.redos = [];
		}
		editorWithHistory.marks = null;
		editor.onChange();
	}, [value, valueVersion, editor]);

	const handleChange = useCallback(
		(newValue: Descendant[]) => {
			onChange(newValue);
		},
		[onChange],
	);

	const renderElement = useCallback((props: RenderElementProps) => {
		const { element, children, attributes } = props;
		switch ((element as { type?: string }).type) {
			case "paragraph":
				return (
					<p {...attributes} className="m-0 rte-paragraph">
						{children}
					</p>
				);
			case "bulleted-list":
				return (
					<ul {...attributes} className="m-0 ml-[24px] pl-[2px] list-disc rte-bulleted">
						{children}
					</ul>
				);
			case "numbered-list":
				return (
					<ol {...attributes} className="m-0 pl-2 list-decimal rte-numbered">
						{children}
					</ol>
				);
			case "list-item":
				return <li {...attributes}>{children}</li>;
			case "block-quote":
				return (
					<blockquote
						{...attributes}
						className="m-0 border-l-4 border-neutral-300 ml-3 pl-3 italic text-neutral-800 rte-block-quote"
					>
						{children}
					</blockquote>
				);
			default:
				return (
					<p {...attributes} className="m-0 rte-paragraph">
						{children}
					</p>
				);
		}
	}, []);

	const renderLeaf = useCallback((props: RenderLeafProps) => {
		const { leaf, children, attributes } = props;
		const l = leaf as unknown as Record<string, boolean>;
		let el = children;
		if (l.bold) el = <strong>{el}</strong>;
		if (l.italic) el = <em>{el}</em>;
		if (l.underline) el = <u>{el}</u>;
		if (l.strikethrough) el = <s>{el}</s>;
		return <span {...attributes}>{el}</span>;
	}, []);

	const handleLabelClick = useCallback(() => {
		ReactEditor.focus(editor);
	}, [editor]);

	return (
		<div className={classNames("flex", direction === "row" ? "flex-row gap-4" : "flex-col")}>
			{label && (
				<label
					id={labelId}
					onClick={handleLabelClick}
					className={classNames(
						"block text-neutral-700",
						direction === "row"
							? "flex items-center text-sm flex-shrink-0 w-32 h-9.5"
							: "text-xs mb-1",
					)}
				>
					{required && <span className="text-danger-500 mr-1">*</span>}
					{label}
				</label>
			)}
			<div className={direction === "row" ? "flex-1" : ""}>
				<Slate editor={editor} initialValue={editorInitialValue} onValueChange={handleChange}>
					<div
						className={classNames(
							"border border-neutral-400/65 rounded-md overflow-hidden focus-within:outline-none focus-within:shadow-none focus-within:border-[var(--color-primary)]",
							error && "border-danger-500",
						)}
					>
						<FormattingToolbar />
						<Editable
							id={editorId}
							renderElement={renderElement}
							renderLeaf={renderLeaf}
							placeholder={placeholder}
							aria-label={label ? undefined : (name ?? "Rich text editor")}
							aria-labelledby={label ? labelId : undefined}
							aria-required={required}
							aria-invalid={Boolean(error)}
							renderPlaceholder={({ children, attributes }) => {
								const firstBlock = editor.children[0] as { type?: string } | undefined;
								if (firstBlock && firstBlock.type !== "paragraph") return <></>;
								return (
									<span
										{...attributes}
										className="text-sm pointer-events-none select-none"
										style={{
											...(attributes.style as object),
											paddingTop: "0.5rem",
											opacity: 0.4,
											fontWeight: "normal",
											textDecoration: "none",
											fontStyle: "normal",
										}}
									>
										{children}
									</span>
								);
							}}
							className={classNames(
								"appearance-none block w-full px-3 py-2 placeholder-neutral-400 focus:outline-none text-sm text-neutral-800 overflow-y-auto overflow-x-hidden",
								className,
							)}
							style={{ minHeight: `${minHeight}px` }}
						/>
					</div>
				</Slate>
				{typeof error === "string" && error && (
					<Caption className="text-danger-500 mt-1">{error}</Caption>
				)}
			</div>
		</div>
	);
}
