import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@vishnu/ui-component/button";
import { useAnswerQuestions, useCancelQuestions } from "@/hooks/queries";
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
		<div className="mx-auto w-full max-w-3xl px-3 sm:px-6">
			<div className="border-2 border-pink-500 bg-pink-950/20 px-4 py-3">
				<div className="flex items-center gap-2 font-display text-lg text-pink-200">
					<Icon icon="ri:question-line" width={16} />
					{request.confirm_title || "Agent has a question"}
				</div>
				{request.confirm_description && (
					<p className="mt-1 text-xs text-on-surface-muted">
						{request.confirm_description}
					</p>
				)}

				<div className="mt-3 flex flex-col gap-4">
					{request.questions.map((q) => (
						<QuestionField
							key={q.id}
							question={q}
							draft={drafts[q.id] ?? emptyDraft}
							onChange={(patch) => setDraft(q.id, patch)}
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
		</div>
	);
}

function QuestionField({
	question,
	draft,
	onChange,
}: {
	question: QuestionItem;
	draft: Draft;
	onChange: (patch: Partial<Draft>) => void;
}) {
	const label = question.label || question.question;

	return (
		<div>
			<div className="font-display text-base text-on-surface">{label}</div>
			{question.description && (
				<p className="mt-0.5 text-[11px] text-ghost">{question.description}</p>
			)}

			{question.type === "yes_no" && (
				<div className="mt-1.5 flex gap-2">
					<Button
						size="sm"
						variant={draft.yes === true ? "filled" : "outlined"}
						className="font-display"
						onClick={() => onChange({ yes: true })}
					>
						YES
					</Button>
					<Button
						size="sm"
						variant={draft.yes === false ? "filled" : "outlined"}
						className="font-display"
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
							{c.description && (
								<span className="text-[11px] text-ghost">— {c.description}</span>
							)}
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
							{c.description && (
								<span className="text-[11px] text-ghost">— {c.description}</span>
							)}
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
		</div>
	);
}
