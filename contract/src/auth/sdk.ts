import type { ApiClient } from "../client";
import {
	vishnuAuthLogout,
	vishnuAuthMe,
	vishnuAuthRequestOtp,
	vishnuAuthVerify,
} from "../paths";
import type { User, UserEnvelope } from "./index";

/**
 * SDK client for `/api/auth/*`. The session rides in the `vishnu_session`
 * cookie (same-origin fetch), so there is no header plumbing here.
 *
 * @example
 * const auth = new AuthClient(new ApiClient({ baseUrl: "/api" }));
 * const me = await auth.me();
 */
export class AuthClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/** POST `/auth/request-otp` — 200 whether or not the address is registered. */
	requestOtp(email: string): Promise<{ message: string }> {
		return this.api.post<{ message: string }>(vishnuAuthRequestOtp, { email });
	}

	/** POST `/auth/verify` — sets the session cookie and returns the user. */
	async verify(email: string, code: string): Promise<User> {
		const { user } = await this.api.post<UserEnvelope>(vishnuAuthVerify, {
			email,
			code,
		});
		return user;
	}

	/** POST `/auth/logout` — clears the session (204). */
	logout(): Promise<void> {
		return this.api.post<void>(vishnuAuthLogout);
	}

	/** GET `/auth/me` — the signed-in user. */
	async me(): Promise<User> {
		const { user } = await this.api.get<UserEnvelope>(vishnuAuthMe);
		return user;
	}
}
