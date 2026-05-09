export function Loading({ text = 'Loading...' }: { text?: string }) {
  return <div className="text-sm text-[var(--text-secondary)]">{text}</div>;
}
