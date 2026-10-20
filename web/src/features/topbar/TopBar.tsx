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
				: conn === "connecting"
					? "STARTING"
					: "OFFLINE";
	const ledDot =
		led === "ONLINE"
			? "bg-success-500"
			: led === "STARTING"
				? "bg-warning-500 animate-pulse"
				: "bg-neutral-600";
	const ledText =
		led === "ONLINE"
			? "text-success-400"
			: led === "STARTING"
				? "text-warning-400"
				: "text-neutral-500";

	return (
		<header className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-950 px-3 py-2">
			<button
				className="rounded-md p-2 text-neutral-400 hover:bg-neutral-800"
				onClick={onMenu}
				aria-label="Open menu"
			>
				<Icon icon="ri:menu-line" width={20} />
			</button>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate text-sm font-medium text-neutral-100">
						{project.name}
					</span>
					<span className={`h-2 w-2 shrink-0 rounded-full ${ledDot}`} />
					<span className={`shrink-0 text-[10px] tracking-wide ${ledText}`}>{led}</span>
				</div>
				<div className="truncate text-xs text-neutral-500">
					{sessionTitle ?? project.path ?? project.upstream ?? project.id}
				</div>
			</div>

			<button
				type="button"
				onClick={onSwitchProject}
				className="hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 sm:inline-flex"
			>
				<Icon icon="ri:folder-line" width={14} />
				Projects
			</button>

			<Select
				name="agent"
				size="sm"
				placeholder="Agent"
				options={agentOptions}
				value={undefined}
				onChange={(v) => setMainAgent.mutate(v)}
				className="w-32"
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
				className="hidden w-48 sm:block"
				isLoading={setModel.isPending}
			/>

			<div className="hidden items-center gap-1.5 lg:flex" title="Skip permission prompts">
				<span className="text-xs text-neutral-500">Skip&nbsp;perms</span>
				<Switch
					name="skip-permissions"
					checked={skip?.skip ?? false}
					onChange={(v) => setSkip.mutate(v)}
				/>
			</div>
		</header>
	);
}
