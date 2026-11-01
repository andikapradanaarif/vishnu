import type { ApiClient } from "../client";
import { v1Version } from "../paths";
import type { VersionInfo } from "../types";

/**
 * SDK client for server-level endpoints — unscoped, no workspace id.
 */
export class ServerClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/** GET `/version` — crush server build info. */
	version(): Promise<VersionInfo> {
		return this.api.get<VersionInfo>(v1Version);
	}
}
