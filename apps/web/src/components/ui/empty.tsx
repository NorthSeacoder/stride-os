export function Empty({ text = 'No items found.' }: { text?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-panel)] p-8 text-center text-sm text-[var(--text-secondary)]">
      {text}
    </div>
  );
}
