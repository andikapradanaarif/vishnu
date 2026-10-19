import type { UserRole } from "../auth/index";

export interface CreateUserRequest {
	email: string;
	name?: string;
	role?: UserRole;
}

export * from "./sdk";
