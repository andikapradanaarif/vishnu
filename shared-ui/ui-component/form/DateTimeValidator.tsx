import {useMemo} from "react";
import type {AnyFieldApi} from "@tanstack/react-form";

import type {DateTimeRules} from "../../types/form";
import type {Language, TranslationKey} from "../../types/translations";
import {translate} from "../../utils/translation";

interface DateTimeValidatorProps {
	fieldAPI: AnyFieldApi;
	children: (errorText: string) => React.ReactNode;
	language?: Language;
}

/**
 * Renders `children` with a message for a date/time cross-field validation
 * failure, read from the field's error state. Pair with a validator whose rule
 * names are `DateTimeRules` (`mustBeInFuture` / `mustBeInPast`).
 */
export const DateTimeValidator = ({fieldAPI, children, language = "en"}: DateTimeValidatorProps) => {
	const errorText: string = useMemo(() => {
		if (fieldAPI.state.meta.isTouched && fieldAPI.state.meta.errors.length > 0) {
			const ruleMessages: Record<DateTimeRules, string> = {
				mustBeInFuture: translate(language, "validation.dateMustBeInFuture", "Date must be in the future"),
				mustBeInPast: translate(language, "validation.dateMustBeInPast", "Date must be in the past"),
			};

			const failedRule = fieldAPI.state.meta.errors[0] as DateTimeRules | undefined;
			if (!failedRule) return "";
			return (
				ruleMessages[failedRule] ??
				translate(language, failedRule as string as TranslationKey, failedRule as string)
			);
		}

		return "";
	}, [fieldAPI.state.meta.isTouched, fieldAPI.state.meta.errors, language]);

	return <>{children(errorText)}</>;
};
