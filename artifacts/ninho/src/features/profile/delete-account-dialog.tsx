import { useState } from "react";
import { X } from "lucide-react";
import { deleteAccount } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { TinyButton } from "@/components/controls";
import { ModalShell } from "@/components/modal-shell";
import { PasswordField } from "@/components/password-field";

const CONFIRMATION = "EXCLUIR";

function errorField(error: unknown): string | null {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "field" in data && typeof data.field === "string") return data.field;
  }
  return null;
}

/**
 * Exclusão imediata: pede a senha e a palavra EXCLUIR. O botão só habilita
 * com a palavra certa, e o erro aparece no campo que precisa de ajuste.
 */
export function DeleteAccountDialog({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; field: string | null } | null>(null);
  const confirmed = confirmation.trim().toUpperCase() === CONFIRMATION;

  const submit = async () => {
    if (!confirmed || pending) return;
    if (!password) {
      setError({ message: "Digite sua senha.", field: "password" });
      return;
    }
    setPending(true);
    setError(null);
    try {
      await deleteAccount({ password, confirmation: CONFIRMATION });
      onDeleted();
    } catch (err) {
      setError({ message: getFriendlyErrorMessage(err), field: errorField(err) });
      setPending(false);
    }
  };

  const passwordError = error?.field === "password" ? error.message : null;
  const confirmationError = error?.field === "confirmation" ? error.message : null;
  const generalError = error && !passwordError && !confirmationError ? error.message : null;

  return (
    <ModalShell
      labelledBy="delete-account-title"
      describedBy="delete-account-description"
      onClose={pending ? () => undefined : onClose}
      onSubmit={() => void submit()}
      returnFocusTestId="button-profile-delete-account"
    >
      <div className="modal-top">
        <div><span className="eyebrow">EXCLUIR CONTA</span><h2 id="delete-account-title">Excluir sua conta?</h2></div>
        <TinyButton onClick={onClose} label="Fechar" testId="button-close-delete-account"><X size={17} /></TinyButton>
      </div>
      <p id="delete-account-description">
        Isso apaga <strong>na hora e para sempre</strong> sua lista, marcos, orçamento, perfil e o link de presentes. Se quiser guardar uma cópia, exporte seus dados antes.
      </p>
      <label className="modal-label">
        SUA SENHA
        <PasswordField
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Digite sua senha"
          testId="input-delete-account-password"
          toggleTestId="button-toggle-delete-account-password"
          invalid={Boolean(passwordError)}
          describedBy={passwordError ? "delete-account-password-error" : undefined}
        />
        {passwordError && <span className="field-error" role="alert" id="delete-account-password-error">{passwordError}</span>}
      </label>
      <label className="modal-label">
        PARA CONFIRMAR, DIGITE {CONFIRMATION}
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={confirmationError ? true : undefined}
          aria-describedby={confirmationError ? "delete-account-confirmation-error" : undefined}
          data-testid="input-delete-account-confirmation"
        />
        {confirmationError && <span className="field-error" role="alert" id="delete-account-confirmation-error">{confirmationError}</span>}
      </label>
      {generalError && <p className="account-error" role="alert">{generalError}</p>}
      <button type="submit" className="primary-button danger-button" disabled={!confirmed || pending} data-testid="button-confirm-delete-account">
        {pending ? "excluindo…" : "excluir minha conta"}
      </button>
      <button type="button" className="text-action confirm-cancel" onClick={onClose} disabled={pending} data-testid="button-cancel-delete-account">
        cancelar
      </button>
    </ModalShell>
  );
}
