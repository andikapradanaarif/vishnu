import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Assistant text rendering — markdown without raw-HTML passthrough. */
export function Markdown({ children }: { children: string }) {
	return (
		<div className="md">
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
		</div>
	);
}
