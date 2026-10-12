/** Blob companions use separate contexts; WebKit coalesces same-frame downloads.
 * Keep the primary PNG in the main frame: CSP does not allow data: child frames.
 */
export function downloadCompanionAsset(href: string, filename: string): void {
  if (!href.startsWith('blob:')) throw new Error('Export companions require a Blob URL.');
  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.title = 'Export download';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  document.body.appendChild(frame);
  try {
    const owner = frame.contentDocument;
    if (!owner) throw new Error('The browser could not prepare an export download.');
    const link = owner.createElement('a');
    link.download = filename;
    link.href = href;
    link.click();
  } catch (error) {
    frame.remove();
    throw error;
  }
  // Retain the context while navigation starts, then release its document/URL references.
  // This schedules cleanup, not subsequent downloads or a test synchronization delay.
  setTimeout(() => frame.remove(), 1000);
}
