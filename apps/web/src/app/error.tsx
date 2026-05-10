'use client';

import { Button } from '@/components/ui';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-6 py-24 text-[var(--text-primary)]">
      <div className="w-full max-w-lg rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6">
        <p className="text-sm font-medium text-[var(--danger-text)]">发生了错误。</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {error.digest ? `错误参考号：${error.digest}` : '请刷新页面，或重试刚才的操作。'}
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={() => reset()}
          className="mt-4"
        >
          重试
        </Button>
      </div>
    </main>
  );
}
