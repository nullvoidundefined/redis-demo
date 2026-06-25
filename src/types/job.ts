/** Types for BullMQ jobs: input data, processing result, and the UI-facing summary shape. */
export type JobType = 'normal' | 'flaky';

export type JobData = {
    type: JobType;
    label: string;
};

export type JobResult = {
    label: string;
    processedAt: string;
};

export type JobSummary = {
    id: string;
    state: string;
    type: JobType;
    label: string;
    attemptsMade: number;
    returnValue: JobResult | null;
    failedReason: string | null;
};
