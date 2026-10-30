import { useMemo } from "react";
import { Select, type SelectOption } from "@vishnu/ui-component/input";
import {
	useAgentInfo,
	useConfig,
	useProjects,
	useProviders,
	useSessions,
	useSetModel,
	useSetProjectAgent,
	useSetSessionModel,
} from "@/hooks/queries";

const AGENT_LABELS: Record<string, string> = {
	coder: "Coder",
	plan: "Plan",
	task: "Task",
};

/** Select value sent back to "follow the workspace default" — clears
    the session's model_override. */
const INHERIT_MODEL = "__inherit__";

interface AgentModelControlsProps {
	/** Project id — the agent choice is persisted on the project row. */
	pid: string;
	wid: string;
	/** Active room — when set, the model picker writes the session's
	    model override instead of the shared config. */
	sid?: string;
	agentClassName?: string;
	modelClassName?: string;
	/** Dialogs show field labels; the compact topbar uses placeholders. */
	showLabels?: boolean;
}

/** Agent + model selects — shared between the topbar and the settings
    dialog. The agent is workspace-wide and stored by vishnu (crush resets
    it per child start); with a `sid` the model picker is room-scoped. */
export function AgentModelControls({
	pid,
	wid,
	sid,
	agentClassName,
	modelClassName,
	showLabels,
}: AgentModelControlsProps) {
	const { data: agentInfo } = useAgentInfo(wid);
	const { data: config } = useConfig(wid);
	const { data: providers } = useProviders(wid);
	const { data: sessions } = useSessions(wid);
	const { data: projects } = useProjects();
	const setModel = useSetModel(wid);
	const setSessionModel = useSetSessionModel(wid, sid);
	const setAgent = useSetProjectAgent(wid);

	// The agent the workspace is running: vishnu's persisted choice, which
	// is what gets replayed onto every re-created crush workspace.
	const currentAgent = projects?.find((p) => p.id === pid)?.agent;

	const session = useMemo(
		() => (sid ? sessions?.find((s) => s.id === sid) : undefined),
		[sessions, sid],
	);
	const override = session?.model_override;

	// Model picker: group provider options → their models. The option
	// value encodes "providerId/modelId" so onChange can split it back.
	const modelOptions = useMemo<SelectOption<string>[]>(() => {
		const groups: SelectOption<string>[] = (providers ?? [])
			.filter((p) => p.id && p.models && p.models.length > 0 && !p.disable)
			.map((p) => ({
				value: p.id!,
				label: p.name ?? p.id!,
				options: p.models!.map((m) => ({
					value: `${p.id}/${m.id}`,
					label: m.name || m.id,
				})),
			}));
		// Room-scoped picker with an override gets a way back to inherit.
		if (sid && override) {
			return [{ value: INHERIT_MODEL, label: "Default (workspace)" }, ...groups];
		}
		return groups;
	}, [providers, sid, override]);

	const effective = override ?? agentInfo?.model_cfg;
	const currentModelValue = effective ? `${effective.provider}/${effective.model}` : undefined;

	const agentOptions = useMemo<SelectOption<string>[]>(() => {
		const ids = Object.keys(config?.agents ?? {});
		const list = ids.length > 0 ? ids : Object.keys(AGENT_LABELS);
		return list.map((id) => ({ value: id, label: AGENT_LABELS[id] ?? id }));
	}, [config]);

	const onModelChange = (v: string) => {
		if (sid) {
			// Room scope: writes the session's persisted override only.
			if (v === INHERIT_MODEL) {
				setSessionModel.mutate(null);
				return;
			}
			const [provider, ...rest] = v.split("/");
			const model = rest.join("/");
			if (!provider || !model) return;
			setSessionModel.mutate({ provider, model });
			return;
		}
		const [provider, ...rest] = v.split("/");
		const model = rest.join("/");
		if (!provider || !model) return;
		setModel.mutate({ modelType: "large", model: { provider, model } });
	};

	const namePrefix = showLabels ? "settings" : "topbar";
	const modelPending = sid ? setSessionModel.isPending : setModel.isPending;

	return (
		<>
			<Select
				name={`${namePrefix}-agent`}
				size="md"
				label={showLabels ? "Agent" : undefined}
				placeholder="Agent"
				options={agentOptions}
				value={currentAgent}
				onChange={(v) => setAgent.mutate({ id: pid, agent: v })}
				className={agentClassName}
				isLoading={setAgent.isPending}
			/>
			<Select
				name={`${namePrefix}-model`}
				size="md"
				label={showLabels ? (sid ? "Session model" : "Default model") : undefined}
				placeholder="Model"
				value={currentModelValue}
				options={modelOptions}
				isSearchable
				onChange={onModelChange}
				className={modelClassName}
				isLoading={modelPending}
			/>
		</>
	);
}
