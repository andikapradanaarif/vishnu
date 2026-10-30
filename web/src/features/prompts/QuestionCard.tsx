import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@vishnu/ui-component/button";
import { useAnswerQuestions, useCancelQuestions } from "@/hooks/queries";
import { clamp } from "@/utils/format";
import type { QuestionItem, QuestionRequest, QuestionResponseItem } from "@vishnu/api-contract";

interface QuestionCardProps {
	wid: string;
	request: QuestionRequest;
}

interface Draft {
	selected: string[];
	text: string;
	yes: boolean | undefined;
}

const emptyDraft: Draft = { selected: [], text: "", yes: undefined };

/** Renders a batch of the agent's question-tool prompts as a form. */
export function QuestionCard({ wid, request }: QuestionCardProps) {
	const answer = useAnswerQuestions(wid);
	const cancel = useCancelQuestions(wid);
	const [drafts, setDrafts] = useState<Record<string, Draft>>({});
	const [expanded, setExpanded] = useState(true);

	const setDraft = (qid: string, patch: Partial<Draft>) =>
		setDrafts((d) => ({ ...d, [qid]: { ...(d[qid] ?? emptyDraft), ...patch } }));

	const submit = () => {
		const responses: QuestionResponseItem[] = request.questions.map((q) => {
			const d = drafts[q.id] ?? emptyDraft;
			return {
				request_id: q.id,
				...(d.selected.length > 0 && { selected_ids: d.selected }),
				...(d.text && { fill_in_text: d.text }),
				...(d.yes !== undefined && { yes: d.yes }),
			};
		});
		answer.mutate({ batch_request_id: request.id, responses });
	};

	return (
		<div className="w-full">
			<details
				open={expanded}
				onToggle={(e) => setExpanded(e.currentTarget.open)}
				className="group border-2 border-pink-500 bg-pink-950/20"
			>
				<summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
					<Icon
						icon="ri:arrow-right-s-line"
						width={18}
						className="shrink-0 text-pink-300 transition-transform group-open:rotate-90"
					/>
					<span className="min-w-0 flex-1 font-display text-lg text-pink-200">
						{request.confirm_title || "Agent has a question"}
					</span>
					{request.questions.length > 1 && (
						<span className="shrink-0 text-xs text-pink-300">
							{request.questions.length} questions
						</span>
					)}
				</summary>

				<div className="border-t-2 border-pink-500/40 px-4 py-3">
					{request.confirm_description && (
						<p className="text-xs text-on-surface-muted">{request.confirm_description}</p>
					)}

					<div className="mt-3 flex flex-col gap-2">
						{request.questions.map((q, index) => (
							<QuestionField
								key={q.id}
								question={q}
								draft={drafts[q.id] ?? emptyDraft}
								onChange={(patch) => setDraft(q.id, patch)}
								collapsible={request.questions.length > 1}
								defaultOpen={index === 0}
							/>
						))}
					</div>

					<div className="mt-4 flex gap-2">
						<Button
							size="sm"
							className="font-display"
							onClick={submit}
							isLoading={answer.isPending}
						>
							SUBMIT
						</Button>
						<Button
							size="sm"
							variant="text"
							className="font-display"
							onClick={() => cancel.mutate(request.id)}
							isLoading={cancel.isPending}
						>
							DISMISS
						</Button>
					</div>
				</div>
			</details>
		</div>
	);
}

