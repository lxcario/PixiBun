import type { VerificationStories as Stories } from '@/lib/verified/verificationStories.mjs';
import Link from 'next/link';
import Image from 'next/image';
import replays from '../../../docs/testsprite/replays.json';

const LINK = 'text-[var(--accent-gold)] underline underline-offset-4 hover:opacity-80';
const CARD = 'rounded-[2px] border-2 border-[var(--desk-border)] bg-[var(--desk-surface)]';
const REPO = 'https://github.com/lxcario/PixiBun';
const heart = replays.replays.find(replay => replay.id === 'heart')!;

/** Static, dated evidence: supporting replays stay separate from automatic PR results. */
export function VerificationStories({ evidence }: { evidence: Stories }) {
  return (
    <>
      <aside aria-label="Automatic PR verification status" className={`${CARD} p-5 flex flex-col gap-2`} data-testid="verification-automation-status">
        <p className="font-display text-lg">The work behind the check.</p>
        <p className="text-sm leading-relaxed text-[var(--text-body)]">{evidence.automationNote}</p>
        <p className="font-mono text-xs text-[var(--text-body)]">Recorded <time dateTime={evidence.updated}>{evidence.updated}</time>. This page is a dated record, not a live status monitor.</p>
      </aside>

      <section aria-labelledby="verified-readable-heart" className={`${CARD} p-5 sm:p-7 flex flex-col gap-3`}>
        <h2 id="verified-readable-heart" className="font-display text-xl text-[var(--accent-plum)]">A heart, in pixels and in words.</h2>
        <figure className="flex items-center gap-5 m-0">
          <Image src="/verification/painted-heart.png" alt="A red pixel heart with a three-pixel white highlight." width={96} height={96} unoptimized className="shrink-0 [image-rendering:pixelated]" />
          <figcaption className="text-sm leading-relaxed text-[var(--text-body)]">Painted from a blank canvas by the browser: thirteen red brush drags and three white clicks. The cloud test checked the actual PNG, then lighting, Undo and Redo. One hundred painted pixels, each accounted for.</figcaption>
        </figure>
        <p className="text-base leading-relaxed text-[var(--text-body)]">A canvas can be difficult to read from the outside. Our Canvas readout gives a screen reader a quiet account of the frame: its size, layers, painted pixels and colors. It gives a browser test something precise to check, too.</p>
        <p className="text-sm leading-relaxed text-[var(--text-body)]">A separate Heart recipe adds a pale pink background: 256 painted pixels in three colors. Our local replay compares the readout with a literal pixel design and the actual exported PNG, then checks Undo and Redo. That readout journey’s cloud qualification is still pending.</p>
        <Link href={`/studio?replay=${heart.replay}`} className={`${LINK} font-mono text-sm self-start`}>Draw this little heart →</Link>
      </section>

      <section aria-labelledby="verified-promises" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 id="verified-promises" className="font-display text-2xl text-[var(--accent-plum)]">Small promises, looked after.</h2>
          <p className="text-base leading-relaxed text-[var(--text-body)] max-w-2xl">A quiet desk is made of little things you can trust. Here is what a failure asked us to look at, and what we did next.</p>
        </div>
        {evidence.stories.map(story => (
          <article key={story.id} id={story.id} className={`${CARD} p-5 sm:p-7 flex flex-col gap-4 min-w-0`} data-testid="verification-story">
            <header className="flex flex-col gap-2">
              <p className="font-mono text-xs uppercase tracking-wide text-[var(--text-body)]">
                {story.status === 'preview-passed' ? 'Controlled preview passed · automatic PR run pending' : 'Local repair passed · deployment and cloud rerun pending'}
              </p>
              <h3 className="font-display text-xl sm:text-2xl">{story.title}</h3>
              <p className="text-base text-[var(--accent-plum)]">{story.promise}</p>
            </header>
            <p className="text-base leading-relaxed text-[var(--text-body)]">{story.discovery}</p>
            <p className="text-base leading-relaxed text-[var(--text-body)]">{story.repair}</p>
            <p className="text-sm leading-relaxed text-[var(--text-body)]">{story.scope}</p>
            <nav aria-label={`Evidence: ${story.title}`} className="flex flex-wrap gap-x-5 gap-y-3 font-mono text-sm">
              <a href={story.redUrl} className={LINK}>Original cloud failure</a>
              {story.prUrl && <a href={story.prUrl} className={LINK}>Fix pull request</a>}
              {story.followUpUrl && <a href={story.followUpUrl} className={LINK}>Controlled preview replay</a>}
            </nav>
            <p className="text-xs font-mono text-[var(--text-body)] break-words">
              Production tested: <a className={LINK} href={`${REPO}/commit/${story.sourceCommit}`}>{story.sourceCommit.slice(0, 8)}</a>
              {story.fixCommit && <> · Fix: <a className={LINK} href={`${REPO}/commit/${story.fixCommit}`}>{story.fixCommit.slice(0, 8)}</a></>}
            </p>
          </article>
        ))}
      </section>

      <section aria-labelledby="verified-cloud-replays" className="flex flex-col gap-4">
        <h2 id="verified-cloud-replays" className="font-display text-xl text-[var(--accent-plum)]">A few more things that held.</h2>
        <p className="text-sm leading-relaxed text-[var(--text-body)]">These saved-script cloud replays passed on the source named below, with auto-heal disabled. Each link opens its dated TestSprite execution. They are separate from the automatic PR ledger.</p>
        <ul className="grid sm:grid-cols-2 gap-3 list-none m-0 p-0">
          {evidence.checks.map(check => (
            <li key={check.id} className={`${CARD} p-5 flex flex-col gap-3 min-w-0`} data-testid="verification-supporting-check">
              <h3 className="font-display text-lg">{check.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--text-body)]">{check.scope}</p>
              <a href={check.runUrl} className={`${LINK} font-mono text-sm self-start`} aria-label={`Passed cloud replay: ${check.title}`}>Passed cloud replay →</a>
              <p className="font-mono text-xs text-[var(--text-body)] break-words">Source {check.sourceCommit.slice(0, 8)} · {check.codeVersion}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
