import { describe, it, expect, afterEach } from "bun:test";
import { renderHook } from "@testing-library/react";
import { detectBrowser, useBrowserSupport, DEFAULT_MIN_VERSIONS } from "../useBrowserSupport";

describe("detectBrowser", () => {
	it("detects Chrome correctly", () => {
		const ua =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
		const result = detectBrowser(DEFAULT_MIN_VERSIONS, ua);
		expect(result.name).toBe("chrome");
		expect(result.version).toBe(130);
		expect(result.isSupported).toBe(true);
		expect(result.ready).toBe(true);
	});

	it("detects Firefox correctly", () => {
		const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";
		const result = detectBrowser(DEFAULT_MIN_VERSIONS, ua);
		expect(result.name).toBe("firefox");
		expect(result.version).toBe(130);
		expect(result.isSupported).toBe(true);
	});

	it("detects Safari correctly", () => {
		const ua =
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
		const result = detectBrowser(DEFAULT_MIN_VERSIONS, ua);
		expect(result.name).toBe("safari");
		expect(result.version).toBe(18);
		expect(result.isSupported).toBe(true);
	});

	it("detects Edge correctly", () => {
		const ua =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0";
		const result = detectBrowser(DEFAULT_MIN_VERSIONS, ua);
		expect(result.name).toBe("edge");
		expect(result.version).toBe(130);
		expect(result.isSupported).toBe(true);
	});

	it("detects Edge on Android (EdgA)", () => {
		const ua =
			"Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 EdgA/130.0.0.0";
		const result = detectBrowser(DEFAULT_MIN_VERSIONS, ua);
		expect(result.name).toBe("edge");
		expect(result.version).toBe(130);
	});

	it("detects Chrome on iOS (CriOS)", () => {
		const ua =
			"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1";
		const result = detectBrowser(DEFAULT_MIN_VERSIONS, ua);
		expect(result.name).toBe("chrome");
		expect(result.version).toBe(130);
	});

	it("detects Firefox on iOS (FxiOS)", () => {
		const ua =
			"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/604.1";
		const result = detectBrowser(DEFAULT_MIN_VERSIONS, ua);
		expect(result.name).toBe("firefox");
		expect(result.version).toBe(130);
	});

	it("reports unsupported for old Chrome", () => {
		const ua =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/100.0.0.0 Safari/537.36";
		const result = detectBrowser(DEFAULT_MIN_VERSIONS, ua);
		expect(result.name).toBe("chrome");
		expect(result.version).toBe(100);
		expect(result.isSupported).toBe(false);
	});

	it("reports unknown browser as other with isSupported true", () => {
		const ua = "SomeUnknownBrowser/1.0";
		const result = detectBrowser(DEFAULT_MIN_VERSIONS, ua);
		expect(result.name).toBe("other");
		expect(result.isSupported).toBe(true);
		expect(result.ready).toBe(true);
	});

	it("respects custom minVersions merged with defaults", () => {
		const ua = "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36";
		const result = detectBrowser({ chrome: 120 }, ua);
		expect(result.name).toBe("chrome");
		expect(result.version).toBe(120);
		expect(result.isSupported).toBe(true);
	});

	it("handles minVersion of 0 correctly", () => {
		const ua = "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36";
		const result = detectBrowser({ chrome: 0 }, ua);
		expect(result.name).toBe("chrome");
		expect(result.isSupported).toBe(true);
	});
});

// Deterministic Chrome UA for hook-level tests
const CHROME_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const originalUA = navigator.userAgent;

function withChromeUA(fn: () => void) {
	Object.defineProperty(navigator, "userAgent", { value: CHROME_UA, configurable: true });
	try {
		fn();
	} finally {
		Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
	}
}

afterEach(() => {
	Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
});

describe("useBrowserSupport", () => {
	it("returns ready: true after effect runs with detected browser", () => {
		withChromeUA(() => {
			const { result } = renderHook(() => useBrowserSupport());
			expect(result.current.ready).toBe(true);
			expect(result.current.name).toBe("chrome");
			expect(result.current.version).toBe(130);
		});
	});

	it("merges custom minVersions with defaults", () => {
		withChromeUA(() => {
			const { result } = renderHook(() => useBrowserSupport({ chrome: 1 }));
			expect(result.current.ready).toBe(true);
			expect(result.current.name).toBe("chrome");
			expect(result.current.isSupported).toBe(true);
		});
	});

	it("accepts empty minVersions and uses all defaults", () => {
		withChromeUA(() => {
			const { result } = renderHook(() => useBrowserSupport());
			expect(result.current.ready).toBe(true);
			expect(result.current.isSupported).toBe(true);
		});
	});

	it("respects custom minVersions override", () => {
		withChromeUA(() => {
			const { result } = renderHook(() => useBrowserSupport({ chrome: 999 }));
			expect(result.current.name).toBe("chrome");
			expect(result.current.isSupported).toBe(false);
		});
	});
});
