import { runResearch, type ResearchInput } from '@/lib/research/algorithms';
const send = self.postMessage.bind(self) as (message: unknown, transfer?: ArrayBuffer[]) => void;
self.onmessage = (event: MessageEvent<ResearchInput[]>) => {
  try {
    if (!Array.isArray(event.data) || !event.data.length || event.data.length > 16 || event.data.reduce((pixels, input) => pixels + input.width * input.height, 0) > 262144) throw new Error('Research job exceeds its frame/pixel limit.');
    const results = event.data.map(runResearch);
    send({ results }, results.flatMap(r => [r.data.buffer, ...(r.specular ? [r.specular.buffer] : []), ...(r.shadow ? [r.shadow.buffer] : [])]) as ArrayBuffer[]);
  } catch (error) { send({ error: error instanceof Error ? error.message : 'Research preview failed.' }); }
};
