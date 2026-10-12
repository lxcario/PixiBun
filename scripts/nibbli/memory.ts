import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

export type Verdict = 'passed' | 'failed' | 'inconclusive';
export type FailureOwner = 'controller' | 'product' | 'test' | 'unknown';
export interface MemoryEvent {
  id: string; time: string; kind: string; [key: string]: unknown;
}

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Each run has a fresh directory; events and captures are never recycled. */
export class NibbliMemory {
  private events: MemoryEvent[] = [];
  private finished = false;
  private sequence = 0;
  private artifacts: { file: string; bytes: number; sha256: string }[] = [];
  private constructor(public readonly directory: string) {}

  static async create(root: string, metadata: Record<string, unknown>): Promise<NibbliMemory> {
    const directory = path.join(root, `attempt-${randomUUID()}`);
    await mkdir(directory, { recursive: true });
    const memory = new NibbliMemory(directory);
    await memory.event('run-start', { metadata, learning: 'Recorded experience; no model training or automatic strategy approval.' });
    return memory;
  }

  async event(kind: string, details: Record<string, unknown> = {}): Promise<string> {
    if (this.finished) throw new Error('A completed Nibbli record cannot be changed.');
    if (details.correctionOf !== undefined && !this.events.some(event => event.id === details.correctionOf)) {
      throw new Error('A correction must reference an existing event in this run.');
    }
    const event: MemoryEvent = { ...details, id: `${++this.sequence}`, time: new Date().toISOString(), kind };
    this.events.push(event);
    await appendFile(path.join(this.directory, 'events.jsonl'), JSON.stringify(event) + '\n');
    return event.id;
  }

  async artifact(name: string, bytes: string | Uint8Array): Promise<string> {
    if (this.finished || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) throw new Error('Invalid evidence destination.');
    await writeFile(path.join(this.directory, name), bytes, { flag: 'wx' });
    const data = typeof bytes === 'string' ? Buffer.from(bytes) : bytes;
    this.artifacts.push({ file: name, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
    return name;
  }

  /** Observations need attributable evidence; hypotheses remain explicitly unverified. */
  async observation(summary: string, evidence: string[], correctionOf?: string) {
    const recorded = new Set(this.events.map(event => event.id));
    if (!evidence.length || evidence.some(id => !recorded.has(id)) || (correctionOf && !recorded.has(correctionOf))) {
      throw new Error('Observations and corrections must reference this run\'s existing evidence.');
    }
    return this.event('observation', { summary, evidence, correctionOf, strategyStatus: 'candidate-needs-review' });
  }

  async finish(verdict: Verdict, details: Record<string, unknown> = {}) {
    await this.event('run-finish', { verdict, ...details });
    const journal = await readFile(path.join(this.directory, 'events.jsonl'));
    this.artifacts.push({ file: 'events.jsonl', bytes: journal.length, sha256: createHash('sha256').update(journal).digest('hex') });
    await this.artifact('report.json', JSON.stringify({ schema: 1, verdict, events: this.events, artifacts: this.artifacts }, null, 2));
    const rows = this.events.map(event => `<tr><td>${escape(event.id)}</td><td>${escape(event.kind)}</td><td><pre>${escape(JSON.stringify(event, null, 2))}</pre></td></tr>`).join('');
    const media = this.artifacts.map(item => item.file.endsWith('.webm')
      ? `<figure><video controls preload="metadata" src="${escape(item.file)}"></video><figcaption>${escape(item.file)} · actual browser preview session</figcaption></figure>`
      : item.file.endsWith('.png')
      ? `<figure><a href="${escape(item.file)}"><img loading="lazy" src="${escape(item.file)}" alt="${escape(item.file)}"></a><figcaption>${escape(item.file)}</figcaption></figure>`
      : `<p><a href="${escape(item.file)}">${escape(item.file)}</a></p>`).join('');
    const assessment = ['functional', 'artistic'].map(key => details[key] === undefined ? ''
      : `<h2>${key === 'functional' ? 'Functional correctness' : 'Artistic quality'}</h2><pre>${escape(JSON.stringify(details[key], null, 2))}</pre>`).join('');
    await this.artifact('report.html', `<!doctype html><html lang="en"><meta charset="utf-8"><title>Nibbli — ${escape(verdict)}</title><style>body{font:16px system-ui;background:#181322;color:#f1edf8;margin:2rem;max-width:1100px}a{color:#dcc18e}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}td{vertical-align:top;padding:8px;border-bottom:1px solid #51475c}img,video{max-width:100%;max-height:480px}img{image-rendering:pixelated}figure{margin:20px 0}table{width:100%}</style><h1>Nibbli · ${escape(verdict)}</h1><p>Functional evidence and artistic observations are separate. Recorded experience does not train a model.</p>${assessment}${media}<h2>Every action and attempt</h2><table>${rows}</table></html>`);
    await writeFile(path.join(this.directory, 'manifest.json'), JSON.stringify({ schema: 1, artifacts: this.artifacts }, null, 2), { flag: 'wx' });
    this.finished = true;
  }

  static async readEvents(directory: string): Promise<MemoryEvent[]> {
    return (await readFile(path.join(directory, 'events.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  }
}
