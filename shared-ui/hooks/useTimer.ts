import { useState, useEffect, useRef } from "react";

export type TimerFormatter = (elapsedMs: number) => string;

const defaultFormatter: TimerFormatter = (ms) => {
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.floor((ms % 60000) / 1000);
	return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Returns a formatted elapsed time string since `startTime`.
 * Updates every second. Returns "00:00" when startTime is null.
 *
 * @param startTime - When the timer started, or null to pause.
 * @param formatter - Optional custom formatter receiving elapsed milliseconds.
 *   The default formatter outputs MM:SS and wraps at 60 minutes (e.g. 90 min
 *   displays as "90:00"). For multi-hour timers, provide a custom formatter
 *   that outputs HH:MM:SS.
 */
export function useTimer(
	startTime: Date | null,
	formatter: TimerFormatter = defaultFormatter,
): string {
	const [duration, setDuration] = useState(() => formatter(0));
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const formatterRef = useRef(formatter);
	const startTimeRef = useRef(startTime);

	useEffect(() => {
		formatterRef.current = formatter;
		// Update displayed value when formatter changes and timer is paused
		if (!startTimeRef.current) {
			const formatted = formatter(0);
			setDuration((prev) => (prev !== formatted ? formatted : prev));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formatter]);

	useEffect(() => {
		startTimeRef.current = startTime;
	}, [startTime]);

	useEffect(() => {
		if (!startTime) {
			setDuration(formatterRef.current(0));
			return;
		}

		const updateTimer = () => {
			const now = new Date();
			const start = startTimeRef.current;
			if (!start) return;
			const diff = Math.max(0, now.getTime() - start.getTime());
			setDuration(formatterRef.current(diff));
		};

		updateTimer();
		timerRef.current = setInterval(updateTimer, 1000);

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
		// Use getTime() as dependency to avoid re-running on Date object identity changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [startTime?.getTime()]);

	return duration;
}
