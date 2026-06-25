import { describe, expect, it } from 'vitest';
import { loadConfig } from '@/config/loadConfig';

describe('loadConfig', () => {
    it('returns parsed config when REDIS_URL is present', () => {
        const config = loadConfig({ REDIS_URL: 'redis://localhost:6379', WORKER_PORT: '3002' });
        expect(config.REDIS_URL).toBe('redis://localhost:6379');
        expect(config.WORKER_PORT).toBe(3002);
    });

    it('defaults WORKER_PORT to 3002 when unset', () => {
        const config = loadConfig({ REDIS_URL: 'redis://localhost:6379' });
        expect(config.WORKER_PORT).toBe(3002);
    });

    it('throws a clear error when REDIS_URL is missing', () => {
        expect(() => loadConfig({})).toThrow(/REDIS_URL/);
    });
});
