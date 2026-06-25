/** Browser wrapper for POST /api/leaderboard. */
export async function submitScore(name: string, score: number): Promise<void> {
    const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score }),
    });
    if (!response.ok) {
        throw new Error(`Submit score failed: ${response.status}`);
    }
}
