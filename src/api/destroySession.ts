/** Browser wrapper for DELETE /api/session/:token. */
export async function destroySession(token: string): Promise<void> {
    const response = await fetch(`/api/session/${encodeURIComponent(token)}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`Destroy session failed: ${response.status}`);
    }
}
