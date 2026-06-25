/** Types for the session-store demo: the stored record shape and the full view returned to callers. */

export type SessionRecord = {
    label: string;
    createdAt: string;
};

export type SessionView = {
    token: string;
    data: SessionRecord;
    ttl: number;
};
