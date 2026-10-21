import { bindProject } from "./api";
import { pendingStore } from "./pendingStore";
import { queryClient } from "./queryClient";

const CRUSH_QUERY_ROOTS = [
	"sessions",
	"messages",
	"agent",
	"providers",
	"config",
	"permissions-skip",
	"workspaces",
] as const;

/** Drop everything tied to the selected project before switching. */
export function resetCrushState(): void {
	bindProject(undefined);
	pendingStore.reset();
	for (const root of CRUSH_QUERY_ROOTS) {
		queryClient.removeQueries({ queryKey: [root] });
	}
}
