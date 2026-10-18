/**
 * Wire types for the `crush server` HTTP API. Field-for-field mirror of
 * internal/proto + internal/pubsub — snake_case throughout.
 */

// ---------- Workspaces & sessions ----------

export interface Workspace {
	id: string;
	path: string;
	yolo?: boolean;
	debug?: boolean;
	data_dir?: string;
	version?: string;
	client_id?: string;
	channels?: string[];
}

/**
 * Body for `POST /v1/workspaces`. Note: crush takes `client_id` in the
 * JSON body here (not a query param) — it registers the creating client.
 */
export interface CreateWorkspaceRequest {
	path: string;
	client_id: string;
	yolo?: boolean;
	debug?: boolean;
	data_dir?: string;
}

/** Error envelope returned by crush on non-2xx responses. */
export interface ErrorBody {
	message?: string;
}

export interface Todo {
	id?: string;
	key?: string;
	content: string;
	status: string;
	active_form?: string;
	depends_on?: string[];
	evidence_checks?: string[];
	evidence_paths?: string[];
}

export interface Session {
	id: string;
	parent_session_id: string;
	title: string;
	message_count: number;
	prompt_tokens: number;
	completion_tokens: number;
	summary_message_id: string;
	cost: number;
	todos?: Todo[];
	channel?: string;
	created_at: number;
	updated_at: number;
	is_busy: boolean;
	attached_clients: number;
}

// ---------- Messages ----------

export type MessageRole = "assistant" | "user" | "system" | "tool";

export interface Message {
	id: string;
	role: MessageRole;
	session_id: string;
	parts: ContentPart[];
	model: string;
	provider: string;
	created_at: number;
	updated_at: number;
	is_summary_message?: boolean;
}

export interface TextContent {
	text: string;
	hidden?: boolean;
}

export interface ReasoningContent {
	id?: string;
	thinking: string;
	signature?: string;
	started_at?: number;
	finished_at?: number;
}

export interface ToolCall {
	id: string;
	name: string;
	input: string;
	type?: string;
	provider_executed?: boolean;
	finished?: boolean;
}

export interface ToolResult {
	tool_call_id: string;
	name: string;
	content: string;
	data?: string;
	mime_type?: string;
	metadata: string;
	is_error: boolean;
}

export interface Finish {
	reason: string;
	time: number;
	message?: string;
	details?: string;
}

export interface ShellCommand {
	command: string;
	output: string;
}

export type ContentPart =
	| { type: "text"; data: TextContent }
	| { type: "reasoning"; data: ReasoningContent }
	| { type: "tool_call"; data: ToolCall }
	| { type: "tool_result"; data: ToolResult }
	| { type: "finish"; data: Finish }
	| { type: "shell_command"; data: ShellCommand }
	| { type: "image_url"; data: { url: string; detail?: string } }
	| { type: "binary"; data: unknown }
	| { type: string; data: unknown };

// ---------- Agent ----------

export interface AgentMessage {
	session_id: string;
	prompt: string;
	run_id?: string;
	hidden_user_message?: boolean;
	channel?: string;
}

export interface AgentInfo {
	is_busy: boolean;
	is_ready: boolean;
	model: CatwalkModel;
	model_cfg: SelectedModel;
}

export interface AgentEvent {
	type: "error" | "response" | "summarize";
	message: Message;
	error?: string;
	run_id?: string;
	session_id?: string;
	session_title?: string;
	progress?: string;
	done?: boolean;
}

// ---------- Models & providers ----------

export interface CatwalkModel {
	id: string;
	name: string;
	provider?: string;
	context_window?: number;
	default_max_tokens?: number;
	can_reason?: boolean;
	reasoning_levels?: string[];
	supports_attachments?: boolean;
}

export interface ProviderConfig {
	id?: string;
	name?: string;
	base_url?: string;
	type?: string;
	disable?: boolean;
	models?: CatwalkModel[];
}

export type SelectedModelType = "large" | "small" | "summary";

/** Scope is an int on the wire: 0 = global, 1 = workspace. */
export type ConfigScope = 0 | 1;

export interface SelectedModel {
	model: string;
	provider: string;
	reasoning_effort?: string;
	think?: boolean;
	max_tokens?: number;
	temperature?: number;
	top_p?: number;
	top_k?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	provider_options?: Record<string, unknown>;
}

export interface ConfigModelRequest {
	scope: ConfigScope;
	model_type: SelectedModelType;
	model: SelectedModel;
}

/** Minimal projection of crush's config.Config used by the UI. */
export interface CrushConfig {
	agents?: Record<string, { name?: string; description?: string; model?: string }>;
	models?: Partial<Record<SelectedModelType, SelectedModel>>;
	recent_models?: Partial<Record<SelectedModelType, SelectedModel[]>>;
}

// ---------- Permissions & questions ----------

export type PermissionAction = "allow" | "allow_session" | "deny";

export interface PermissionRequest {
	id: string;
	session_id: string;
	tool_call_id: string;
	tool_name: string;
	description: string;
	action: string;
	params: unknown;
	path: string;
}

export interface PermissionGrant {
	permission: PermissionRequest;
	action: PermissionAction;
}

export interface PermissionNotification {
	session_id: string;
	tool_call_id: string;
	granted: boolean;
	denied: boolean;
}

export interface PermissionSkipRequest {
	skip: boolean;
}

export type QuestionType = "yes_no" | "single_choice" | "multi_choice" | "free_text";

export interface QuestionChoice {
	id: string;
	label: string;
	description?: string;
}

export interface QuestionItem {
	id: string;
	type: QuestionType;
	label?: string;
	question: string;
	description?: string;
	choices?: QuestionChoice[];
}

export interface QuestionRequest {
	id: string;
	session_id: string;
	tool_call_id: string;
	questions: QuestionItem[];
	confirm_title?: string;
	confirm_description?: string;
}

export interface QuestionResponseItem {
	request_id: string;
	selected_ids?: string[];
	fill_in_text?: string;
	yes?: boolean;
	notes?: Record<string, string>;
}

export interface QuestionAnswer {
	batch_request_id: string;
	responses: QuestionResponseItem[];
}

export interface QuestionNotification {
	batch_id: string;
	session_id: string;
}

// ---------- SSE event envelope ----------

export type EventPayloadType =
	| "message"
	| "session"
	| "agent_event"
	| "permission_request"
	| "permission_notification"
	| "question_batch_request"
	| "question_batch_notification"
	| "run_complete"
	| "config_changed"
	| "update_available"
	| "lsp_event"
	| "mcp_event"
	| "file"
	| "skills_event";

export interface EventPayload {
	type: EventPayloadType | string;
	payload: unknown;
}

export interface RunComplete {
	session_id: string;
	run_id?: string;
	message_id: string;
	text?: string;
	error?: string;
	cancelled?: boolean;
}

export interface ResolvedResponse {
	resolved: boolean;
}
