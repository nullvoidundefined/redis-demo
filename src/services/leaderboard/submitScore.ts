/** Records a player's score in the leaderboard sorted set (higher score ranks higher). */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { LEADERBOARD_KEY } from '@/constants/leaderboard';

export async function submitScore(name: string, score: number): Promise<void> {
    await getRedisClient().zadd(LEADERBOARD_KEY, score, name);
}
