import { useMemo } from "react";
import { Select, type SelectOption } from "@vishnu/ui-component/input";
import {
	useAgentInfo,
	useConfig,
	useProviders,
	useSetMainAgent,
	useSetModel,
} from "@/hooks/queries";

const AGENT_LABELS: Record<string, string> = {
	coder: "Coder",
	plan: "Plan",
	task: "Task",
};

interface AgentModelControlsProps {
	wid: string;
	agentClassName?: string;
	modelClassName?: string;
	/** Dialogs show field labels; the compact topbar uses placeholders. */
	showLabels?: boolean;
}

/** Agent + model selects — shared between the topbar and the settings
    dialog so both stay in sync with the workspace config. */
export function AgentModelControls({
	wid,
	agentClassName,
	modelClassName,
	showLabels,
}: AgentModelControlsProps) {
	const { data: agentInfo } = useAgentInfo(wid);
	const { data: config } = useConfig(wid);
	const { data: providers } = useProviders(wid);
	const setModel = useSetModel(wid);
	const setMainAgent = useSetMainAgent(wid);

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

	const namePrefix = showLabels ? "settings" : "topbar";

	return (
		<>
			<Select
				name={`${namePrefix}-agent`}
				size="md"
				label={showLabels ? "Agent" : undefined}
				placeholder="Agent"
				options={agentOptions}
				value={undefined}
				onChange={(v) => setMainAgent.mutate(v)}
				className={agentClassName}
				isLoading={setMainAgent.isPending}
			/>
			<Select
				name={`${namePrefix}-model`}
				size="md"
				label={showLabels ? "Model" : undefined}
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
				className={modelClassName}
				isLoading={setModel.isPending}
			/>
		</>
	);
}
