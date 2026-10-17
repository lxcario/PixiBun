import type { Metadata } from 'next';
import { LoopLedgerView } from '@/components/verified/LoopLedgerView';
import { parseLoopLedger } from '@/lib/verified/loopLedger.mjs';
import ledgerJson from '../../../docs/testsprite/loop-ledger.json';

export const metadata: Metadata = {
  title: 'How PixiBun is tested — PixiBun',
  description: 'Every pull request deploys a preview and TestSprite checks it before it merges. The ledger lists each run, what failed and the fix.',
};

// Bundled at build time and validated here, so a malformed ledger fails the build rather than the visitor.
const ledger = parseLoopLedger(ledgerJson);

export default function VerifiedPage() {
  return <LoopLedgerView ledger={ledger} />;
}
