'use client';
import { useEffect, useId, useRef } from 'react';
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}
export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
    onCancel={() => onOpenChange(false)} onClose={() => onOpenChange(false)}
    onClick={event => { if (event.target === event.currentTarget) onOpenChange(false); }}
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 backdrop:bg-black/70">
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3">
      <div><h2 id={titleId} className="text-lg font-semibold">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm text-zinc-400">{description}</p>}</div>
      <button type="button" aria-label="Fechar diálogo" onClick={() => onOpenChange(false)} className="rounded-lg p-2 text-zinc-300 focus-visible:outline-emerald-400">✕</button>
    </div>
    <div className="pt-4">{children}</div>
  </dialog>;
}
