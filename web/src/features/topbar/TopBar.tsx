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
import type { Workspace } from "@/types/crush";

interface TopBarProps {
	workspace: Workspace | undefined;
	workspaces: Workspace[];
	onSelectWorkspace: (id: string) => void;
	onMenu: () => void;
	sessionTitle?: string;
}

const AGENT_LABELS: Record<string, string> = {
	coder: "Coder",
	plan: "Plan",
	task: "Task",
};

export function TopBar({
	workspace,
	workspaces,
	onSelectWorkspace,
	onMenu,
	sessionTitle,
}: TopBarProps) {
	const wid = workspace?.id;
	const { conn } = usePendingState();
	const { data: agentInfo } = useAgentInfo(wid);
	const { data: config } = useConfig(wid);
	const { data: providers } = useProviders(wid);
	const { data: skip } = usePermissionsSkip(wid);
	const setModel = useSetModel(wid);
	const setMainAgent = useSetMainAgent(wid);
	const setSkip = useSetPermissionsSkip(wid);

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

	return (
		<header className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-950 px-3 py-2">
			<button
				className="rounded-md p-2 text-neutral-400 hover:bg-neutral-800 md:hidden"
				onClick={onMenu}
				aria-label="Open sessions"
			>
				<Icon icon="ri:menu-line" width={20} />
			</button>

			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-medium text-neutral-100">
					{sessionTitle ?? workspace?.path ?? "vishnu"}
				</div>
				{workspace?.path && sessionTitle && (
					<div className="truncate text-xs text-neutral-500">{workspace.path}</div>
				)}
			</div>

			{workspaces.length > 1 && (
				<Select
					name="workspace"
					size="sm"
					value={wid}
					options={workspaces.map((w) => ({ value: w.id, label: w.path || w.id }))}
					onChange={onSelectWorkspace}
					className="w-44"
				/>
			)}

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

			<span
				className={`h-2 w-2 shrink-0 rounded-full ${
					conn === "open"
						? "bg-emerald-500"
						: conn === "connecting"
							? "bg-amber-500"
							: "bg-red-500"
				}`}
				title={`Stream ${conn}`}
			/>
		</header>
	);
}
