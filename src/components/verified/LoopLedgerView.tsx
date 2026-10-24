import Link from 'next/link';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';
import {
  LEDGER_MARKDOWN_PATH,
  REPO_URL,
  describeFailure,
  orderedEntries,
  summarizeLoopLedger,
} from '@/lib/verified/loopLedger.mjs';
import type { LedgerEntry, LoopLedger, Verdict } from '@/lib/verified/loopLedger.mjs';
import type { VerificationStories as Stories } from '@/lib/verified/verificationStories.mjs';
import { VerificationStories } from './VerificationStories';

export const README_SECTION_URL = `${REPO_URL}#tested-on-every-pull-request`;
export const LEDGER_MARKDOWN_URL = `${REPO_URL}/blob/main/${LEDGER_MARKDOWN_PATH}`;

const LOOP_STEPS = [
  { title: 'Pull request', body: 'Every change opens a pull request against main.' },
  { title: 'Preview', body: 'That exact branch deploys to its own preview URL.' },
  { title: 'TestSprite check', body: 'TestSprite’s cloud browser runs the suite against the preview and reports a status check on the PR.' },
  { title: 'Fix', body: 'A red check comes with a failure bundle. We fix the root cause, never a correct assertion, and push.' },
  { title: 'Green', body: 'The check reruns on the new commit. A pull request merges only on green.' },
];

const VERDICT_LABEL: Record<Verdict, string> = { passed: 'Passed', failed: 'Failed', pending: 'Pending' };
const VERDICT_MARK: Record<Verdict, string> = {
  passed: 'bg-[var(--accent-sage)]',
  failed: 'bg-[var(--state-danger)]',
  pending: 'bg-[var(--accent-gold)]',
};

