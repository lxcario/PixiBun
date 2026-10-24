import type { Metadata } from 'next';
import { LoopLedgerView } from '@/components/verified/LoopLedgerView';
import { parseLoopLedger } from '@/lib/verified/loopLedger.mjs';
import ledgerJson from '../../../docs/testsprite/loop-ledger.json';
import { parseVerificationStories } from '@/lib/verified/verificationStories.mjs';
import storiesJson from '../../../docs/testsprite/verification-stories.json';

export const metadata: Metadata = {
  title: 'How PixiBun is tested — PixiBun',
  description: 'The small promises behind PixiBun: real TestSprite failures, scoped cloud replays and the progress of our automatic pull request checks.',
};

// Bundled at build time and validated here, so a malformed ledger fails the build rather than the visitor.
const ledger = parseLoopLedger(ledgerJson);
const evidence = parseVerificationStories(storiesJson);

export default function VerifiedPage() {
  return <LoopLedgerView ledger={ledger} evidence={evidence} />;
}
