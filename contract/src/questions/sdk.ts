import { buildPath, type ApiClient } from "../client";
import { v1WorkspaceQuestionsAnswer, v1WorkspaceQuestionsCancel } from "../paths";
import type { QuestionAnswer, QuestionCancel, ResolvedResponse } from "../types";

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

	/**
	 * POST `/workspaces/{id}/questions/cancel` — dismiss a batch. Pass
	 * `batchRequestId` (the QuestionRequest's `id`) whenever it is known:
	 * a body-less cancel only resolves when exactly one batch is pending
	 * and is a no-op when several are.
	 */
	cancel(workspaceId: string, batchRequestId?: string): Promise<ResolvedResponse> {
		return this.api.post<ResolvedResponse>(
			buildPath(v1WorkspaceQuestionsCancel, { id: workspaceId }),
			batchRequestId === undefined
				? undefined
				: ({ batch_request_id: batchRequestId } satisfies QuestionCancel),
		);
	}
}
