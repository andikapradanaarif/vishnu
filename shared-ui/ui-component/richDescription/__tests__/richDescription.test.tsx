import {afterEach, describe, expect, it, spyOn} from "bun:test";
import {cleanup, render} from "@testing-library/react";
import DOMPurify from "dompurify";

import {RichDescription} from "../RichDescription";

afterEach(() => cleanup());

describe("RichDescription", () => {
	it("renders plain text split into paragraphs", () => {
		const {container} = render(<RichDescription text={"First paragraph\n\nSecond paragraph"} />);

		expect(container.textContent).toContain("First paragraph");
		expect(container.textContent).toContain("Second paragraph");
	});

	it("renders allowlisted HTML markup", () => {
		const {container} = render(
			<RichDescription text={'<ul><li>a</li></ul><strong>x</strong><a href="https://example.com">link</a>'} />,
		);

		expect(container.querySelector("li")?.textContent).toBe("a");
		expect(container.querySelector("strong")?.textContent).toBe("x");
		const link = container.querySelector("a");
		expect(link?.getAttribute("href")).toBe("https://example.com");
		expect(link?.getAttribute("target")).toBe("_blank");
		expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
	});

	it("sanitizes with the tight allowlist, stripping non-allowlisted markup", () => {
		// happy-dom's DOM is too thin for DOMPurify to strip attributes/scripts,
		// so this pins the allowlist two ways: the sanitize call must carry the
		// restrictive config, and <h1> — which DOMPurify's *default* surface
		// allows — must be gone from the output.
		const sanitizeSpy = spyOn(DOMPurify, "sanitize");
		try {
			const {container} = render(<RichDescription text={'<h1>Title</h1><img src="x"><p>keep</p>'} />);

			const config = sanitizeSpy.mock.calls[0]?.[1] as
				| {ALLOWED_TAGS?: string[]; ALLOWED_ATTR?: string[]}
				| undefined;
			expect(config?.ALLOWED_TAGS).toBeDefined();
			expect(config?.ALLOWED_TAGS).not.toContain("h1");
			expect(config?.ALLOWED_TAGS).not.toContain("script");
			expect(config?.ALLOWED_TAGS).not.toContain("img");
			expect(config?.ALLOWED_ATTR).not.toContain("onclick");

			expect(container.querySelector("h1")).toBeNull();
			expect(container.textContent).toContain("Title");
			expect(container.textContent).toContain("keep");
		} finally {
			sanitizeSpy.mockRestore();
		}
	});
});
