import {useState, useEffect} from "react";

export type BrowserName = "chrome" | "firefox" | "safari" | "edge" | "other";

export type BrowserInfo = {
	name: BrowserName;
	version: number;
	isSupported: boolean;
	/** False during SSR/first render, true after client-side detection */
	ready: boolean;
};

export type MinBrowserVersions = Partial<Record<Exclude<BrowserName, "other">, number>>;

export const DEFAULT_MIN_VERSIONS: MinBrowserVersions = {
	chrome: 125,
	firefox: 125,
	safari: 18,
	edge: 125,
};

export function detectBrowser(minVersions: MinBrowserVersions, userAgent?: string): BrowserInfo {
	if (typeof navigator === "undefined" && !userAgent) {
		return {name: "other", version: 0, isSupported: true, ready: false};
	}

	const ua = userAgent ?? navigator.userAgent;
	let name: BrowserName = "other";
	let version = 0;

	// Edge (Chromium-based) — check before Chrome since Edge UA contains "Chrome"
	const edgeMatch = ua.match(/Edg(?:A|iOS)?\/(\d+)/);
	if (edgeMatch) {
		name = "edge";
		version = parseInt(edgeMatch[1], 10);
	}

	// Firefox
	if (name === "other") {
		const firefoxMatch = ua.match(/Firefox\/(\d+)/);
		if (firefoxMatch) {
			name = "firefox";
			version = parseInt(firefoxMatch[1], 10);
		}
	}

	// Chrome on iOS (CriOS) — check before Safari
	if (name === "other") {
		const criosMatch = ua.match(/CriOS\/(\d+)/);
		if (criosMatch) {
			name = "chrome";
			version = parseInt(criosMatch[1], 10);
		}
	}

	// Firefox on iOS (FxiOS) — check before Safari
	if (name === "other") {
		const fxiOSMatch = ua.match(/FxiOS\/(\d+)/);
		if (fxiOSMatch) {
			name = "firefox";
			version = parseInt(fxiOSMatch[1], 10);
		}
	}

	// Safari (must check after Chrome/Edge/Firefox iOS since they also contain "Safari" in UA)
	if (name === "other") {
		const safariMatch = ua.match(/Version\/(\d+).*Safari/);
		if (safariMatch) {
			name = "safari";
			version = parseInt(safariMatch[1], 10);
		}
	}

	// Chrome (check after Edge since it contains "Chrome" in UA)
	if (name === "other") {
		const chromeMatch = ua.match(/Chrome\/(\d+)/);
		if (chromeMatch) {
			name = "chrome";
			version = parseInt(chromeMatch[1], 10);
		}
	}

	if (name === "other") {
		return {name, version: 0, isSupported: true, ready: true};
	}

	const minVersion = minVersions[name];
	const isSupported = typeof minVersion === "number" ? version >= minVersion : true;

	return {name, version, isSupported, ready: true};
}

const SSR_DEFAULT: BrowserInfo = {name: "other", version: 0, isSupported: true, ready: false};

/**
 * Detects the current browser and checks whether it meets the minimum version requirements.
 *
 * @param minVersions - Optional overrides for minimum supported versions per browser.
 *   Merged with defaults (Chrome 125, Firefox 125, Safari 18, Edge 125),
 *   so partial overrides keep defaults for unspecified browsers.
 *
 * Note: Chromium-based browsers without explicit detection tokens (Samsung
 * Internet, Opera, Brave, Vivaldi) are bucketed under "chrome" with their
 * Chromium version.
 * Note: For iOS browsers (CriOS, FxiOS, EdgiOS), the reported version is
 * the app version, not the WebKit engine version. minVersion thresholds
 * for iOS browsers compare app versions, which may diverge from engine
 * capability.
 *
 * @returns Browser info including name, version, and whether the browser is supported.
 *   The `ready` flag is false during SSR/first render and true after detection.
 */
export function useBrowserSupport(minVersions: MinBrowserVersions = {}): BrowserInfo {
	const [browserInfo, setBrowserInfo] = useState<BrowserInfo>(() => ({...SSR_DEFAULT}));

	const merged = {...DEFAULT_MIN_VERSIONS, ...minVersions};
	const minVersionsKey = JSON.stringify(merged);

	useEffect(() => {
		setBrowserInfo(detectBrowser(merged));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [minVersionsKey]);

	return browserInfo;
}
