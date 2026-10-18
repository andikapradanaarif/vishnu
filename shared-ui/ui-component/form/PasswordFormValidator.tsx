import type {PasswordRules} from "../../types/form";
import {useMemo} from "react";
import type {FieldApi} from "@tanstack/react-form";
import PasswordInput from "../input/PasswordInput";
import {PASSWORD_LEN_MIN} from "../../constants/user";
import {translate} from "../../utils/translation";
import type {Language} from "../../types/translations";

interface PasswordFormValidatorProps {
	validationKey: PasswordRules;
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
	name: string;
	value: string;
	onChange: (value: string) => void;
	language?: Language;
}

export default function PasswordFormValidator({
	validationKey,
	fieldAPI,
	name,
	value,
	onChange,
	language = "en",
}: PasswordFormValidatorProps) {
	const errorText: string = useMemo(() => {
		if (fieldAPI.state.meta.isTouched && !fieldAPI.state.meta.isValid) {
			const ruleCheckers: Record<PasswordRules, string> = {
				required: translate(language, "validation.required", "This field is required"),
				minLength: translate(language, "validation.password.minLength", "Minimum length is {min}", {
					min: String(PASSWORD_LEN_MIN),
				}),
				containLetter: translate(language, "validation.password.containLetter", "Password must contain letters"),
				containLowercase: translate(
					language,
					"validation.password.containLowercase",
					"Password must contain both uppercase and lowercase letters",
				),
				containUppercase: translate(
					language,
					"validation.password.containUppercase",
					"Password must contain both uppercase and lowercase letters",
				),
				containNumber: translate(language, "validation.password.containNumber", "Password must contain numbers"),
				containSpecialCharacter: translate(
					language,
					"validation.password.containSpecialCharacter",
					"Password must contain special characters",
				),
			};
			return ruleCheckers[validationKey];
		}

		return "";
	}, [fieldAPI.state.meta.isTouched, fieldAPI.state.meta.isValid, validationKey, language]);

	return (
		<PasswordInput
			label={translate(language, "auth.password.label", "Password")}
			placeholder={translate(language, "auth.password.placeholder", "Enter your password")}
			name={name}
			type="password"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			required
			error={errorText}
		/>
	);
}
