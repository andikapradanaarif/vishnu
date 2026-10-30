import { useState, useEffect, useRef, useCallback } from "react";

export const useDebounce = (value: string, delay: number = 500): string => {
	const [debouncedValue, setDebouncedValue] = useState<string>(value);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [value, delay]);

	return debouncedValue;
};

export const useDebounceFunc = <T>(
	callback: (arg: T) => void,
	delay: number = 500,
): ((arg: T) => void) => {
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const callbackRef = useRef(callback);
	const lastArgRef = useRef<T | undefined>(undefined);
	const hasPendingRef = useRef(false);
	const delayRef = useRef(delay);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	useEffect(() => {
		delayRef.current = delay;
	}, [delay]);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	// Reschedule pending call when delay changes
	useEffect(() => {
		if (timeoutRef.current && hasPendingRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = setTimeout(() => {
				callbackRef.current(lastArgRef.current as T);
				hasPendingRef.current = false;
			}, delay);
		}
	}, [delay]);

	return useCallback((arg: T) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		lastArgRef.current = arg;
		hasPendingRef.current = true;
		timeoutRef.current = setTimeout(() => {
			callbackRef.current(arg);
			hasPendingRef.current = false;
		}, delayRef.current);
	}, []);
};
