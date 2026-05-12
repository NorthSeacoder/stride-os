export function ErrorAlert({ message = '发生了错误。' }: { message?: string }) {
  return (
    <div className="rounded-md border border-(--danger-border) bg-(--danger-bg) p-3 text-sm text-(--danger-text)">{message}</div>
  );
}
