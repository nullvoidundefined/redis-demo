/** Browser wrapper for GET /api/session/:token. */
import type { SessionView } from '@/types/session';

export async function fetchSession(token: string): Promise<SessionView> {
    const response = await fetch(`/api/session/${encodeURIComponent(token)}`);
    if (!response.ok) {
        throw new Error(`Fetch session failed: ${response.status}`);
    }
    return response.json() as Promise<SessionView>;
}
