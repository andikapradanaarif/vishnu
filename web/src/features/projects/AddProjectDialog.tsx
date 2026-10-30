import { useState, type FormEvent } from "react";
import { Button } from "@vishnu/ui-component/button";
import { Dialog } from "@vishnu/ui-component/dialog";
import { Input } from "@vishnu/ui-component/input";
import { Tabs, type Tab } from "@vishnu/ui-component/tabs";
import { ApiError } from "@vishnu/api-contract/client";
import { useCreateProject } from "@/hooks/queries";
import { errorLabel } from "@/utils/errors";
import type { CreateProjectRequest } from "@vishnu/api-contract";

type Source = "github" | "link" | "external";

const SOURCE_TABS: [Tab<Source>, Tab<Source>, Tab<Source>] = [
	{ value: "github", label: "GitHub" },
	{ value: "link", label: "Link" },
	{ value: "external", label: "Remote" },
];

interface AddProjectDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

function createError(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 409) return "[conflict] already registered";
		if (error.status === 403)
			return "[forbidden] server can't reach that repo — check its git auth";
		if (error.code === "invalid_path") return "[invalid_path] directory not found on the server";
	}
	return errorLabel(error, "couldn't create the project — try again");
}

/** Three source tabs; exactly one source field is sent per create. */
export function AddProjectDialog({ isOpen, onClose }: AddProjectDialogProps) {
	const create = useCreateProject();
	const [source, setSource] = useState<Source>("github");
	const [name, setName] = useState("");
	const [repoUrl, setRepoUrl] = useState("");
	const [path, setPath] = useState("");
	const [upstream, setUpstream] = useState("");
	const [fieldError, setFieldError] = useState<string>();
	const [error, setError] = useState<string>();

	const reset = () => {
		setSource("github");
		setName("");
		setRepoUrl("");
		setPath("");
		setUpstream("");
		setFieldError(undefined);
		setError(undefined);
	};

	const close = () => {
		if (create.isPending) return;
		reset();
		onClose();
	};

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const req: CreateProjectRequest = {};
		if (name.trim()) req.name = name.trim();

		if (source === "github") {
			if (!repoUrl.trim()) {
				setFieldError("enter a repository");
				return;
			}
			req.repo_url = repoUrl.trim();
		} else if (source === "link") {
			const value = path.trim();
			if (!value || !value.startsWith("/")) {
				setFieldError("enter an absolute path on the server");
				return;
			}
			req.path = value;
		} else {
			const value = upstream.trim();
			if (!value || !/^https?:\/\//.test(value)) {
				setFieldError("enter an http(s) URL");
				return;
			}
			req.upstream = value;
		}

		setFieldError(undefined);
		setError(undefined);
		create.mutate(req, {
			onSuccess: close,
			onError: (err) => setError(createError(err)),
		});
	};

	return (
		<Dialog
			isOpen={isOpen}
			onClose={close}
			title="New project"
			containerClassName="mx-3 w-full max-w-xl"
			className="w-full pixel-border bg-surface"
		>
			<form className="flex flex-col gap-5" onSubmit={submit}>
				<Tabs
					id="project-source"
					items={SOURCE_TABS}
					active={source}
					className="font-display text-lg"
					onChange={(value) => {
						setSource(value);
						setFieldError(undefined);
						setError(undefined);
					}}
				/>

				<div className="min-h-[96px]">
					{source === "github" && (
						<Input
							name="repo_url"
							label="Repository"
							placeholder="owner/repo"
							value={repoUrl}
							onChange={(event) => setRepoUrl(event.target.value)}
							message="Access is checked on the server first."
						/>
					)}

					{source === "link" && (
						<Input
							name="path"
							label="Path"
							placeholder="/srv/repos/my-project"
							value={path}
							onChange={(event) => setPath(event.target.value)}
							message="Absolute path to a directory on the server."
						/>
					)}

					{source === "external" && (
						<Input
							name="upstream"
							label="Upstream"
							placeholder="http://127.0.0.1:9201"
							value={upstream}
							onChange={(event) => setUpstream(event.target.value)}
							message="vishnu routes to it; it never starts or stops it."
						/>
					)}
				</div>

				<Input
					name="name"
					label="Name (optional)"
					placeholder="Defaults to the repo slug or directory name"
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>

				{fieldError && <p className="font-display text-sm text-danger-400">{fieldError}</p>}
				{error && <p className="font-display text-sm text-danger-400">{error}</p>}

				<div className="mt-1 flex justify-end gap-2">
					<Button
						variant="text"
						type="button"
						className="font-display"
						onClick={close}
						disabled={create.isPending}
					>
						CANCEL
					</Button>
					<Button type="submit" className="font-display" isLoading={create.isPending}>
						CREATE
					</Button>
				</div>
			</form>
		</Dialog>
	);
}
