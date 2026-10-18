// Type declarations for external dependencies that don't have TypeScript types

declare module "*.json" {
	const value: any;
	export default value;
}

declare module "*.css" {
	const content: string;
	export default content;
}

declare module "*.svg" {
	const content: string;
	export default content;
}
