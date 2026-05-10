'use client';

import { Dialog } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';
import { Button } from './button';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, onOpenChange, title, description, children, footer }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-[rgba(6,8,11,0.72)] backdrop-blur-md" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[min(760px,calc(100vh-2rem))] w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] border border-[var(--border-glow)] bg-[var(--bg-surface-2)] shadow-[var(--shadow-shell)]">
          <div className="flex items-start justify-between gap-4 border-b app-shell-divider px-6 py-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">编辑面板</p>
              <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-[var(--text-secondary)]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close render={<Button variant="secondary" size="sm">关闭</Button>} />
          </div>
          <div className="max-h-[calc(min(760px,100vh-2rem)-9rem)] overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="border-t app-shell-divider px-6 py-5">{footer}</div>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
