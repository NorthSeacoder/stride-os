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
          className="rounded-md border border-(--border-subtle) bg-(--bg-panel) p-4 text-sm shadow-xl"
        >
          <Toast.Content>
            <Toast.Title className="font-medium text-(--text-primary)" />
            <Toast.Description className="mt-1 text-(--text-secondary)" />
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
      ? 'border-(--success-border) bg-(--success-bg) text-(--success-text)'
      : tone === 'error'
        ? 'border-(--danger-border) bg-(--danger-bg) text-(--danger-text)'
        : tone === 'warning'
          ? 'border-(--warning-border) bg-(--warning-bg) text-(--warning-text)'
        : 'border-(--border-subtle) bg-(--bg-panel) text-(--text-secondary)';

  return <div className={`rounded-md border p-3 text-sm ${toneClass}`}>{message}</div>;
}
