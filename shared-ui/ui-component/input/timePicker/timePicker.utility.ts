import { pad } from "../../../utils/date";

export function parseTime(value?: string): { hh: string; mm: string } | null {
	if (!value) return null;

	const match = value.match(/^(\d{2}):(\d{2})$/);
	if (!match) return null;

	const h = parseInt(match[1], 10);
	const m = parseInt(match[2], 10);

	if (h < 0 || h > 23 || m < 0 || m > 59) return null;

	return { hh: pad(h), mm: pad(m) };
}

export function buildHours(): string[] {
	return Array.from({ length: 24 }, (_, i) => pad(i));
}

export function buildMinutes(step: number): string[] {
	const result: string[] = [];
	for (let m = 0; m < 60; m += step) result.push(pad(m));
	return result;
}
