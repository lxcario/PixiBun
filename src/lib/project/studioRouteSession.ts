import type { RestoreLifecycleState } from '@/lib/recovery/projectAdmission';

export interface StudioResume {
  projectId: string;
  storageVersions: Map<string, string>;
  lifecycle: RestoreLifecycleState;
  conflictProjectId: string | null;
  error?: string;
  checkpoint?: Promise<StudioResume>;
}

export interface StudioRouteSession {
  projectId: string;
  checkpoint: () => Promise<StudioResume>;
  resume: () => StudioResume;
}

// One route handoff, not a project cache. No pixels or native handles live here.
let lastStudio: StudioRouteSession | null = null;
let resumeTicket: StudioResume | null = null;

export function registerStudioRouteSession(session: StudioRouteSession): void {
  lastStudio = session;
  if (resumeTicket?.projectId === session.projectId) resumeTicket = null;
}

export function getStudioRouteSession(projectId: string): StudioRouteSession | null {
  return lastStudio?.projectId === projectId ? lastStudio : null;
}

export function setStudioResume(ticket: StudioResume | null): void {
  resumeTicket = ticket;
}

// Keep the ticket through Strict Mode's setup/cleanup probe. Registration of the
// resumed, active Studio clears it after startup has completed.
export function getStudioResume(projectId: string): StudioResume | null {
  return resumeTicket?.projectId === projectId ? resumeTicket : null;
}

export const PRACTICE_RETURN_KEY = 'pixibun:practice-return-project';
export function getPracticeReturnProject(): string | null {
  try {
    const id = sessionStorage.getItem(PRACTICE_RETURN_KEY);
    return id && id.length <= 1024 && id.trim() === id ? id : null;
  } catch { return null; }
}
export function clearPracticeReturnProject(): void {
  try { sessionStorage.removeItem(PRACTICE_RETURN_KEY); } catch { /* Browser storage can be restricted. */ }
}
