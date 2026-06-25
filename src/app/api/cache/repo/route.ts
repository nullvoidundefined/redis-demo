/** Cache demo endpoint: GET reads through the cache, DELETE invalidates it. */
import { getCachedRepo } from '@/services/cache/getCachedRepo';
import { invalidateCachedRepo } from '@/services/cache/invalidateCachedRepo';

function readName(request: Request): string | null {
    return new URL(request.url).searchParams.get('name');
}

export async function GET(request: Request) {
    const name = readName(request);
    if (!name) {
        return Response.json({ error: 'name is required' }, { status: 400 });
    }
    return Response.json(await getCachedRepo(name));
}

export async function DELETE(request: Request) {
    const name = readName(request);
    if (!name) {
        return Response.json({ error: 'name is required' }, { status: 400 });
    }
    await invalidateCachedRepo(name);
    return Response.json({ cleared: true });
}
