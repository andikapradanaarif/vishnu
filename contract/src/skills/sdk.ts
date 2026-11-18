import { buildPath, type ApiClient } from "../client";
import {
	v1WorkspaceSkills,
	v1WorkspaceSkillsConfigDisabled,
	v1WorkspaceSkillsDisabled,
	v1WorkspaceSkillsEnabled,
	v1WorkspaceSkillsRead,
} from "../paths";
import type { ReadSkillResponse, SkillInfo, SkillSetDisabledRequest } from "../types";

/**
 * SDK client for the `/workspaces/{id}/skills` endpoints — listing the
 * skills the workspace sees and toggling them per repository or in the
 * global config. Live state changes also flow through `skills_event`.
 */
export class SkillsClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/** GET `/workspaces/{id}/skills` — the effective visible skills. */
	list(workspaceId: string): Promise<SkillInfo[]> {
		return this.api.get<SkillInfo[]>(buildPath(v1WorkspaceSkills, { id: workspaceId }));
	}

	/** POST `/workspaces/{id}/skills/read` — read a skill's content by id. */
	read(workspaceId: string, skillId: string): Promise<ReadSkillResponse> {
		return this.api.post<ReadSkillResponse>(buildPath(v1WorkspaceSkillsRead, { id: workspaceId }), {
			skill_id: skillId,
		});
	}

	/** GET `/workspaces/{id}/skills/disabled` — names disabled for this repository. */
	disabled(workspaceId: string): Promise<string[]> {
		return this.api.get<string[]>(buildPath(v1WorkspaceSkillsDisabled, { id: workspaceId }));
	}

	/**
	 * POST `/workspaces/{id}/skills/disabled` — toggle a repository-scoped
	 * skill override (persists in the repo's `.crush` data).
	 */
	setDisabled(workspaceId: string, name: string, disabled: boolean): Promise<void> {
		return this.api.post<void>(buildPath(v1WorkspaceSkillsDisabled, { id: workspaceId }), {
			name,
			disabled,
		} satisfies SkillSetDisabledRequest);
	}

	/** GET `/workspaces/{id}/skills/enabled` — names enabled for this repository. */
	enabled(workspaceId: string): Promise<string[]> {
		return this.api.get<string[]>(buildPath(v1WorkspaceSkillsEnabled, { id: workspaceId }));
	}

	/**
	 * POST `/workspaces/{id}/skills/config-disabled` — toggle a skill's
	 * `options.disabled_skills` flag in the global config (all repos).
	 */
	setConfigDisabled(workspaceId: string, name: string, disabled: boolean): Promise<void> {
		return this.api.post<void>(buildPath(v1WorkspaceSkillsConfigDisabled, { id: workspaceId }), {
			name,
			disabled,
		} satisfies SkillSetDisabledRequest);
	}
}
