'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import type { P2PSyncSession, P2PConnectionState } from '@/lib/sync/p2pSync';
import { coDrawBridge, type CoDrawStartOptions } from '@/lib/sync/coDrawBridge';
import { studioEvents } from '@/lib/events/studioEvents';

interface CoDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinGuest: (invite: string, options: CoDrawStartOptions, signal: AbortSignal) => Promise<string>;
  activeSession?: P2PSyncSession | null;
  onSessionCreated?: (session: P2PSyncSession) => void;
}

export const CoDrawModal: React.FC<CoDrawModalProps> = ({
  isOpen,
  onClose,
  onJoinGuest,
  activeSession,
}) => {
  const [tab, setTab] = useState<'host' | 'join'>(() => coDrawBridge.getRole() === 'guest' ? 'join' : 'host');
  const [session, setSession] = useState<P2PSyncSession | null>(activeSession ?? null);
  const [connectionState, setConnectionState] = useState<P2PConnectionState>(
    activeSession?.getState() ?? 'idle'
  );
  const [networkMode, setNetworkMode] = useState<'internet' | 'lan'>('lan');

  const [inviteToken, setInviteToken] = useState<string>('');
  const [guestAnswerToken, setGuestAnswerToken] = useState<string>('');
  const [inputToken, setInputToken] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'pending' | 'copied' | 'failed'>('idle');
  const copyRequestRef = useRef(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inviteFieldRef = useRef<HTMLTextAreaElement>(null);
  const answerFieldRef = useRef<HTMLTextAreaElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const joinAbortRef = useRef<AbortController | null>(null);

  const handleClose = () => {
    copyRequestRef.current += 1;
    joinAbortRef.current?.abort();
    onClose();
  };

  // The bridge is a module singleton, so a session outlives this modal being
  // closed and reopened. Subscribe to connection-state changes and rehydrate
  // the visible state from the live session on mount.
  useEffect(() => {
    setConnectionState(coDrawBridge.getConnectionState());
    setSession(coDrawBridge.getSession());
    const unsub = studioEvents.on('pixibun:codraw-state', (state) => {
      setConnectionState(state);
    });
    const unsubError = studioEvents.on('pixibun:codraw-error', setErrorMsg);
    return () => { joinAbortRef.current?.abort(); unsub(); unsubError(); };
  }, []);

  useEffect(() => { if (!isOpen) joinAbortRef.current?.abort(); }, [isOpen]);

  useEffect(() => {
    setCopyStatus('idle');
    return () => {
      // A late clipboard promise must not update a different code or reopened modal.
      copyRequestRef.current += 1;
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    };
  }, [isOpen, tab, inviteToken, guestAnswerToken, connectionState]);

  const handleCreateHostSession = async () => {
    setErrorMsg(null);
    try {
      const token = await coDrawBridge.startHost({ lanOnly: networkMode === 'lan' });
      setSession(coDrawBridge.getSession());
      setInviteToken(token);
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleCompleteHostConnection = async () => {
    if (!session || !inputToken.trim()) return;
    setErrorMsg(null);
    try {
      await session.completeHostConnection(inputToken.trim());
      setInputToken('');
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleJoinSession = async () => {
    if (!inputToken.trim() || joinAbortRef.current) return;
    const controller = new AbortController();
    joinAbortRef.current = controller;
    setJoining(true);
    setErrorMsg(null);
    try {
      const answer = await onJoinGuest(inputToken.trim(), {
        lanOnly: networkMode === 'lan',
      }, controller.signal);
      if (controller.signal.aborted) return;
      setSession(coDrawBridge.getSession());
      setGuestAnswerToken(answer);
      setInputToken('');
    } catch (err) {
      if (!controller.signal.aborted) setErrorMsg((err as Error).message);
    } finally {
      if (joinAbortRef.current === controller) joinAbortRef.current = null;
      if (!controller.signal.aborted) setJoining(false);
    }
  };

  const handleCopy = async (text: string, field: HTMLTextAreaElement | null) => {
    const request = ++copyRequestRef.current;
    if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    setCopyStatus('pending');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (request !== copyRequestRef.current) return;
      setCopyStatus('copied');
      copyTimerRef.current = setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      if (request !== copyRequestRef.current) return;
      setCopyStatus('failed');
      field?.focus();
      field?.select();
    }
  };

  const handleDisconnect = () => {
    joinAbortRef.current?.abort();
    joinAbortRef.current = null;
    setJoining(false);
    coDrawBridge.disconnect();
    setSession(null);
    setConnectionState('idle');
    setInviteToken('');
    setGuestAnswerToken('');
    setInputToken('');
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose} title="Peer-to-Peer Co-Draw" maxWidth="w-[520px]">
      <div className="flex flex-col gap-3 font-mono text-xs">
        {/* Status Header */}
        <div className="flex items-center justify-between bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-[var(--accent-sage)] animate-pulse'
                  : connectionState === 'connecting' || connectionState === 'waiting-for-answer'
                  ? 'bg-[#ebcb8b] animate-pulse'
                  : 'bg-[var(--text-muted)]'
              }`}
            />
            <span className="font-bold capitalize text-[var(--text-heading)]">
              Status: {connectionState === 'connected' ? 'Connected' : connectionState === 'connecting' ? 'Connecting…' : connectionState === 'waiting-for-answer' ? 'Waiting for partner…' : 'Not connected'}
            </span>
          </div>

          {session && (
            <span className="text-[10px] text-[var(--text-body)]">
              Peer ID: <code className="text-[var(--accent-gold)]">{session.peerId.slice(0, 8)}</code>
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="bg-[#4c1d1d] text-[var(--danger-fg)] p-2.5 rounded-[2px] border border-[var(--danger-border)]/40 text-xs">
            {errorMsg}
          </div>
        )}

        {connectionState === 'connected' ? (
          <div className="flex flex-col gap-3 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--accent-sage)]">
            <p className="text-[var(--text-body)] leading-relaxed">
              <strong className="text-[var(--accent-sage)]">Connected!</strong> You are drawing live together in real time. Remote strokes appear instantly.


            </p>
            <p className="text-[10px] text-[var(--accent-gold)] leading-relaxed">
              Session role: The host manages project frames and layers. Guests paint freely on the active layers.

            </p>
            <div className="flex justify-end pt-2">
              <TactileButton
                size="sm"
                variant="default"
                onClick={handleDisconnect}
                className="bg-[#3e1414] text-[var(--danger-fg)] border-[#8c2020] hover:bg-[#5a1c1c]"
              >
                Disconnect Session
              </TactileButton>
            </div>
          </div>
        ) : (
          <>
            {/* Network Mode Switch */}
            <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border-2 border-[var(--desk-border)]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-heading)]">P2P Routing Mode:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={joining || connectionState !== 'idle'}
                    onClick={() => setNetworkMode('internet')}
                    className={`px-2 py-1 rounded-[2px] font-bold cursor-pointer transition-colors ${
                      networkMode === 'internet'
                        ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)]'
                        : 'text-[var(--text-body)] hover:text-[var(--accent-gold)]'
                    }`}
                  >
                    Internet (STUN)
                  </button>
                  <button
                    type="button"
                    disabled={joining || connectionState !== 'idle'}
                    onClick={() => setNetworkMode('lan')}
                    className={`px-2 py-1 rounded-[2px] font-bold cursor-pointer transition-colors ${
                      networkMode === 'lan'
                        ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)]'
                        : 'text-[var(--text-body)] hover:text-[var(--accent-sage)]'
                    }`}
                  >
                    Local LAN (Zero-Egress)
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                {networkMode === 'internet'
                  ? 'Uses Google STUN for cross-network NAT traversal. Zero canvas pixels ever touch external servers.'
                  : 'Fully local & offline-capable. Both peers share the same local Wi-Fi or hotspot with zero STUN egress.'}
              </p>
            </div>

            {/* Host / Join Tabs */}
            <div className="flex gap-1 bg-[var(--desk-surface)] p-1 rounded-[2px] border-2 border-[var(--desk-border)]">
              <button
                disabled={joining || !!session}
                onClick={() => {
                  setTab('host');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 rounded-[2px] font-bold transition-colors cursor-pointer ${
                  tab === 'host'
                    ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] shadow-xs'
                    : 'text-[var(--text-body)] hover:text-[var(--accent-gold)]'
                }`}
              >
                Host Session
              </button>
              <button
                disabled={joining || !!session}
                onClick={() => {
                  setTab('join');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 rounded-[2px] font-bold transition-colors cursor-pointer ${
                  tab === 'join'
                    ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] shadow-xs'
                    : 'text-[var(--text-body)] hover:text-[var(--accent-gold)]'
                }`}
              >
                Join Session
              </button>
            </div>

            {/* Host Tab Content */}
            {tab === 'host' && (
              <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)]">
                {!inviteToken ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[var(--text-body)] leading-relaxed">
                      Host an accountless, serverless co-drawing session directly from your browser.
                      Your canvas — layers, frames and strokes — is shared with your peer.
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Session limit: 262,144 total layer pixels and 32,000 painted pixels at join.
                    </p>
                    <TactileButton
                      size="sm"
                      variant="primary"
                      onClick={handleCreateHostSession}
                      disabled={!!session || joining}
                      className="bg-[var(--primary-bg)] text-[var(--primary-fg)] border-2 border-[var(--ink)] font-bold mt-1"
                    >
                      <PixelIcon name="export" size={12} />
                      <span>Generate Invite Code</span>
                    </TactileButton>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-[var(--text-body)]">1. Copy your Invite Code:</span>
                    <div className="flex gap-1.5">
                      <textarea
                        ref={inviteFieldRef}
                        readOnly
                        aria-label="Generated invite code"
                        value={inviteToken}
                        rows={3}
                        className="flex-1 bg-[var(--surface-0)] text-[10px] text-[var(--text-heading)] p-2 rounded-[2px] border border-[var(--desk-border)] font-mono resize-none select-all"
                      />
                      <TactileButton
                        size="sm"
                        variant="default"
                        onClick={() => void handleCopy(inviteToken, inviteFieldRef.current)}
                        disabled={copyStatus === 'pending'}
                        className="self-start px-2 py-1 text-xs"
                      >
                        {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'pending' ? 'Copying…' : 'Copy'}
                      </TactileButton>
                    </div>

                    {copyStatus === 'failed' && <p role="alert">Couldn’t copy the code. Select the code above and copy it manually.</p>}
                    {copyStatus === 'copied' && <span role="status" className="sr-only">Invite code copied.</span>}

                    <span className="font-bold text-[var(--text-body)] pt-2 border-t border-[var(--desk-border)]">
                      2. Paste Peer&apos;s Answer Token:
                    </span>
                    <div className="flex gap-1.5">
                      <textarea
                        aria-label="Peer answer token input"
                        placeholder="Paste peer's answer token here..."
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        rows={2}
                        className="flex-1 bg-[var(--surface-0)] text-[10px] text-[var(--text-heading)] p-2 rounded-[2px] border border-[var(--desk-border)] font-mono resize-none focus:border-[var(--accent-gold)] outline-none"
                      />
                      <TactileButton
                        size="sm"
                        variant="primary"
                        disabled={!inputToken.trim()}
                        onClick={handleCompleteHostConnection}
                        className="self-start px-2 py-1 text-xs bg-[var(--primary-bg)] text-[var(--primary-fg)] font-bold"
                      >
                        Connect
                      </TactileButton>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Join Tab Content */}
            {tab === 'join' && (
              <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)]">
                {!guestAnswerToken ? (
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-[var(--text-body)]">1. Paste Host&apos;s Invite Code:</span>
                    <textarea
                      aria-label="Host invite code input"
                      disabled={joining}
                      placeholder="Paste host's invite code here..."
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      rows={3}
                      className="bg-[var(--surface-0)] text-[10px] text-[var(--text-heading)] p-2 rounded-[2px] border border-[var(--desk-border)] font-mono resize-none focus:border-[var(--accent-gold)] outline-none"
                    />
                    <p className="text-[var(--text-body)] leading-relaxed">
                      Your current drawing will be saved in Gallery. The shared artwork opens as a separate
                      drawing, with its own autosave. After disconnecting, you can keep it or reopen your original from Gallery.
                    </p>
                    <TactileButton
                      size="sm"
                      variant="primary"
                      disabled={joining || !inputToken.trim() || !!session}
                      onClick={handleJoinSession}
                      className="bg-[var(--primary-bg)] text-[var(--primary-fg)] border-2 border-[var(--ink)] font-bold self-end"
                    >
                      {joining ? 'Saving & preparing…' : 'Save My Drawing & Join Separately'}
                    </TactileButton>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-[var(--text-body)]">2. Send this Answer Token back to Host:</span>
                    <div className="flex gap-1.5">
                      <textarea
                        ref={answerFieldRef}
                        readOnly
                        aria-label="Generated answer token"
                        value={guestAnswerToken}
                        rows={4}
                        className="flex-1 bg-[var(--surface-0)] text-[10px] text-[var(--text-heading)] p-2 rounded-[2px] border border-[var(--desk-border)] font-mono resize-none select-all"
                      />
                      <TactileButton
                        size="sm"
                        variant="default"
                        onClick={() => void handleCopy(guestAnswerToken, answerFieldRef.current)}
                        disabled={copyStatus === 'pending'}
                        className="self-start px-2 py-1 text-xs"
                      >
                        {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'pending' ? 'Copying…' : 'Copy'}
                      </TactileButton>
                    </div>
                    {copyStatus === 'failed' && <p role="alert">Couldn’t copy the code. Select the code above and copy it manually.</p>}
                    {copyStatus === 'copied' && <span role="status" className="sr-only">Answer token copied.</span>}
                    <p className="text-[10px] text-[var(--accent-gold)] pt-1">
                      Waiting for host to apply your answer token. Your original is saved in Gallery;
                      the shared drawing will receive the host&apos;s artwork and save separately.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end pt-2 border-t border-[var(--desk-border)]">
          {(joining || (session && connectionState !== 'connected')) && (
            <TactileButton size="sm" variant="default" onClick={handleDisconnect}>
              Cancel Session
            </TactileButton>
          )}
          <TactileButton
            size="sm"
            variant="default"
            onClick={handleClose}
            className="bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]"
          >
            Close
          </TactileButton>
        </div>
      </div>
    </ModalWrapper>
  );
};
