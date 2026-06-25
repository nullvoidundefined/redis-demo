/** Shared module-level storage for the lazily-created Redis singletons, so the
 * lifecycle functions (get/disconnect) coordinate over one source of truth. */
import type Redis from 'ioredis';

export const redisConnections: { client?: Redis; subscriber?: Redis } = {};
