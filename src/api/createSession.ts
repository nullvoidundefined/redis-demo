/** Browser wrapper for POST /api/session. */
export async function createSession(label: string): Promise<string> {
    const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
    });
    if (!response.ok) {
        throw new Error(`Create session failed: ${response.status}`);
    }
    const body = (await response.json()) as { token: string };
    return body.token;
}
