import { mkdir, open, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { ArtistBoundaryError, ARTIST_LIMITS, GHOST_GOAL, type AdapterReply, type ArtistAdapter, type ArtistRequest } from './protocol';

/** A local agent reads the request and writes a JSON reply. No model call or arbitrary code execution. */
export class ConversationAdapter implements ArtistAdapter {
  readonly id = 'local-conversation'; readonly mode = 'conversation' as const;
  constructor(private readonly inbox: string) {}
  quote() { return { tokens: 0, usd: 0 }; }
  async respond(request: { id: string; round: number; phase: 'plan' | 'critique' }, signal: AbortSignal): Promise<AdapterReply> {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(request.id)) throw new ArtistBoundaryError('Unsafe request ID');
    await mkdir(this.inbox, { recursive: true });
    const prefix = `${request.round}-${request.phase}-${request.id}`;
    await writeFile(path.join(this.inbox, `${prefix}.request.json`), JSON.stringify(request, null, 2), { flag: 'wx' });
    const filename = path.join(this.inbox, `${prefix}.reply.json`);
    for (;;) {
      signal.throwIfAborted();
      try {
        const handle = await open(filename, 'r');
        let bytes: Buffer;
        try {
          const bounded = Buffer.alloc(ARTIST_LIMITS.responseBytes + 1);
          const { bytesRead } = await handle.read(bounded, 0, bounded.length, 0);
          if (bytesRead > ARTIST_LIMITS.responseBytes) throw new ArtistBoundaryError('Conversation response too large');
          bytes = bounded.subarray(0, bytesRead);
        } finally { await handle.close(); }
        const envelope: unknown = JSON.parse(bytes.toString('utf8'));
        if (!envelope || typeof envelope !== 'object') throw new ArtistBoundaryError('Invalid conversation envelope');
        const value = envelope as Record<string, unknown>;
        if (Object.keys(value).sort().join() !== 'requestId,value' || value.requestId !== request.id) throw new ArtistBoundaryError('Reply does not match this request');
        return { value: value.value, usage: { tokens: 0, usd: 0 }, provenance: 'Conversation supplied local JSON; external agent token usage is outside this runner.' };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      await pause(250, undefined, { signal });
    }
  }
}
/** Deliberately canned test input. This validates orchestration, never real autonomous creativity. */
export class MockArtistAdapter implements ArtistAdapter {
  readonly id = 'deterministic-pipeline-fixture'; readonly mode = 'mock' as const;
  constructor(private readonly keepCorrecting = false) {}
  quote() { return { tokens: 0, usd: 0 }; }
  async respond(request: ArtistRequest): Promise<AdapterReply> {
    const palette = ['#29233d', '#f4effb', '#ab76cf'];
    const common = { protocol: 1, goalId: GHOST_GOAL.id };
    const value = request.phase === 'critique' ? { ...common,
      decision: this.keepCorrecting || request.round === 0 ? 'correct' : 'accept',
      planning: { meetsGoal: request.round > 0, explanation: request.round === 0 ? 'Fixture starts with one eye; add its partner.' : 'Fixture correction has run.' },
      artistic: { silhouette: 3, eyes: request.round ? 4 : 2, palette: 4, explanation: 'Canned fixture scores; no artistic judgment or model connected.' } }
      : { ...common, palette, rationale: request.round === 0 ? 'Canned rounded outline, fill and one eye for correction coverage.' : 'Canned correction adds the second eye.', commands: request.round === 0 ? [
        { op: 'tool', tool: 'pen' }, { op: 'color', hex: palette[0] },
        { op: 'stroke', points: [{ x: 11, y: 8 }, { x: 13, y: 6 }, { x: 18, y: 6 }, { x: 20, y: 8 }, { x: 22, y: 10 }, { x: 22, y: 23 }, { x: 19, y: 20 }, { x: 16, y: 23 }, { x: 13, y: 20 }, { x: 10, y: 23 }, { x: 10, y: 9 }, { x: 11, y: 8 }] },
        { op: 'tool', tool: 'bucket' }, { op: 'color', hex: palette[1] }, { op: 'stroke', points: [{ x: 16, y: 12 }] },
        { op: 'tool', tool: 'pen' }, { op: 'color', hex: palette[2] }, { op: 'stroke', points: [{ x: 13, y: 12 }, { x: 13, y: 14 }] },
      ] : [{ op: 'tool', tool: 'pen' }, { op: 'color', hex: palette[2] }, { op: 'stroke', points: [{ x: 19, y: 12 }, { x: 19, y: 14 }] }] };
    return { value, usage: { tokens: 0, usd: 0 }, provenance: 'Deterministic mock fixture; no external model or paid service.' };
  }
}
