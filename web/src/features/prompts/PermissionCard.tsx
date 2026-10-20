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
	const respond = (action: "allow" | "allow_session" | "deny") =>
		grant.mutate({ permission: request, action });

	const paramsText =
		request.params === undefined || request.params === null
			? ""
			: typeof request.params === "string"
				? request.params
				: prettyJson(JSON.stringify(request.params));

	return (
		<div className="mx-auto w-full max-w-3xl px-3 sm:px-6">
			<div className="border-2 border-pink-500 bg-pink-950/20 px-4 py-3">
				<div className="font-display text-xs tracking-[0.25em] text-pink-400">
					P1 DECISION
				</div>
				<div className="mt-1 flex items-center gap-2 font-display text-lg text-pink-200">
					<Icon icon="ri:shield-keyhole-line" width={16} />
					{request.tool_name} wants permission
				</div>
				{request.description && (
					<p className="mt-1 text-xs text-on-surface-muted">{request.description}</p>
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
		</div>
	);
}
