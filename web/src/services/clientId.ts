/**
 * Per-tab client identity. crush scopes permission/question delivery to
 * the session a client is viewing, keyed by this id — sessionStorage
 * keeps it stable across reloads but distinct per tab.
 */
const KEY = "vishnu:client_id";

export function clientId(): string {
	let id = sessionStorage.getItem(KEY);
	if (!id) {
		id = crypto.randomUUID();
		sessionStorage.setItem(KEY, id);
	}
	return id;
}
