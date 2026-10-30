import Input from "./Input";
import type { InputProps } from "./types";
import { Icon } from "@iconify/react";
import { useState } from "react";

export default function PasswordInput(props: InputProps) {
	const [showPassword, setShowPassword] = useState(false);
	return (
		<Input
			{...props}
			type={showPassword ? "text" : "password"}
			autoComplete="current-password"
			suffixIcon={
				<Icon
					icon={showPassword ? "ri:eye-line" : "ri:eye-close-line"}
					className="text-neutral-500 cursor-pointer"
				/>
			}
			onSuffixIconClick={() => setShowPassword(!showPassword)}
		/>
	);
}
