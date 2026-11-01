import { buildPath, type ApiClient } from "../client";
import {
	v1WorkspaceById,
	v1WorkspacePermissionsGrant,
	v1WorkspacePermissionsMode,
	v1WorkspaceSessionPermissionsPending,
	v1WorkspaceSessionPermissionsSkip,
} from "../paths";
import type {
	PermissionAction,
	PermissionRequest,
	PermissionSetModeRequest,
	PermissionSkipRequest,
	ResolvedResponse,
	Workspace,
} from "../types";

/**
 * SDK client for the `/workspaces/{id}/permissions` endpoints.
 */
export class PermissionsClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/**
	 * POST `/workspaces/{id}/permissions/grant` — answer a pending
	 * permission request ("allow" | "allow_session" | "deny").
	 */
	grant(
		workspaceId: string,
		permission: PermissionRequest,
		action: PermissionAction,
	): Promise<ResolvedResponse> {
		return this.api.post<ResolvedResponse>(
			buildPath(v1WorkspacePermissionsGrant, { id: workspaceId }),
			{ permission, action },
		);
	}

	/**
	 * GET `/workspaces/{id}/sessions/{sid}/permissions/pending` — every
	 * request parked for the session, including its sub-agent sessions.
	 * The authoritative reconcile source for the SSE-driven pending
	 * store: replay re-adds live prompts but can't remove cards whose
	 * resolution event was missed.
	 */
	pending(workspaceId: string, sessionId: string): Promise<PermissionRequest[]> {
		return this.api.get<PermissionRequest[]>(
			buildPath(v1WorkspaceSessionPermissionsPending, { id: workspaceId, sid: sessionId }),
		);
	}

	/**
	 * Workspace-level skip was replaced by permission modes in v0.99.1 —
	 * there is no dedicated read endpoint, so this derives the legacy
	 * bool from the workspace resource's `permission_mode`.
	 */
	async getSkip(workspaceId: string): Promise<PermissionSkipRequest> {
		const workspace = await this.api.get<Workspace>(
			buildPath(v1WorkspaceById, { id: workspaceId }),
		);
		return { skip: (workspace.permission_mode ?? "normal") !== "normal" };
	}

	/**
	 * POST `/workspaces/{id}/permissions/mode` — toggle auto-allow.
	 * Maps the legacy bool onto the mode enum (yolo ⇄ normal); the
	 * fork's `sysadmin` mode is settable only through crush itself.
	 */
	setSkip(workspaceId: string, skip: boolean): Promise<void> {
		return this.api.post<void>(buildPath(v1WorkspacePermissionsMode, { id: workspaceId }), {
			mode: skip ? "yolo" : "normal",
		} satisfies PermissionSetModeRequest);
	}

	/**
	 * POST `/workspaces/{id}/sessions/{sid}/permissions/skip` — set or
	 * clear the session's auto-approve override. Persists on the session
	 * row (survives child restarts); `null` clears the override so the
	 * session inherits the workspace flag again.
	 */
	setSessionSkip(workspaceId: string, sessionId: string, skip: boolean | null): Promise<void> {
		return this.api.post<void>(
			buildPath(v1WorkspaceSessionPermissionsSkip, {
				id: workspaceId,
				sid: sessionId,
			}),
			{ skip } satisfies PermissionSkipRequest,
		);
	}
}
