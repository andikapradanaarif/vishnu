import { AlertItem } from "./type";
import Alert from "./Alert";
import { createPortal } from "react-dom";

export default function AlertToast({
	alerts,
	onClose,
}: {
	alerts: AlertItem[];
	onClose: (id: string) => void;
}) {
	const toastAlerts = alerts.filter((alert) => alert.type === "toast" || alert.type === undefined);
	return createPortal(
		<Alert alerts={toastAlerts} onClose={onClose} variant="overlay" />,
		document.body,
	);
}
