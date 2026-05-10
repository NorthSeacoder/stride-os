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
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[min(720px,calc(100vh-2rem))] w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-[var(--text-secondary)]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close render={<Button variant="secondary" size="sm">关闭</Button>} />
          </div>
          <div className="max-h-[calc(min(720px,100vh-2rem)-8rem)] overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-[var(--border-subtle)] px-5 py-4">{footer}</div>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
