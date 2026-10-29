import { PresenceAvailability } from "../types/presence";

export const presenceAvailabilityConfig: Record<
	PresenceAvailability,
	{ color: string; icon: string }
> = {
	online: { color: "text-success-500", icon: "mdi:circle" },
	away: { color: "text-warning-400", icon: "mdi:circle" },
	busy: { color: "text-danger-500", icon: "mdi:circle" },
	offline: { color: "text-neutral-400", icon: "mdi:circle" },
};
