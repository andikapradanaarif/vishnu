import classNames from "classnames";
import {useEffect, useMemo, useRef} from "react";
import DOMPurify, {type Config} from "dompurify";

const HTML_TAG_REGEX = /<[a-z][\s\S]*>/i;

// Explicit allowlist — tighter than DOMPurify's default surface.
const SANITIZE_CONFIG: Config = {
	ALLOWED_TAGS: ["p", "b", "strong", "i", "em", "u", "s", "code", "ul", "ol", "li", "blockquote", "br", "a"],
	ALLOWED_ATTR: ["href", "target", "rel"],
};

interface RichDescriptionProps {
	text: string;
	className?: string;
}

export const RichDescription = (props: RichDescriptionProps) => {
	const {text, className} = props;

	const containerRef = useRef<HTMLDivElement>(null);
	const isHtml = HTML_TAG_REGEX.test(text);
	const sanitizedHtml = useMemo(() => (isHtml ? DOMPurify.sanitize(text, SANITIZE_CONFIG) : ""), [text, isHtml]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const links = container.querySelectorAll("a");
		links.forEach((link) => {
			link.setAttribute("target", "_blank");
			link.setAttribute("rel", "noopener noreferrer");
			link.classList.add("text-info-600", "hover:text-info-800", "underline", "underline-offset-2");
		});
	}, [sanitizedHtml]);

	if (isHtml) {
		return (
			<div
				ref={containerRef}
				className={classNames(
					"text-sm text-neutral-700 overflow-auto",
					"[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1",
					"[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1",
					"[&_li]:my-0.5",
					"[&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-neutral-800 [&_blockquote]:my-1",
					"[&_p]:my-1 [&_p]:min-h-5",
					className,
				)}
				dangerouslySetInnerHTML={{__html: sanitizedHtml}}
			/>
		);
	}

	const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

	return (
		<div className={classNames("flex flex-col gap-3 text-sm text-neutral-700 overflow-auto", className)}>
			{paragraphs.map((paragraph, index) => (
				<div key={index}>{paragraph.trim()}</div>
			))}
		</div>
	);
};
