'use client';

import { Toast } from '@base-ui/react/toast';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

type ToastMessage = {
  title: string;
  description?: string;
  tone?: 'success' | 'error' | 'neutral' | 'warning';
};

type ToastContextValue = {
  notify: (message: ToastMessage) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      <ToastProviderInner>{children}</ToastProviderInner>
    </Toast.Provider>
  );
}

function ToastProviderInner({ children }: { children: ReactNode }) {
  const toastManager = Toast.useToastManager();
  const notify = useCallback((message: ToastMessage) => {
    toastManager.add({
      title: message.title,
      description: message.description,
      type: message.tone,
    });
  }, [toastManager]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </ToastContext.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return (
    <>
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          toast={toast}
          className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 text-sm shadow-xl"
        >
          <Toast.Content>
            <Toast.Title className="font-medium text-[var(--text-primary)]" />
            <Toast.Description className="mt-1 text-[var(--text-secondary)]" />
          </Toast.Content>
        </Toast.Root>
      ))}
    </>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function FeedbackAlert({
  message,
  tone = 'neutral',
}: {
  message: string;
  tone?: 'success' | 'error' | 'neutral' | 'warning';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]'
      : tone === 'error'
        ? 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]'
        : tone === 'warning'
          ? 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]'
        : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)]';

  return <div className={`rounded-md border p-3 text-sm ${toneClass}`}>{message}</div>;
}
