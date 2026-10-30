import type { FormRules, FormRulesOptions } from "../../types/form";
import { useMemo } from "react";
import type { FieldApi } from "@tanstack/react-form";
import { translate } from "../../utils/translation";
import type { Language, TranslationKey } from "../../types/translations";

interface FormValidatorProps {
	validationKey: FormRules | string;
	children: (errorText: string) => React.ReactNode;
	fieldAPI: FieldApi<
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any
	>;
	options?: FormRulesOptions;
	language?: Language;
}

function FormValidator({
	validationKey,
	children,
	fieldAPI,
	options,
	language = "en",
}: FormValidatorProps) {
	const errorText: string = useMemo(() => {
		// invalid validation
		if (fieldAPI.state.meta.isTouched && fieldAPI.state.meta.errors.length > 0) {
			const ruleCheckers: Record<FormRules, string> = {
				required: translate(language, "validation.required", "This field is required"),
				minLength: translate(language, "validation.minLength", "Minimum length is {min}", {
					min: String(options?.minLength || ""),
				}),
				maxLength: translate(language, "validation.maxLength", "Maximum length is {max}", {
					max: String(options?.maxLength || ""),
				}),
				containsUrl: translate(
					language,
					"validation.containsUrl",
					"This field cannot contain URLs",
				),
				containsHtmlOrScript: translate(
					language,
					"validation.containsHtmlScript",
					"This field cannot contain HTML or script tags",
				),
				containsSuspiciousPattern: translate(
					language,
					"validation.containsSuspiciousPattern",
					"This field contains suspicious patterns",
				),
				containsDisallowedCharacters: translate(
					language,
					"validation.containsDisallowedCharacters",
					"This field contains disallowed characters",
				),
				invalidEmail: translate(language, "validation.invalidEmail", "Invalid email address"),
			};

			if (ruleCheckers[validationKey as FormRules] !== undefined) {
				return ruleCheckers[validationKey as FormRules];
			}

			return translate(
				language,
				validationKey as string as TranslationKey,
				validationKey as string,
			);
		}

		return "";
	}, [fieldAPI.state.meta.isTouched, fieldAPI.state.meta.errors, validationKey, options, language]);

	return <>{children(errorText)}</>;
}

export default FormValidator;
