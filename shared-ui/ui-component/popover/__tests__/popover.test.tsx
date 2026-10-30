import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { Popover } from "../Popover";

afterEach(() => cleanup());

describe("Popover animation classes", () => {
	it("emits the shared-popover-* classes that the stylesheet defines", () => {
		render(
			<Popover id="t1" trigger={<button>Open</button>} isOpen>
				<div>content</div>
			</Popover>,
		);

		const content = document.getElementById("popover-content-t1")!;

		expect(content.className).toContain("shared-popover-base");
		expect(content.className).toContain("shared-popover-enter-bottom");
		// No leftover un-prefixed class (which would not match the stylesheet).
		expect(/(^|\s)popover-base(\s|$)/.test(content.className)).toBe(false);
	});
});
