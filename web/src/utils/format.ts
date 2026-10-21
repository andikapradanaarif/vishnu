/** Small display helpers for the chat UI. */

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Unix-seconds timestamp → "2m ago"-style label. */
export function relativeTime(epochSeconds: number): string {
	const diff = epochSeconds * 1000 - Date.now();
	const abs = Math.abs(diff) / 1000;
	if (abs < 60) return rtf.format(Math.round(diff), "second");
	if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
	if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
	return rtf.format(Math.round(diff / 86400), "day");
}

/** Session cost in dollars → "$1.23" / "<$0.01". */
export function formatCost(cost: number): string {
	if (!cost) return "$0.00";
	if (cost < 0.01) return "<$0.01";
	return `$${cost.toFixed(2)}`;
}

/** Session timestamp → clock time within a day, else day/month/year. */
export function sessionTime(epochSeconds: number): string {
	const date = new Date(epochSeconds * 1000);
	const withinDay = Math.abs(Date.now() - date.getTime()) < 24 * 60 * 60 * 1000;
	if (withinDay) {
		return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
	}
	return date.toLocaleDateString(undefined, {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

/** Truncate a string for inline previews. */
export function clamp(s: string, max = 300): string {
	return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Pretty-print a tool input that may be a JSON string. */
export function prettyJson(raw: string): string {
	try {
		return JSON.stringify(JSON.parse(raw), null, 2);
	} catch {
		return raw;
	}
}
