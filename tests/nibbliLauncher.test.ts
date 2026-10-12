import { describe, expect, it } from 'vitest';
import { artistOptions } from '../scripts/nibbli/artistOptions.mjs';
describe('Nibbli session launcher boundaries', () => {
  it.each([[], ['--hands'], ['--hands','--copy'], ['--hands','--flip']].map(flags=>({flags})))('defaults conversation $flags to a single Chromium session even when a journey filter exists', ({flags}) => {
    const options=artistOptions(['--conversation',...flags]);
    expect(options.mode).toBe('conversation'); expect(options.browserArgs.filter(v=>v==='--project')).toHaveLength(1);
    expect(options.browserArgs.slice(-2)).toEqual(['--project','chromium']);
    if(flags.includes('--hands')) expect(options.browserArgs).toContain('--grep');
  });
  it('preserves an explicit browser and the requested Flip journey',()=>{
    expect(artistOptions(['--hands','--conversation','--flip','--project','webkit']).browserArgs).toEqual(['--project','webkit','--grep','Hands flips horizontal asymmetric 5x7']);
  });
  it('keeps the full mock workflow across all configured browsers',()=>{
    expect(artistOptions(['--hands','--mock']).browserArgs).toEqual([]);
  });
  it('selects one default Chromium rotation conversation and preserves an explicit engine',()=>{
    expect(artistOptions(['--hands','--conversation','--rotate']).browserArgs).toEqual(['--grep','Hands rotation 90 variant 1','--project','chromium']);
    expect(artistOptions(['--hands','--conversation','--rotate','--project','firefox']).browserArgs).toEqual(['--project','firefox','--grep','Hands rotation 90 variant 1']);
  });
  it.each([['--rotate'],['--hands','--rotate','--flip'],['--hands','--rotate','--copy']].map(args=>({args})))('rejects an unsupported or ambiguous rotation journey $args',({args})=>{
    expect(()=>artistOptions(args)).toThrow();
  });
  it.each([['--flip'],['--hands','--copy','--flip'],['--hands','--retries','1'],['--project','unknown']].map(args=>({args})))('rejects ambiguous or unauthorized overrides $args',({args})=>{
    expect(()=>artistOptions(args)).toThrow();
  });
});
