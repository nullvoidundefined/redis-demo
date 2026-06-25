import { describe, expect, it, vi } from 'vitest';

const { publishMessage } = vi.hoisted(() => ({ publishMessage: vi.fn() }));
vi.mock('@/services/pubsub/publishMessage', () => ({ publishMessage }));

import { POST } from '@/app/api/pubsub/publish/route';

function postJson(body: unknown) {
    return new Request('http://x/api/pubsub/publish', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

describe('POST /api/pubsub/publish', () => {
    it('publishes a valid message', async () => {
        publishMessage.mockResolvedValueOnce(undefined);
        const response = await POST(postJson({ message: 'hi' }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ published: true });
    });

    it('returns 400 for an empty message', async () => {
        const response = await POST(postJson({ message: '' }));
        expect(response.status).toBe(400);
    });
});
