import {describe, expect, it} from "bun:test";
import {render} from "@testing-library/react";

import {DateTimeValidator} from "../DateTimeValidator";
import TimeTrackingValidator from "../TimeTrackingValidator";

function fakeField(isTouched: boolean, errors: unknown[]) {
	return {state: {meta: {isTouched, errors}}} as never;
}

describe("DateTimeValidator", () => {
	it("renders the message for a failed mustBeInFuture rule", () => {
		const {container} = render(
			<DateTimeValidator fieldAPI={fakeField(true, ["mustBeInFuture"])}>
				{(text) => <span>{text}</span>}
			</DateTimeValidator>,
		);

		expect(container.textContent).toBe("Date must be in the future");
	});

	it("renders nothing before the field is touched", () => {
		const {container} = render(
			<DateTimeValidator fieldAPI={fakeField(false, ["mustBeInPast"])}>
				{(text) => <span>{text}</span>}
			</DateTimeValidator>,
		);

		expect(container.textContent).toBe("");
	});
});

describe("TimeTrackingValidator", () => {
	it("maps built-in time-tracking rules to messages", () => {
		const {container} = render(
			<TimeTrackingValidator fieldAPI={fakeField(true, ["startAfterEnd"])} validationKey="startAfterEnd">
				{(text) => <span>{text}</span>}
			</TimeTrackingValidator>,
		);

		expect(container.textContent).toBe("End time must be after start time");
	});

	it("falls back to the translated key for unknown rules", () => {
		const {container} = render(
			<TimeTrackingValidator fieldAPI={fakeField(true, ["validation.invalidTime"])} validationKey="validation.invalidTime">
				{(text) => <span>{text}</span>}
			</TimeTrackingValidator>,
		);

		expect(container.textContent).toBe("Invalid time");
	});
});
