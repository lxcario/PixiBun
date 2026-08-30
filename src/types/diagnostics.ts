export type DiagnosticKind = 'error' | 'web-vital' | 'unhandled-rejection';

export interface DiagnosticEntry {
  id: string; // from createId('diag')
  kind: DiagnosticKind;
  timestamp: number;
  message: string; // error.message or vital name
  detail?: string; // stack (truncated to 2KB) or vital metric JSON
  route: string; // pathname at capture time
  appVersion: string; // from package.json / next build id
}

export interface DiagnosticsSettings {
  enabled: boolean; // local capture; default TRUE (local-only is not telemetry)
  relayOptIn: boolean; // default FALSE — sending anything off-device requires this
}

export type PwaUpdateState = 'idle' | 'downloading' | 'ready';
