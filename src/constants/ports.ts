/** Worker health-check port; overridable via WORKER_PORT. */
export const WORKER_PORT = Number(process.env.WORKER_PORT ?? 3002);
