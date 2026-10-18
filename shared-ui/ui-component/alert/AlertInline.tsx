import classNames from "classnames";
import Alert from "./Alert";
import {useMemo} from "react";
import {AlertItem} from "./type";

export default function AlertInline({alerts, onClose}: {alerts: AlertItem[]; onClose: (id: string) => void}) {
	const inlineAlerts = useMemo(() => alerts.filter((alert) => alert.type === "inline"), [alerts]);

	if (inlineAlerts.length === 0) return <></>;

	return (
		<Alert
			alerts={inlineAlerts}
			onClose={onClose}
			variant="inline"
			className={classNames("px-4 md:px-8 max-w-[1600px] mx-auto mt-4", inlineAlerts.length > 1 && "gap-4")}
		/>
	);
}
