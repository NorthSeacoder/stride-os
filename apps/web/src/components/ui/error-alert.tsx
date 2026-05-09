export function ErrorAlert({ message = '发生了错误。' }: { message?: string }) {
  return (
    <div className="rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger-text)]">{message}</div>
  );
}
