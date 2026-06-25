import { describe, expect, it } from 'vitest';
import { encodeSseEvent } from '@/services/sse/encodeSseEvent';

describe('encodeSseEvent', () => {
    it('serializes to a data: frame that round-trips', () => {
        const wire = encodeSseEvent({ message: 'hello' });
        expect(wire).toBe('data: {"message":"hello"}\n\n');
        const parsed = JSON.parse(wire.slice('data: '.length).trim());
        expect(parsed).toEqual({ message: 'hello' });
    });
});
