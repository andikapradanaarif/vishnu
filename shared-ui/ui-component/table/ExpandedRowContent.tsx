import type { TableExpandRenderMode } from "./type";

interface ExpandedRowContentProps {
	isExpanded: boolean;
	colSpan: number;
	renderMode?: TableExpandRenderMode;
	children: React.ReactNode;
}

export const ExpandedRowContent = (props: ExpandedRowContentProps) => {
	const { isExpanded, colSpan, renderMode = "wrapped", children } = props;

	if (!isExpanded) return null;

	if (renderMode === "unwrapped") {
		return <>{children}</>;
	}

	return (
		<tr className="bg-primary-50/40 border-solid">
			<td
				colSpan={colSpan}
				className="border-solid border-b-[1px] border-b-neutral-400/65 overflow-hidden p-0"
			>
				<div className="shared-expanded-row-panel">{children}</div>
			</td>
		</tr>
	);
};
