import type { Page, TestInfo } from '@playwright/test';

/** Observe native transports without replacing their candidates or behavior. */
export async function installPeerDiagnostics(...pages: Page[]) {
  for (const page of pages) await page.addInitScript(() => {
    if (typeof RTCPeerConnection !== 'function') return;
    type Entry = { pc: RTCPeerConnection; events: unknown[]; channels: RTCDataChannel[] };
    const entries: Entry[] = [];
    const target = window as unknown as { peerDiagnostics: Entry[] };
    target.peerDiagnostics = entries;
    const Original = RTCPeerConnection;
    window.RTCPeerConnection = class extends Original {
      constructor(configuration?: RTCConfiguration) {
        super(configuration);
        const entry: Entry = { pc: this, events: [], channels: [] };
        entries.push(entry);
        const observe = (event: Event) => entry.events.push({ event: event.type, at: performance.now(),
          connection: this.connectionState, ice: this.iceConnectionState, gathering: this.iceGatheringState, signaling: this.signalingState,
          ...(typeof RTCPeerConnectionIceErrorEvent === 'function' && event instanceof RTCPeerConnectionIceErrorEvent ? { errorCode: event.errorCode, errorText: event.errorText } : {}),
        });
        for (const name of ['connectionstatechange', 'iceconnectionstatechange', 'icegatheringstatechange', 'signalingstatechange', 'icecandidateerror']) this.addEventListener(name, observe);
        this.addEventListener('datachannel', event => entry.channels.push(event.channel));
      }
      createDataChannel(label: string, options?: RTCDataChannelInit) {
        const channel = super.createDataChannel(label, options);
        entries.find(entry => entry.pc === this)!.channels.push(channel);
        return channel;
      }
    };
  });
}

export async function retainPeerDiagnostics(info: TestInfo, ...pages: Page[]) {
  const observations = await Promise.all(pages.map(async (page, index) => {
    try {
      return { page: index, transports: await page.evaluate(async () => {
        const entries = (window as unknown as { peerDiagnostics?: { pc: RTCPeerConnection; events: unknown[]; channels: RTCDataChannel[] }[] }).peerDiagnostics ?? [];
        return Promise.all(entries.map(async ({ pc, events, channels }) => {
          let stats: unknown[] = [];
          try { stats = [...(await pc.getStats()).values()]; } catch { /* Closed transports may no longer expose stats. */ }
          return { events, connection: pc.connectionState, ice: pc.iceConnectionState, gathering: pc.iceGatheringState,
            localSdp: pc.localDescription?.sdp, remoteSdp: pc.remoteDescription?.sdp, stats,
            channels: channels.map(channel => ({ label: channel.label, state: channel.readyState, bufferedAmount: channel.bufferedAmount })),
          };
        }));
      }) };
    } catch (error) { return { page: index, unavailable: String(error) }; }
  }));
  await info.attach('native-peer-diagnostics', { body: Buffer.from(JSON.stringify(observations, null, 2)), contentType: 'application/json' });
}
