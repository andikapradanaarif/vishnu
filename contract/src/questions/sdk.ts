import { buildPath, type ApiClient } from "../client";
import { v1WorkspaceQuestionsAnswer, v1WorkspaceQuestionsCancel } from "../paths";
import type { QuestionAnswer, ResolvedResponse } from "../types";

/**
 * SDK client for the `/workspaces/{id}/questions` endpoints — the
 * question-tool batch prompt flow.
 */
export class QuestionsClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/** POST `/workspaces/{id}/questions/answer` — submit answers for a batch. */
	answer(workspaceId: string, answer: QuestionAnswer): Promise<ResolvedResponse> {
		return this.api.post<ResolvedResponse>(
			buildPath(v1WorkspaceQuestionsAnswer, { id: workspaceId }),
			answer,
		);
	}

	/** POST `/workspaces/{id}/questions/cancel` — dismiss the batch (no body). */
	cancel(workspaceId: string): Promise<ResolvedResponse> {
		return this.api.post<ResolvedResponse>(
			buildPath(v1WorkspaceQuestionsCancel, { id: workspaceId }),
		);
	}
}
