import type { User, UserEnvelope } from "../auth/index";
import type { ApiClient } from "../client";
import { vishnuUsers } from "../paths";
import type { CreateUserRequest } from "./index";

/**
 * SDK client for `/api/users`. Admin-only: a member session surfaces as an
 * `ApiError` with `code: "forbidden"` and `status: 403`.
 */
export class UsersClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/** POST `/users` — creates an allowlisted address (201). */
	async create(req: CreateUserRequest): Promise<User> {
		const { user } = await this.api.post<UserEnvelope>(vishnuUsers, req);
		return user;
	}
}
