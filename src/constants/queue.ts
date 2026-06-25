/** BullMQ queue identifiers, retry policy, and result-record namespace. */
export const QUEUE_NAME = 'demo-jobs';
export const JOB_NAME = 'process';
export const JOB_ATTEMPTS = 3;
export const BACKOFF_DELAY_MS = 1000;
export const RESULT_KEY_PREFIX = 'job:result:';
export const RESULT_TTL_SECONDS = 300;
