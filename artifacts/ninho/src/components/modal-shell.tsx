import { useEffect, useRef, type MouseEvent, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { TinyButton } from "@/components/controls";

export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Casca comum de todos os diálogos: semântica de dialog, foco inicial, foco
 * preso, Esc para fechar e devolução do foco a quem abriu. Quando recebe
 * `onSubmit`, o próprio cartão vira <form>, então Enter envia — e os seletores
 * `.modal-card > p` do CSS continuam valendo.
 */
export function ModalShell({
  labelledBy,
  describedBy,
  className = "",
  onClose,
  onSubmit,
  dismissible = true,
  focusKey,
  initialFocusRef,
  returnFocusTestId,
  children,
}: {
  labelledBy: string;
  describedBy?: string;
  className?: string;
  onClose: () => void;
  onSubmit?: () => void;
  /** O onboarding não pode ser dispensado: não há para onde voltar. */
  dismissible?: boolean;
  /** Muda quando o conteúdo troca (ex.: passo do onboarding) para refocar. */
  focusKey?: string | number;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** data-testid de quem abriu o diálogo, para devolver o foco ao fechar. */
  returnFocusTestId?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement | HTMLFormElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    // O React costuma recriar o botão de origem enquanto o diálogo está
    // aberto, então guardamos também como reencontrá-lo.
    const previousTestId = returnFocusTestId ?? previousFocus?.getAttribute("data-testid");
    const target =
      initialFocusRef?.current
      ?? dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled])')
      ?? dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    target?.focus();
    return () => {
      // O foco volta depois que o React desmonta o diálogo; se o elemento de
      // origem saiu da tela nesse meio-tempo, não força nada.
      requestAnimationFrame(() => {
        if (previousFocus && document.contains(previousFocus)) {
          previousFocus.focus();
          return;
        }
        if (previousTestId) {
          document.querySelector<HTMLElement>(`[data-testid="${previousTestId}"]`)?.focus();
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable?.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, dismissible]);

  const cardProps = {
    className: `modal-card ${className}`.trim(),
    role: "dialog",
    "aria-modal": true as const,
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy,
    onClick: (event: MouseEvent<HTMLElement>) => event.stopPropagation(),
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={dismissible ? onClose : undefined}>
      {onSubmit ? (
        <form
          {...cardProps}
          ref={dialogRef as RefObject<HTMLFormElement>}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
        </form>
      ) : (
        <div {...cardProps} ref={dialogRef as RefObject<HTMLDivElement>}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Confirmação para ações que quebram algo que já foi compartilhado. */
export function ConfirmDialog({
  title, description, confirmLabel, onConfirm, onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell labelledBy="confirm-dialog-title" onClose={onClose} onSubmit={() => { onConfirm(); onClose(); }}>
      <>
        <div className="modal-top">
          <div><span className="eyebrow">CONFIRMAR</span><h2 id="confirm-dialog-title">{title}</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-confirm"><X size={17} /></TinyButton>
        </div>
        <p>{description}</p>
        <button type="submit" className="primary-button" data-testid="button-confirm-action">{confirmLabel}</button>
        <button type="button" className="text-action confirm-cancel" onClick={onClose} data-testid="button-cancel-action">cancelar</button>
      </>
    </ModalShell>
  );
}
