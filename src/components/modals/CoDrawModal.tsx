'use client';

import React, { useState, useEffect } from 'react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import type { P2PSyncSession, P2PConnectionState } from '@/lib/sync/p2pSync';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { studioEvents } from '@/lib/events/studioEvents';

interface CoDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession?: P2PSyncSession | null;
  onSessionCreated?: (session: P2PSyncSession) => void;
}

export const CoDrawModal: React.FC<CoDrawModalProps> = ({
  isOpen,
  onClose,
  activeSession,
}) => {
  const [tab, setTab] = useState<'host' | 'join'>('host');
  const [session, setSession] = useState<P2PSyncSession | null>(activeSession ?? null);
  const [connectionState, setConnectionState] = useState<P2PConnectionState>(
    activeSession?.getState() ?? 'idle'
  );
  const [networkMode, setNetworkMode] = useState<'internet' | 'lan'>('lan');

  const [inviteToken, setInviteToken] = useState<string>('');
  const [guestAnswerToken, setGuestAnswerToken] = useState<string>('');
  const [inputToken, setInputToken] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    return () => { unsub(); unsubError(); };
  }, []);

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
    if (!inputToken.trim()) return;
    setErrorMsg(null);
    try {
      const answer = await coDrawBridge.startGuest(inputToken.trim(), {
        lanOnly: networkMode === 'lan',
      });
      setSession(coDrawBridge.getSession());
      setGuestAnswerToken(answer);
      setInputToken('');
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    coDrawBridge.disconnect();
    setSession(null);
    setConnectionState('idle');
    setInviteToken('');
    setGuestAnswerToken('');
    setInputToken('');
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Peer-to-Peer Co-Draw" maxWidth="w-[520px]">
      <div className="flex flex-col gap-3 font-mono text-xs">
        {/* Status Header */}
        <div className="flex items-center justify-between bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-[#a3be8c] animate-pulse'
                  : connectionState === 'connecting' || connectionState === 'waiting-for-answer'
                  ? 'bg-[#ebcb8b] animate-pulse'
                  : 'bg-[var(--text-muted)]'
              }`}
            />
            <span className="font-bold capitalize text-[var(--text-heading)]">
              Status: {connectionState.replace(/-/g, ' ')}
            </span>
          </div>

          {session && (
            <span className="text-[10px] text-[var(--text-body)]">
              Peer ID: <code className="text-[#f0be7c]">{session.peerId.slice(0, 8)}</code>
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="bg-[#4c1d1d] text-[#ff8080] p-2.5 rounded-[2px] border border-[#ff8080]/40 text-xs">
            {errorMsg}
          </div>
        )}

        {connectionState === 'connected' ? (
          <div className="flex flex-col gap-3 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[#a3be8c]">
            <p className="text-[var(--text-body)] leading-relaxed">
              <strong className="text-[#a3be8c]">Direct P2P Connection Established!</strong> Strokes
              and cursors now sync in real time over dual WebRTC data channels with Strong Eventual
              Consistency (SEC). Remote strokes are merged per-pixel via a Last-Write-Wins CRDT.
            </p>
            <p className="text-[10px] text-[#ebcb8b] leading-relaxed">
              Note: the host owns the layer structure while connected — layer/frame changes made by
              the guest stay local.
            </p>
            <div className="flex justify-end pt-2">
              <TactileButton
                size="sm"
                variant="default"
                onClick={handleDisconnect}
                className="bg-[#3e1414] text-[#ff8080] border-[#8c2020] hover:bg-[#5a1c1c]"
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
                    disabled={connectionState !== 'idle'}
                    onClick={() => setNetworkMode('internet')}
                    className={`px-2 py-1 rounded-[2px] font-bold cursor-pointer transition-colors ${
                      networkMode === 'internet'
                        ? 'bg-[#f0be7c] text-[#140d1f]'
                        : 'text-[var(--text-body)] hover:text-[#f0be7c]'
                    }`}
                  >
                    Internet (STUN)
                  </button>
                  <button
                    type="button"
                    disabled={connectionState !== 'idle'}
                    onClick={() => setNetworkMode('lan')}
                    className={`px-2 py-1 rounded-[2px] font-bold cursor-pointer transition-colors ${
                      networkMode === 'lan'
                        ? 'bg-[#a3be8c] text-[#140d1f]'
                        : 'text-[var(--text-body)] hover:text-[#a3be8c]'
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
                onClick={() => {
                  setTab('host');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 rounded-[2px] font-bold transition-colors cursor-pointer ${
                  tab === 'host'
                    ? 'bg-[#f0be7c] text-[#140d1f] shadow-xs'
                    : 'text-[var(--text-body)] hover:text-[#f0be7c]'
                }`}
              >
                Host Session
              </button>
              <button
                onClick={() => {
                  setTab('join');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 rounded-[2px] font-bold transition-colors cursor-pointer ${
                  tab === 'join'
                    ? 'bg-[#f0be7c] text-[#140d1f] shadow-xs'
                    : 'text-[var(--text-body)] hover:text-[#f0be7c]'
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
                      className="bg-[#f0be7c] text-[#140d1f] border-2 border-[#8c5120] font-bold mt-1"
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
                        readOnly
                        aria-label="Generated invite code"
                        value={inviteToken}
                        rows={3}
                        className="flex-1 bg-[#181124] text-[10px] text-[var(--text-heading)] p-2 rounded-[2px] border border-[var(--desk-border)] font-mono resize-none select-all"
                      />
                      <TactileButton
                        size="sm"
                        variant="default"
                        onClick={() => handleCopy(inviteToken)}
                        className="self-start px-2 py-1 text-xs"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </TactileButton>
                    </div>

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
                        className="flex-1 bg-[#181124] text-[10px] text-[var(--text-heading)] p-2 rounded-[2px] border border-[var(--desk-border)] font-mono resize-none focus:border-[#f0be7c] outline-none"
                      />
                      <TactileButton
                        size="sm"
                        variant="primary"
                        disabled={!inputToken.trim()}
                        onClick={handleCompleteHostConnection}
                        className="self-start px-2 py-1 text-xs bg-[#f0be7c] text-[#140d1f] font-bold"
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
                      placeholder="Paste host's invite code here..."
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      rows={3}
                      className="bg-[#181124] text-[10px] text-[var(--text-heading)] p-2 rounded-[2px] border border-[var(--desk-border)] font-mono resize-none focus:border-[#f0be7c] outline-none"
                    />
                    <TactileButton
                      size="sm"
                      variant="primary"
                      disabled={!inputToken.trim()}
                      onClick={handleJoinSession}
                      className="bg-[#f0be7c] text-[#140d1f] border-2 border-[#8c5120] font-bold self-end"
                    >
                      Accept & Generate Answer
                    </TactileButton>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-[var(--text-body)]">2. Send this Answer Token back to Host:</span>
                    <div className="flex gap-1.5">
                      <textarea
                        readOnly
                        aria-label="Generated answer token"
                        value={guestAnswerToken}
                        rows={4}
                        className="flex-1 bg-[#181124] text-[10px] text-[var(--text-heading)] p-2 rounded-[2px] border border-[var(--desk-border)] font-mono resize-none select-all"
                      />
                      <TactileButton
                        size="sm"
                        variant="default"
                        onClick={() => handleCopy(guestAnswerToken)}
                        className="self-start px-2 py-1 text-xs"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </TactileButton>
                    </div>
                    <p className="text-[10px] text-[#ebcb8b] pt-1">
                      Waiting for host to apply your answer token... Once connected, your canvas will
                      be replaced with the host&apos;s artwork and stay in sync automatically.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end pt-2 border-t border-[var(--desk-border)]">
          <TactileButton
            size="sm"
            variant="default"
            onClick={onClose}
            className="bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            Close
          </TactileButton>
        </div>
      </div>
    </ModalWrapper>
  );
};
