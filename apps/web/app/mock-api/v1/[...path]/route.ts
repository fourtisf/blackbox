import { IS_DEMO } from '@/lib/config';
import { handleMock } from '@/lib/mock/handlers';
import { createFeed } from '@/lib/mock/store';

export const dynamic = 'force-dynamic';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  if (!IS_DEMO) return json(404, { error: { code: 'not_found', message: 'The demo API is off.' } });
  const path = params.path;

  // Live feed over Server-Sent Events, like GET /v1/feed/live on the real API.
  if (path[0] === 'feed' && path[1] === 'live') {
    const feed = createFeed();
    const enc = new TextEncoder();
    let timer: ReturnType<typeof setInterval> | undefined;
    let beat: ReturnType<typeof setInterval> | undefined;
    const stream = new ReadableStream({
      start(controller) {
        const send = (s: string) => {
          try {
            controller.enqueue(enc.encode(s));
          } catch {
            clearInterval(timer);
            clearInterval(beat);
          }
        };
        send(': connected\n\n');
        timer = setInterval(() => send(`event: seal\ndata: ${JSON.stringify(feed.next())}\n\n`), 3000);
        beat = setInterval(() => send(': heartbeat\n\n'), 15000);
        req.signal.addEventListener('abort', () => {
          clearInterval(timer);
          clearInterval(beat);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
      },
      cancel() {
        clearInterval(timer);
        clearInterval(beat);
      },
    });
    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      },
    });
  }
  if (path[0] === 'feed' && path[1] === 'recent') return json(200, { items: createFeed().recent });

  const { status, body } = handleMock(path, new URL(req.url).searchParams);
  return json(status, body);
}