function QuestionField({
	question,
	draft,
	onChange,
	collapsible,
	defaultOpen,
}: {
	question: QuestionItem;
	draft: Draft;
	onChange: (patch: Partial<Draft>) => void;
	collapsible: boolean;
	defaultOpen: boolean;
}) {
	const label = question.label || question.question;
	const [open, setOpen] = useState(defaultOpen);
	const summary = answerSummary(question, draft);
	const answered = summary !== UNANSWERED;

	const body = (
		<>
			{question.description && (
				<p className="mt-0.5 text-[11px] text-ghost">{question.description}</p>
			)}

			{question.type === "yes_no" && (
				<div className="mt-1.5 flex gap-2">
					<Button
						size="sm"
						variant="outlined"
						color="custom"
						colorClassName={
							draft.yes === true
								? "!border-primary-500 !bg-primary-500/10 !text-on-surface"
								: "!border-border !text-on-surface-muted hover:!border-primary-500"
						}
						className="font-display"
						aria-pressed={draft.yes === true}
						onClick={() => onChange({ yes: true })}
					>
						YES
					</Button>
					<Button
						size="sm"
						variant="outlined"
						color="custom"
						colorClassName={
							draft.yes === false
								? "!border-primary-500 !bg-primary-500/10 !text-on-surface"
								: "!border-border !text-on-surface-muted hover:!border-primary-500"
						}
						className="font-display"
						aria-pressed={draft.yes === false}
						onClick={() => onChange({ yes: false })}
					>
						NO
					</Button>
				</div>
			)}

			{question.type === "single_choice" && (
				<div className="mt-1.5 flex flex-col gap-1.5">
					{(question.choices ?? []).map((c) => (
						<label
							key={c.id}
							className="flex cursor-pointer items-center gap-2 text-sm text-on-surface"
						>
							<input
								type="radio"
								name={`q-${question.id}`}
								checked={draft.selected[0] === c.id}
								onChange={() => onChange({ selected: [c.id] })}
								className="accent-primary-500"
							/>
							<span>{c.label}</span>
							{c.description && <span className="text-[11px] text-ghost">— {c.description}</span>}
						</label>
					))}
				</div>
			)}

			{question.type === "multi_choice" && (
				<div className="mt-1.5 flex flex-col gap-1.5">
					{(question.choices ?? []).map((c) => (
						<label
							key={c.id}
							className="flex cursor-pointer items-center gap-2 text-sm text-on-surface"
						>
							<input
								type="checkbox"
								checked={draft.selected.includes(c.id)}
								onChange={(e) =>
									onChange({
										selected: e.target.checked
											? [...draft.selected, c.id]
											: draft.selected.filter((x) => x !== c.id),
									})
								}
								className="accent-primary-500"
							/>
							<span>{c.label}</span>
							{c.description && <span className="text-[11px] text-ghost">— {c.description}</span>}
						</label>
					))}
				</div>
			)}

			{question.type === "free_text" && (
				<input
					type="text"
					value={draft.text}
					onChange={(e) => onChange({ text: e.target.value })}
					className="mt-1.5 w-full border-2 border-border bg-raised px-2.5 py-1.5 text-sm text-on-surface outline-none focus:border-primary-500"
				/>
			)}
		</>
	);

	if (!collapsible) {
		return (
			<div>
				<div className="font-display text-base text-on-surface">{label}</div>
				{body}
			</div>
		);
	}

	return (
		<details
			open={open}
			onToggle={(e) => setOpen(e.currentTarget.open)}
			className="group border border-border bg-surface/40"
		>
			<summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
				<Icon
					icon="ri:arrow-right-s-line"
					width={16}
					className="shrink-0 text-primary-400 transition-transform group-open:rotate-90"
				/>
				<span className="min-w-0 flex-1 truncate font-display text-base text-on-surface">
					{label}
				</span>
				<span className={`shrink-0 text-xs ${answered ? "text-success-400" : "text-ghost"}`}>
					{summary}
				</span>
			</summary>
			<div className="border-t border-border px-3 py-2.5">{body}</div>
		</details>
	);
}

const UNANSWERED = "unanswered";

function answerSummary(question: QuestionItem, draft: Draft): string {
	switch (question.type) {
		case "yes_no":
			if (draft.yes === true) return "yes";
			if (draft.yes === false) return "no";
			return UNANSWERED;
		case "free_text": {
			const text = draft.text.trim();
			return text ? clamp(text, 32) : UNANSWERED;
		}
		case "single_choice": {
			const choice = question.choices?.find((c) => c.id === draft.selected[0]);
			return choice?.label ?? UNANSWERED;
		}
		case "multi_choice":
			return draft.selected.length > 0 ? `${draft.selected.length} selected` : UNANSWERED;
		default:
			return UNANSWERED;
	}
}
