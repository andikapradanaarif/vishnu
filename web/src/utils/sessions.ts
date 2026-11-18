/**
 * Session ids a session's prompt surface covers: the session itself plus
 * every transitive sub-agent session (crush reports their requests under
 * their own session ids and delivers them to the top-level session's
 * viewers).
 */
export function descendantsOf(
	sessions: { id: string; parent_session_id: string }[],
	rootId: string,
): ReadonlySet<string> {
	const covered = new Set([rootId]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const s of sessions) {
			if (!covered.has(s.id) && covered.has(s.parent_session_id)) {
				covered.add(s.id);
				grew = true;
			}
		}
	}
	return covered;
}
