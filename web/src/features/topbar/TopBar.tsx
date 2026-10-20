import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { Select, type SelectOption } from "@vishnu/ui-component/input";
import { Switch } from "@vishnu/ui-component";
import { usePendingState } from "@/services/pendingStore";
import {
	useAgentInfo,
	useConfig,
	usePermissionsSkip,
	useProviders,
	useSetMainAgent,
	useSetModel,
	useSetPermissionsSkip,
} from "@/hooks/queries";
import type { Project } from "@vishnu/api-contract";

interface TopBarProps {
	project: Project;
	workspaceId: string;
	onMenu: () => void;
	onSwitchProject: () => void;
	sessionTitle?: string;
}

const AGENT_LABELS: Record<string, string> = {
	coder: "Coder",
	plan: "Plan",
	task: "Task",
};

export function TopBar({
	project,
	workspaceId,
	onMenu,
	onSwitchProject,
	sessionTitle,
}: TopBarProps) {
	const { conn } = usePendingState();
	const { data: agentInfo } = useAgentInfo(workspaceId);
	const { data: config } = useConfig(workspaceId);
	const { data: providers } = useProviders(workspaceId);
	const { data: skip } = usePermissionsSkip(workspaceId);
	const setModel = useSetModel(workspaceId);
	const setMainAgent = useSetMainAgent(workspaceId);
	const setSkip = useSetPermissionsSkip(workspaceId);

	// Model picker: group provider options → their models. The option
	// value encodes "providerId/modelId" so onChange can split it back.
	const modelOptions = useMemo<SelectOption<string>[]>(() => {
		return (providers ?? [])
			.filter((p) => p.id && p.models && p.models.length > 0 && !p.disable)
			.map((p) => ({
				value: p.id!,
				label: p.name ?? p.id!,
				options: p.models!.map((m) => ({
					value: `${p.id}/${m.id}`,
					label: m.name || m.id,
				})),
			}));
	}, [providers]);

	const currentModelValue = agentInfo?.model_cfg
		? `${agentInfo.model_cfg.provider}/${agentInfo.model_cfg.model}`
		: undefined;

	const agentOptions = useMemo<SelectOption<string>[]>(() => {
		const ids = Object.keys(config?.agents ?? {});
		const list = ids.length > 0 ? ids : Object.keys(AGENT_LABELS);
		return list.map((id) => ({ value: id, label: AGENT_LABELS[id] ?? id }));
	}, [config]);

	const led =
		project.status === "down" || project.status === "error"
			? "OFFLINE"
			: conn === "open"
				? "ONLINE"
				: project.status === "up"
					? "RECONNECTING"
					: "STARTING";
	const ledText =
		led === "ONLINE"
			? "text-success-400 glow"
			: led === "OFFLINE"
				? "text-ghost"
				: "text-warning-400 blink";

	return (
		<header className="flex items-center gap-2 border-b-2 border-border bg-surface px-3 py-2">
			<button
				className="p-2 text-on-surface-muted hover:bg-raised hover:text-primary-400"
				onClick={onMenu}
				aria-label="Open menu"
			>
				<Icon icon="ri:menu-line" width={20} />
			</button>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-display text-xl text-on-surface">
						{project.name}
					</span>
					<span className={`shrink-0 font-display text-sm ${ledText}`}>● {led}</span>
				</div>
				<div className="truncate text-xs text-on-surface-muted">
					{sessionTitle ?? project.path ?? project.upstream ?? project.id}
				</div>
			</div>

			<button
				type="button"
				onClick={onSwitchProject}
				className="hidden shrink-0 items-center gap-1 px-2 py-1 font-display text-sm text-info-300 hover:bg-raised hover:text-info-200 sm:inline-flex"
			>
				<Icon icon="ri:folder-line" width={14} />
				PROJECTS
			</button>

			<Select
				name="agent"
				size="sm"
				placeholder="Agent"
				options={agentOptions}
				value={undefined}
				onChange={(v) => setMainAgent.mutate(v)}
				className="w-24 font-display sm:w-32"
				isLoading={setMainAgent.isPending}
			/>

			<Select
				name="model"
				size="sm"
				placeholder="Model"
				value={currentModelValue}
				options={modelOptions}
				isSearchable
				onChange={(v) => {
					const [provider, ...rest] = v.split("/");
					const model = rest.join("/");
					if (!provider || !model) return;
					setModel.mutate({ modelType: "large", model: { provider, model } });
				}}
				className="hidden w-48 font-display sm:block"
				isLoading={setModel.isPending}
			/>

			<div className="hidden items-center gap-1.5 lg:flex" title="Skip permission prompts">
				<span className="font-display text-sm text-on-surface-muted">SKIP</span>
				<Switch
					name="skip-permissions"
					checked={skip?.skip ?? false}
					onChange={(v) => setSkip.mutate(v)}
				/>
			</div>
		</header>
	);
}
