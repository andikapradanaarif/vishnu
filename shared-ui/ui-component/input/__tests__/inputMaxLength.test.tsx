import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import Input from "../Input";
import TextAreaInput from "../TextAreaInput";

afterEach(() => cleanup());

describe("Input maxLength", () => {
	it("forwards maxLength to the underlying input", () => {
		const { container } = render(
			<Input name="email" value="" onChange={() => {}} maxLength={10} />,
		);

		expect(container.querySelector("input")!.getAttribute("maxlength")).toBe("10");
	});

	it("accepts a numeric value", () => {
		const { container } = render(<Input name="age" type="number" value={42} onChange={() => {}} />);

		expect((container.querySelector("input") as HTMLInputElement).value).toBe("42");
	});
});

describe("TextAreaInput maxLength", () => {
	it("forwards maxLength to the underlying textarea", () => {
		const { container } = render(
			<TextAreaInput name="bio" value="" onChange={() => {}} maxLength={20} />,
		);

		expect(container.querySelector("textarea")!.getAttribute("maxlength")).toBe("20");
	});
});
