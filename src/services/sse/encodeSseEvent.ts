/** Serializes an event object to a single SSE `data:` frame. */
export function encodeSseEvent(data: unknown): string {
    return `data: ${JSON.stringify(data)}\n\n`;
}
