/** Browser wrapper for DELETE /api/cache/repo. */
export async function clearCachedRepo(name: string): Promise<void> {
    const response = await fetch(`/api/cache/repo?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`Cache clear failed: ${response.status}`);
    }
}
