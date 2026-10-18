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
			<div className="rounded-xl border border-amber-800/60 bg-amber-950/30 px-4 py-3">
				<div className="flex items-center gap-2 text-sm font-medium text-amber-200">
					<Icon icon="ri:shield-keyhole-line" width={16} />
					{request.tool_name} wants permission
				</div>
				{request.description && (
					<p className="mt-1 text-xs text-neutral-300">{request.description}</p>
				)}
				{request.path && (
					<p className="mt-1 font-mono text-[11px] break-all text-neutral-500">
						{request.path}
					</p>
				)}
				{paramsText && (
					<pre className="mt-2 max-h-32 overflow-auto rounded-md bg-neutral-900/80 p-2 font-mono text-[11px] whitespace-pre-wrap text-neutral-400">
						{clamp(paramsText, 1200)}
					</pre>
				)}
				<div className="mt-3 flex gap-2">
					<Button size="sm" onClick={() => respond("allow")} isLoading={grant.isPending}>
						Allow
					</Button>
					<Button
						size="sm"
						variant="outlined"
						onClick={() => respond("allow_session")}
						isLoading={grant.isPending}
					>
						Allow for session
					</Button>
					<Button
						size="sm"
						variant="text"
						color="danger"
						onClick={() => respond("deny")}
						isLoading={grant.isPending}
					>
						Deny
					</Button>
				</div>
			</div>
		</div>
	);
}