const LINK = 'text-[var(--accent-gold)] underline underline-offset-4 hover:opacity-80';
const CARD = 'bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px]';

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function Stat({ label, value, hint, testId }: { label: string; value: string; hint: string; testId: string }) {
  return (
    <div className={`${CARD} p-4 sm:p-5 flex flex-col gap-1`} data-testid={testId}>
      <dt className="font-mono text-xs uppercase tracking-wider text-[var(--text-body)]">{label}</dt>
      <dd className="font-display text-3xl text-[var(--text-heading)]">{value}</dd>
      <dd className="text-sm leading-snug text-[var(--text-body)]">{hint}</dd>
    </div>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  return (
    <tr className="border-t-2 border-[var(--desk-border)] align-top" data-testid="loop-ledger-row">
      <th scope="row" className="p-3 text-left font-normal">
        <a href={entry.prUrl} className={`${LINK} font-mono`}>#{entry.pr}</a>
        <span className="block text-[var(--text-heading)]">{entry.title}</span>
        <span className="block font-mono text-xs text-[var(--text-body)]">
          <time dateTime={entry.checkedOn}>{formatDate(entry.checkedOn)}</time>
        </span>
      </th>
      <td className="p-3">
        <a href={entry.testspriteRunUrl} className={LINK} aria-label={`TestSprite run for pull request ${entry.pr}`}>Run</a>
      </td>
      <td className="p-3 text-[var(--text-body)]">
        {entry.failures.length ? (
          <ul className="flex flex-col gap-1 list-none p-0 m-0">
            {entry.failures.map((failure, index) => <li key={index}>{describeFailure(failure)}</li>)}
          </ul>
        ) : (
          'Nothing; green on the first run'
        )}
      </td>
      <td className="p-3 font-mono">
        {entry.fixCommit ? (
          <a href={`${REPO_URL}/commit/${entry.fixCommit}`} className={LINK} aria-label={`Fixing commit ${entry.fixCommit.slice(0, 7)}`}>
            {entry.fixCommit.slice(0, 7)}
          </a>
        ) : (
          <span aria-label="No fixing commit">—</span>
        )}
      </td>
      <td className="p-3">
        <span className="inline-flex items-center gap-2 font-mono text-[var(--text-heading)]">
          <span aria-hidden="true" className={`w-2.5 h-2.5 ${VERDICT_MARK[entry.verdict]}`} />
          {VERDICT_LABEL[entry.verdict]}
        </span>
      </td>
    </tr>
  );
}

/** The /verified page body, given an already-validated ledger. */
export function LoopLedgerView({ ledger, evidence }: { ledger: LoopLedger; evidence?: Stories }) {
  const summary = summarizeLoopLedger(ledger);
  const entries = orderedEntries(ledger);

  return (
    <main id="main-workspace" tabIndex={-1} className="min-h-screen bg-[var(--desk-bg)] text-[var(--text-heading)] px-4 sm:px-6 py-12 sm:py-20 outline-none">
      <article className="max-w-4xl mx-auto flex flex-col gap-12">
        <Link href="/" aria-label="PixiBun home" className="self-start">
          <PixiBunLogo size="md" />
        </Link>

        <header className="flex flex-col gap-3">
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">A little desk. Promises we can check.</h1>
          <p className="text-base leading-relaxed text-[var(--text-body)] max-w-2xl">
            We want artists to spend their attention on a bunny’s next expression.
            Ours goes into the changes that bring it safely home. TestSprite explores the live app;
            our own browser and file checks help us read the evidence closely.
          </p>
          <p className="font-mono text-sm text-[var(--accent-gold)]">
            Ledger updated <time dateTime={ledger.updated}>{formatDate(ledger.updated)}</time>
          </p>
        </header>

        {evidence && <VerificationStories evidence={evidence} />}

        <section aria-labelledby="verified-loop" className="flex flex-col gap-4">
          <h2 id="verified-loop" className="font-display text-xl text-[var(--accent-plum)]">The loop we are connecting</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-5 gap-3 list-none p-0 m-0" data-testid="verified-loop-steps">
            {LOOP_STEPS.map((step, index) => (
              <li key={step.title} className={`${CARD} p-4 flex flex-col gap-2`}>
                <span aria-hidden="true" className="font-display text-lg text-[var(--accent-gold)]">{index + 1}</span>
                <h3 className="font-display text-base text-[var(--text-heading)]">{step.title}</h3>
                <p className="text-sm leading-snug text-[var(--text-body)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="verified-counts" className="flex flex-col gap-4">
          <h2 id="verified-counts" className="font-display text-xl text-[var(--accent-plum)]">So far</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 m-0">
            <Stat
              testId="verified-suite-cases"
              label="Cases in the suite"
              value={summary.suiteCases === null ? '—' : String(summary.suiteCases)}
              hint={summary.suiteCases === null ? 'Not counted yet.' : 'Cases in the catalog at the recorded date; not a coverage or pass count.'}
            />
            <Stat testId="verified-prs-checked" label="PRs with executed runs" value={String(summary.prsChecked)} hint="Automatic executions in the ledger below. Billing-blocked events are excluded." />
            <Stat
              testId="verified-bugs-caught"
              label="Bugs in the PR ledger"
              value={String(summary.bugsCaught)}
              hint="Product bugs from executed PR runs. Supporting replay discoveries are recorded separately above."
            />
          </dl>
        </section>

        <section aria-labelledby="verified-ledger" className="flex flex-col gap-4">
          <h2 id="verified-ledger" className="font-display text-xl text-[var(--accent-plum)]">The automatic PR ledger</h2>
          {entries.length ? (
            <div role="region" aria-labelledby="verified-ledger" tabIndex={0} className={`${CARD} overflow-x-auto`}>
              <table className="w-full min-w-[40rem] text-sm border-collapse" data-testid="loop-ledger-table">
                <caption className="sr-only">Pull requests checked by TestSprite, newest first</caption>
                <thead>
                  <tr className="font-mono text-xs uppercase tracking-wider text-[var(--text-body)] text-left">
                    <th scope="col" className="p-3">Pull request</th>
                    <th scope="col" className="p-3">TestSprite run</th>
                    <th scope="col" className="p-3">What failed</th>
                    <th scope="col" className="p-3">Fixing commit</th>
                    <th scope="col" className="p-3">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => <LedgerRow key={entry.pr} entry={entry} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`${CARD} p-6 flex flex-col gap-2`} data-testid="loop-ledger-empty">
              <p className="font-display text-lg text-[var(--text-heading)]">The first executed PR run belongs here.</p>
              <p className="text-base leading-relaxed text-[var(--text-body)]">
                The App has received our deployment events. An event stopped by billing has not tested a drawing.
                Rows are added only for real runs, each with its run link, result and fixing commit when there is one.
              </p>
            </div>
          )}
          <p className="text-sm leading-relaxed text-[var(--text-body)]">
            This ledger is committed and schema-checked. It records reviewed evidence at the stated date; follow each run link for its original result.
          </p>
        </section>

        <nav aria-label="More about testing" className="flex flex-col gap-3">
          <h2 className="font-display text-xl text-[var(--accent-plum)]">Read more</h2>
          <ul className="flex flex-col gap-2 list-none p-0 m-0 font-mono text-sm">
            <li><a href={README_SECTION_URL} className={LINK}>README: Tested on every pull request</a></li>
            <li><a href={LEDGER_MARKDOWN_URL} className={LINK}>The ledger as Markdown</a></li>
            <li><a href={REPO_URL} className={LINK}>Source on GitHub</a></li>
            {ledger.testspriteProjectUrl && <li><a href={ledger.testspriteProjectUrl} className={LINK}>TestSprite project</a></li>}
            <li><Link href="/pledge" className={LINK}>Our pledge: no generative AI</Link></li>
          </ul>
        </nav>

        <Link href="/studio" className={`self-start font-mono text-sm ${LINK}`}>
          Open the Desk →
        </Link>
      </article>
    </main>
  );
}
