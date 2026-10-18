import { buildPath, type ApiClient } from "../client";
import {
	v1WorkspacePermissionsGrant,
	v1WorkspacePermissionsSkip,
} from "../paths";
import type {
	PermissionAction,
	PermissionRequest,
	PermissionSkipRequest,
	ResolvedResponse,
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

	/** GET `/workspaces/{id}/permissions/skip` — read the skip toggle. */
	getSkip(workspaceId: string): Promise<PermissionSkipRequest> {
		return this.api.get<PermissionSkipRequest>(
			buildPath(v1WorkspacePermissionsSkip, { id: workspaceId }),
		);
	}

	/** POST `/workspaces/{id}/permissions/skip` — toggle auto-allow (yolo-ish). */
	setSkip(workspaceId: string, skip: boolean): Promise<void> {
		return this.api.post<void>(
			buildPath(v1WorkspacePermissionsSkip, { id: workspaceId }),
			{ skip } satisfies PermissionSkipRequest,
		);
	}
}
