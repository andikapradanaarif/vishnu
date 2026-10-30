import { useMemo } from "react";
import type { AnyFieldApi } from "@tanstack/react-form";

import type { TimeTrackingRules } from "../../types/form";
import type { Language, TranslationKey } from "../../types/translations";
import { translate } from "../../utils/translation";

interface TimeTrackingValidatorProps {
	validationKey: TimeTrackingRules | TranslationKey;
	children: (errorText: string) => React.ReactNode;
	fieldAPI: AnyFieldApi;
	language?: Language;
}

/**
 * Renders `children` with a message for a time-tracking validation failure.
 * Built-in rules (`TimeTrackingRules`) get a friendly message; any other key is
 * resolved as a translation key, falling back to the key itself.
 */
function TimeTrackingValidator({
	children,
	fieldAPI,
	validationKey,
	language = "en",
}: TimeTrackingValidatorProps) {
	const errorText: string = useMemo(() => {
		if (fieldAPI.state.meta.isTouched && fieldAPI.state.meta.errors.length > 0) {
			const ruleMessages: Record<TimeTrackingRules, string> = {
				required: translate(language, "validation.required", "This field is required"),
				startTimeFuture: translate(
					language,
					"validation.timeMustBeInFuture",
					"Start time must be in the future",
				),
				startTimeInvalid: translate(language, "validation.invalidTime", "Invalid time"),
				durationIsNotPositive: translate(
					language,
					"validation.durationIsNotPositive",
					"Duration must be greater than zero",
				),
				durationTooLong: translate(
					language,
					"validation.durationTooLong",
					"Duration cannot exceed 3 hours",
				),
				endTimeInvalid: translate(language, "validation.invalidTime", "Invalid time"),
				endTimeFuture: translate(
					language,
					"validation.endTimeMustBeInFuture",
					"End time must be in the future",
				),
				startAfterEnd: translate(
					language,
					"validation.startAfterEnd",
					"End time must be after start time",
				),
			};

			const rule = validationKey as TimeTrackingRules;
			if (ruleMessages[rule] !== undefined) {
				return ruleMessages[rule];
			}

			return translate(language, validationKey as TranslationKey, String(validationKey));
		}

		return "";
	}, [fieldAPI.state.meta.isTouched, fieldAPI.state.meta.errors, language, validationKey]);

	return <>{children(errorText)}</>;
}

export default TimeTrackingValidator;
