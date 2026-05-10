export function Empty({ text = '暂无内容。' }: { text?: string }) {
  return (
    <div className="metal-frame rounded-[16px] border border-dashed border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-8 text-center text-sm text-[var(--text-secondary)]">
      {text}
    </div>
  );
}
