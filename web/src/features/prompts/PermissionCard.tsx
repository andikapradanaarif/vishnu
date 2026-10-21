import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@vishnu/ui-component/button";
import { useGrantPermission } from "@/hooks/queries";
import type { PermissionRequest } from "@vishnu/api-contract";
import { clamp, prettyJson } from "@/utils/format";

interface PermissionCardProps {
	wid: string;
	request: PermissionRequest;
}

/** Pinned above the composer while the agent awaits a permission. */
export function PermissionCard({ wid, request }: PermissionCardProps) {
	const grant = useGrantPermission(wid);
	const [expanded, setExpanded] = useState(true);
	const respond = (action: "allow" | "allow_session" | "deny") =>
		grant.mutate({ permission: request, action });

	const paramsText =
		request.params === undefined || request.params === null
			? ""
			: typeof request.params === "string"
				? request.params
				: prettyJson(JSON.stringify(request.params));

	return (
		<div className="w-full">
			<details
				open={expanded}
				onToggle={(e) => setExpanded(e.currentTarget.open)}
				className="group border-2 border-pink-500 bg-pink-950/20"
			>
				<summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
					<Icon
						icon="ri:arrow-right-s-line"
						width={18}
						className="shrink-0 text-pink-300 transition-transform group-open:rotate-90"
					/>
					<span className="min-w-0 flex-1 font-display text-lg text-pink-200">
						{request.tool_name} wants permission
					</span>
				</summary>

				<div className="border-t-2 border-pink-500/40 px-4 py-3">
					{request.description && (
						<p className="text-xs text-on-surface-muted">{request.description}</p>
					)}
					{request.path && (
						<p className="mt-1 font-mono text-[11px] break-all text-ghost">{request.path}</p>
					)}
					{paramsText && (
						<pre className="mt-2 max-h-32 overflow-auto border border-border bg-surface-alt p-2 font-mono text-[11px] whitespace-pre-wrap text-on-surface-muted">
							{clamp(paramsText, 1200)}
						</pre>
					)}
					<div className="mt-3 flex flex-wrap gap-2">
						<Button
							size="sm"
							className="font-display"
							onClick={() => respond("allow")}
							isLoading={grant.isPending}
						>
							ALLOW
						</Button>
						<Button
							size="sm"
							variant="outlined"
							className="font-display"
							onClick={() => respond("allow_session")}
							isLoading={grant.isPending}
						>
							SESSION
						</Button>
						<Button
							size="sm"
							variant="text"
							color="danger"
							className="font-display"
							onClick={() => respond("deny")}
							isLoading={grant.isPending}
						>
							DENY
						</Button>
					</div>
				</div>
			</details>
		</div>
	);
}
