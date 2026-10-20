import {
	useEffect,
	useRef,
	useState,
	type ClipboardEvent,
	type FormEvent,
	type KeyboardEvent,
} from "react";
import { Button } from "@vishnu/ui-component/button";
import { Input } from "@vishnu/ui-component/input";
import { ApiError } from "@vishnu/api-contract/client";
import { useRequestOtp, useVerify } from "@/hooks/queries";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

type Phase = "email" | "code";

function messageOf(error: unknown, fallback: string): string {
	if (error instanceof ApiError) return error.body.message || error.message;
	return error instanceof Error ? error.message : fallback;
}

function codeOf(error: unknown): string | undefined {
	return error instanceof ApiError ? error.code : undefined;
}

/** Title screen: email, then a one-time code. */
export function LoginScreen() {
	const [phase, setPhase] = useState<Phase>("email");
	const [email, setEmail] = useState("");
	const [digits, setDigits] = useState<string[]>(() =>
		Array.from({ length: CODE_LENGTH }, () => ""),
	);
	const [emailError, setEmailError] = useState<string>();
	const [codeError, setCodeError] = useState<string>();
	const [banner, setBanner] = useState<string>();
	const [cooldown, setCooldown] = useState(0);
	const cells = useRef<Array<HTMLInputElement | null>>([]);

	const requestOtp = useRequestOtp();
	const verify = useVerify();

	useEffect(() => {
		if (cooldown === 0) return;
		const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [cooldown]);

	const focusCell = (index: number) => {
		requestAnimationFrame(() => {
			const cell = cells.current[index];
			cell?.focus();
			cell?.select();
		});
	};

	const resetCode = () => {
		setDigits(Array.from({ length: CODE_LENGTH }, () => ""));
		setCodeError(undefined);
	};

	const sendCode = (target: string, goToCode: boolean) => {
		setBanner(undefined);
		requestOtp.mutate(target, {
			onSuccess: () => {
				setCooldown(RESEND_SECONDS);
				if (goToCode) {
					resetCode();
					setPhase("code");
					focusCell(0);
				}
			},
			onError: (error) =>
				setBanner(`Couldn't send a code — ${messageOf(error, "try again")}`),
		});
	};

	const submitEmail = (event: FormEvent) => {
		event.preventDefault();
		const value = email.trim();
		if (!value || !value.includes("@")) {
			setEmailError("enter a valid email");
			return;
		}
		setEmailError(undefined);
		sendCode(value, true);
	};

	const submitCode = (event: FormEvent) => {
		event.preventDefault();
		const code = digits.join("");
		if (code.length !== CODE_LENGTH) {
			setCodeError("enter all six digits");
			return;
		}
		setCodeError(undefined);
		setBanner(undefined);
		verify.mutate(
			{ email: email.trim(), code },
			{
				onError: (error) => {
					switch (codeOf(error)) {
						case "invalid_code":
							setCodeError("wrong code");
							break;
						case "code_expired":
							setCodeError("expired — request a new one");
							break;
						case "too_many_attempts":
							setCodeError("locked out — request a new code");
							break;
						case "invalid_email":
							setPhase("email");
							setEmailError("enter a valid email");
							break;
						default:
							setBanner(messageOf(error, "sign-in failed — try again"));
					}
				},
			},
		);
	};

	const writeDigits = (start: number, raw: string) => {
		const incoming = raw.replace(/\D/g, "");
		if (!incoming) return;
		setDigits((current) => {
			const next = [...current];
			for (let i = 0; i < incoming.length && start + i < CODE_LENGTH; i += 1) {
				next[start + i] = incoming[i];
			}
			return next;
		});
		setCodeError(undefined);
		focusCell(Math.min(start + incoming.length, CODE_LENGTH - 1));
	};

	const onCellChange = (index: number, value: string) => {
		const digit = value.replace(/\D/g, "").slice(-1);
		if (!digit) {
			setDigits((current) => current.map((d, i) => (i === index ? "" : d)));
			return;
		}
		writeDigits(index, digit);
	};

	const onCellKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Backspace" && !digits[index] && index > 0) {
			event.preventDefault();
			setDigits((current) => current.map((d, i) => (i === index - 1 ? "" : d)));
			focusCell(index - 1);
		}
	};

	const onCellPaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
		const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
		if (!pasted) return;
		event.preventDefault();
		writeDigits(pasted.length >= CODE_LENGTH ? 0 : index, pasted);
	};

	return (
		<div className="flex min-h-dvh items-center justify-center px-4">
			<div className="w-full max-w-sm">
				<div className="text-center">
					<h1 className="text-2xl font-semibold tracking-[0.35em] text-neutral-100">
						VISHNU
					</h1>
					<p className="mt-2 text-sm text-neutral-400">
						{phase === "email"
							? "Enter your email to continue"
							: "Enter the six-digit code"}
					</p>
				</div>

				{banner && (
					<p className="mt-4 rounded-md border border-danger-800 bg-danger-950/60 px-3 py-2 text-xs text-danger-200">
						{banner}
					</p>
				)}

				{phase === "email" ? (
					<form className="mt-6 flex flex-col gap-4" onSubmit={submitEmail}>
						<Input
							name="email"
							label="Email"
							type="email"
							autoComplete="email"
							placeholder="you@example.com"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							error={emailError}
							required
						/>
						<Button type="submit" className="w-full" isLoading={requestOtp.isPending}>
							Continue
						</Button>
					</form>
				) : (
					<form className="mt-6 flex flex-col gap-4" onSubmit={submitCode}>
						<div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
							<span className="truncate">{email}</span>
							<button
								type="button"
								className="shrink-0 text-primary-400 hover:underline"
								onClick={() => {
									setPhase("email");
									setBanner(undefined);
									setCodeError(undefined);
								}}
							>
								edit
							</button>
						</div>

						<div>
							<div className="flex justify-between gap-2">
								{digits.map((digit, index) => (
									<input
										key={index}
										ref={(element) => {
											cells.current[index] = element;
										}}
										inputMode="numeric"
										autoComplete={index === 0 ? "one-time-code" : "off"}
										maxLength={1}
										value={digit}
										onChange={(event) => onCellChange(index, event.target.value)}
										onKeyDown={(event) => onCellKeyDown(index, event)}
										onPaste={(event) => onCellPaste(index, event)}
										aria-label={`Code digit ${index + 1}`}
										className="h-12 w-full min-w-0 rounded-md border border-neutral-700 bg-neutral-900 text-center text-lg text-neutral-100 outline-none focus:border-primary-500"
									/>
								))}
							</div>
							{codeError && (
								<p className="mt-1.5 text-xs text-danger-400">{codeError}</p>
							)}
						</div>

						<Button
							type="submit"
							className="w-full"
							isLoading={verify.isPending}
							disabled={digits.join("").length !== CODE_LENGTH}
						>
							Sign in
						</Button>

						<button
							type="button"
							className="text-xs text-neutral-500 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={cooldown > 0 || requestOtp.isPending}
							onClick={() => sendCode(email.trim(), false)}
						>
							{cooldown > 0 ? `Resend (${cooldown})` : "Resend"}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
