export type UserRole = "admin" | "member";

export interface User {
	id: string;
	email: string;
	name?: string;
	role: UserRole;
}

/** `{user}` envelope returned by verify/me and by user creation. */
export interface UserEnvelope {
	user: User;
}

export * from "./sdk";
