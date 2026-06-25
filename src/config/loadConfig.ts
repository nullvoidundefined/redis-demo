/** Loads and validates process environment. Fails fast with a clear message
 * when REDIS_URL is absent, so misconfiguration surfaces at boot, not mid-request. */
import { z } from 'zod';

const EnvSchema = z.object({
    REDIS_URL: z
        .string({ required_error: 'REDIS_URL is required' })
        .min(1, 'REDIS_URL is required'),
    GITHUB_TOKEN: z.string().optional(),
    WORKER_PORT: z.coerce.number().default(3002),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: Partial<NodeJS.ProcessEnv> = process.env): AppConfig {
    const parsed = EnvSchema.safeParse(env);
    if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => issue.message).join(', ');
        throw new Error(`Invalid environment: ${message}`);
    }
    return parsed.data;
}
