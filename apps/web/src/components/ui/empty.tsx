export function Empty({ text = '暂无内容。' }: { text?: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-panel)] p-8 text-center text-sm text-[var(--text-secondary)]">
      {text}
    </div>
  );
}
