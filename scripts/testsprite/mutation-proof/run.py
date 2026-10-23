"""Mutation proof: plant one artist-harming bug at a time and run the App plans that touch it.

A mutant is "caught" when at least one plan fails with the bug in place AND the same
plan passes on the clean source. Plans run through ../app-plans/emulate.py, which uses
only the gestures the TestSprite App agent performs and reads the same Canvas readout.

Usage (from the repository root, with `npm run dev` serving this same working tree):
  python scripts/testsprite/mutation-proof/run.py [--url http://localhost:3000] [--only m01-...]

Each bug is applied to the working tree, then restored, even after an error.
Results: scripts/testsprite/mutation-proof/out/results.json (git-ignored).
Never commit or deploy a mutated file.
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PLANS = os.path.join(ROOT, 'scripts', 'testsprite', 'app-plans')
MAX_CATCHES = 3


def plans_for(pattern):
    found = []
    for path in sorted(glob.glob(os.path.join(PLANS, 'specs', '*.json'))):
        with open(path, encoding='utf-8') as f:
            if re.search(pattern, f.read()):
                found.append('specs/' + os.path.basename(path))
    return found


def wait_ready(url):
    for _ in range(120):
        try:
            if urllib.request.urlopen(url + '/studio', timeout=120).status == 200:
                return
        except Exception:
            pass
        time.sleep(2)
    raise SystemExit('Dev server did not answer at ' + url)


def run_plan(url, plan):
    env = dict(os.environ, PIXIBUN_URL=url, LABS='0', PYTHONIOENCODING='utf-8')
    p = subprocess.run([sys.executable, '-I', 'emulate.py', plan], cwd=PLANS, env=env,
                       capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=900)
    text = p.stdout + p.stderr
    passed = 'PASS ' in text and 'FAIL ' not in text
    why = next((line.strip() for line in text.splitlines() if 'FAIL' in line), '')
    return passed, why[:300]


def apply(m):
    path = os.path.join(ROOT, m['file'])
    with open(path, encoding='utf-8', newline='') as f:
        original = f.read()
    old, new = m['old'], m['new']
    if old not in original and old.replace('\n', '\r\n') in original:
        old, new = old.replace('\n', '\r\n'), new.replace('\n', '\r\n')
    if original.count(old) != 1:
        raise SystemExit(f"{m['id']}: expected the target text exactly once in {m['file']}")
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(original.replace(old, new))
    return path, original


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default=os.environ.get('PIXIBUN_URL', 'http://localhost:3000'))
    ap.add_argument('--only', action='append')
    args = ap.parse_args()
    with open(os.path.join(HERE, 'mutants.json'), encoding='utf-8') as f:
        mutants = [m for m in json.load(f) if not args.only or m['id'] in args.only]
    out_dir = os.path.join(HERE, 'out')
    os.makedirs(out_dir, exist_ok=True)
    results = {}

    for m in mutants:
        path, original = apply(m)
        try:
            time.sleep(4)
            wait_ready(args.url)
            r = {'harm': m['harm'], 'file': m['file'], 'ran': [], 'caught_by': []}
            for plan in plans_for(m['plans']):
                passed, why = run_plan(args.url, plan)
                r['ran'].append({'plan': plan, 'pass': passed, 'why': why})
                print(m['id'], plan, 'PASS' if passed else 'FAIL', why[:120], flush=True)
                if not passed:
                    r['caught_by'].append(plan)
                if len(r['caught_by']) >= MAX_CATCHES:
                    break
            results[m['id']] = r
        finally:
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(original)

    # A failure counts only if the same plan passes on the clean source.
    time.sleep(4)
    wait_ready(args.url)
    control = {}
    for plan in sorted({p for r in results.values() for p in r['caught_by']}):
        passed, why = run_plan(args.url, plan)
        control[plan] = {'pass': passed, 'why': why}
        print('CLEAN', plan, 'PASS' if passed else 'FAIL', why[:120], flush=True)
    for r in results.values():
        r['confirmed'] = [p for p in r['caught_by'] if control[p]['pass']]
        r['caught'] = bool(r['confirmed'])
    with open(os.path.join(out_dir, 'results.json'), 'w', encoding='utf-8') as f:
        json.dump({'mutants': results, 'clean': control}, f, indent=1)
    caught = sum(r['caught'] for r in results.values())
    print(f'Caught {caught} of {len(results)} planted bugs.')


if __name__ == '__main__':
    main()
