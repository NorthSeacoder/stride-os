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
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[min(720px,calc(100vh-2rem))] w-[min(620px,calc(100vw-2rem))] min-w-0 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] border border-(--border-glow) bg-(--bg-surface-2) shadow-[var(--shadow-shell)]">
          <div className="flex items-start justify-between gap-4 border-b app-shell-divider px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-(--text-primary)">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-(--text-secondary)">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              render={(
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 min-h-10 w-10 min-w-10 rounded-full border-(--border-hairline) bg-[color:rgba(255,255,255,0.04)] px-0 text-(--text-primary) hover:bg-[color:rgba(255,255,255,0.08)]"
                  aria-label="关闭"
                >
                  <CloseIcon />
                </Button>
              )}
            />
          </div>
          <div className="max-h-[calc(min(720px,100vh-2rem)-7rem)] overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t app-shell-divider px-5 py-4">{footer}</div>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-[20px] w-[20px]">
      <path d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
