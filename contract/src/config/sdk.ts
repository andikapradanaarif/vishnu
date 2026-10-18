import { buildPath, type ApiClient } from "../client";
import {
	v1WorkspaceConfig,
	v1WorkspaceConfigModel,
	v1WorkspaceProviders,
} from "../paths";
import type {
	ConfigModelRequest,
	ConfigScope,
	CrushConfig,
	ProviderConfig,
	SelectedModel,
	SelectedModelType,
} from "../types";

/**
 * SDK client for the `/workspaces/{id}/config` + `/providers` endpoints.
 */
export class ConfigClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/** GET `/workspaces/{id}/config` — agents map + selected models. */
	get(workspaceId: string): Promise<CrushConfig> {
		return this.api.get<CrushConfig>(buildPath(v1WorkspaceConfig, { id: workspaceId }));
	}

	/** GET `/workspaces/{id}/providers` — available providers + models. */
	providers(workspaceId: string): Promise<ProviderConfig[]> {
		return this.api.get<ProviderConfig[]>(
			buildPath(v1WorkspaceProviders, { id: workspaceId }),
		);
	}

	/**
	 * POST `/workspaces/{id}/config/model` — select the model for a slot.
	 * `scope` is an int on the wire: 0 = global, 1 = workspace (default).
	 */
	setModel(
		workspaceId: string,
		modelType: SelectedModelType,
		model: SelectedModel,
		scope: ConfigScope = 1,
	): Promise<void> {
		return this.api.post<void>(buildPath(v1WorkspaceConfigModel, { id: workspaceId }), {
			scope,
			model_type: modelType,
			model,
		} satisfies ConfigModelRequest);
	}
}
