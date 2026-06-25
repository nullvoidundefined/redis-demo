export type RateLimitResult = {
    allowed: boolean;
    remaining: number;
    resetIn: number;
};
