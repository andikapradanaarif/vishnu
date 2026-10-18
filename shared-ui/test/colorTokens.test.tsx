import {afterEach, describe, expect, it} from "bun:test";
import {cleanup, render} from "@testing-library/react";

import {Button} from "../ui-component/button/Button";
import {Chip} from "../ui-component/chip/Chip";
import {ProgressBar} from "../ui-component/progressBar/ProgressBar";
import {Rating} from "../ui-component/rating/Rating";

afterEach(() => cleanup());

describe("semantic color tokens", () => {
	it("Button emits token classes, not raw palette names", () => {
		const {container} = render(<Button>Go</Button>);
		const button = container.querySelector("button")!;

		expect(button.className).toContain("bg-primary-500");
		expect(button.className).not.toContain("bg-indigo-500");
	});

	it("Button color=danger uses the danger token", () => {
		const {container} = render(<Button color="danger">Delete</Button>);
		const button = container.querySelector("button")!;

		expect(button.className).toContain("bg-danger-500");
	});

	it("Button color=custom applies colorClassName last so it wins", () => {
		const {container} = render(
			<Button color="custom" colorClassName="bg-fuchsia-600">
				Custom
			</Button>,
		);
		const button = container.querySelector("button")!;

		expect(button.className).toContain("bg-fuchsia-600");
	});

	it("Chip color=custom applies colorClassName", () => {
		const {container} = render(
			<Chip color="custom" colorClassName="bg-teal-100 text-teal-700">
				Tag
			</Chip>,
		);
		const chip = container.firstElementChild as HTMLElement;

		expect(chip.className).toContain("bg-teal-100");
	});

	it("ProgressBar color=danger uses the danger token", () => {
		const {container} = render(<ProgressBar value={50} color="danger" />);

		expect(container.innerHTML).toContain("bg-danger-500");
	});

	it("Rating color=custom applies colorClassName", () => {
		const {container} = render(
			<Rating value={3} readOnly color="custom" colorClassName="text-fuchsia-500" />,
		);
		const customSpans = container.querySelectorAll(".text-fuchsia-500");

		expect(customSpans.length).toBeGreaterThan(0);
	});
});
