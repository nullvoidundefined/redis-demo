/** Standalone BullMQ worker process. Run with `npm run worker` alongside the
 * Next.js dev server. Processes demo jobs and exposes a health endpoint. */
import { type ConnectionOptions, Worker } from 'bullmq';
import { createServer } from 'node:http';
import { createRedisClient } from './src/clients/redis/createRedisClient';
import { WORKER_PORT } from './src/constants/ports';
import { QUEUE_NAME } from './src/constants/queue';
import { processJob } from './src/services/queue/processJob';

const worker = new Worker(QUEUE_NAME, processJob, {
    connection: createRedisClient({ maxRetriesPerRequest: null }) as unknown as ConnectionOptions,
});

worker.on('completed', (job) => console.log(`completed ${job.id}`));
worker.on('failed', (job, error) => console.log(`failed ${job?.id}: ${error.message}`));

createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
}).listen(WORKER_PORT, () => console.log(`worker health on ${WORKER_PORT}`));
