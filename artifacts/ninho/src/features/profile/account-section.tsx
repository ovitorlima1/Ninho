import { useState } from "react";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { logout, logoutEverywhere } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { ConfirmDialog } from "@/components/modal-shell";

/**
 * "Sua conta": sair deste aparelho, sair de todos os aparelhos. Qualquer saída
 * limpa o cache local antes de voltar ao login, para nada da conta ficar na tela.
 */
export function AccountSection() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [confirmingEverywhere, setConfirmingEverywhere] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = () => {
    qc.clear();
    setLocation("/sign-in");
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      // Mesmo se a API falhar, este aparelho sai: o cookie expira no servidor
      // na próxima tentativa, e ficar "preso" na conta seria pior.
      leave();
    }
  };

  const signOutEverywhere = async () => {
    setBusy(true);
    setError(null);
    try {
      await logoutEverywhere();
      leave();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <section className="account-section" aria-labelledby="account-section-title">
      <div>
        <span className="eyebrow">SEGURANÇA E PRIVACIDADE</span>
        <h2 id="account-section-title">Sua conta</h2>
      </div>
      <button type="button" className="soft-action" onClick={signOut} disabled={busy} data-testid="button-profile-sign-out">
        <LogOut size={14} aria-hidden /> sair deste aparelho
      </button>
      <button
        type="button"
        className="soft-action"
        onClick={() => setConfirmingEverywhere(true)}
        disabled={busy}
        data-testid="button-profile-sign-out-everywhere"
      >
        <MonitorSmartphone size={14} aria-hidden /> sair de todos os aparelhos
      </button>
      {error && <p className="account-error" role="alert">{error}</p>}
      {confirmingEverywhere && (
        <ConfirmDialog
          title="Sair de todos os aparelhos?"
          description="Celulares e computadores conectados à sua conta, incluindo este, vão precisar entrar de novo."
          confirmLabel="sair de todos"
          onConfirm={() => void signOutEverywhere()}
          onClose={() => setConfirmingEverywhere(false)}
        />
      )}
    </section>
  );
}
