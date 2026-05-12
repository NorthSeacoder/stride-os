export function Loading({ text = '加载中...' }: { text?: string }) {
  return <div className="text-sm text-(--text-secondary)">{text}</div>;
}
