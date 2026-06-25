/** Browser wrapper for POST /api/pubsub/publish. */
export async function publishMessage(message: string): Promise<void> {
    const response = await fetch('/api/pubsub/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
    if (!response.ok) {
        throw new Error(`Publish failed: ${response.status}`);
    }
}
