import { useState } from "react";
import { Download, LogOut, MonitorSmartphone, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { EXPORT_DATA_URL, logout, logoutEverywhere } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { ConfirmDialog } from "@/components/modal-shell";
import { DeleteAccountDialog } from "@/features/profile/delete-account-dialog";

/**
 * "Sua conta": sair deste aparelho, sair de todos, exportar os dados e excluir
 * a conta. Qualquer saída limpa o cache local antes de voltar ao login, para
 * nada da conta ficar na tela.
 */
export function AccountSection() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [confirmingEverywhere, setConfirmingEverywhere] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = (to = "/sign-in") => {
    qc.clear();
    setLocation(to);
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
      <button type="button" className="soft-action" onClick={() => void signOut()} disabled={busy} data-testid="button-profile-sign-out">
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
      <p>Seus dados são seus: baixe uma cópia quando quiser, em um arquivo que abre em qualquer editor de texto.</p>
      <a className="soft-action" href={EXPORT_DATA_URL} download data-testid="link-export-data">
        <Download size={14} aria-hidden /> exportar meus dados
      </a>
      <button
        type="button"
        className="soft-action account-danger"
        onClick={() => setDeleting(true)}
        disabled={busy}
        data-testid="button-profile-delete-account"
      >
        <Trash2 size={14} aria-hidden /> excluir minha conta
      </button>
      {error && <p className="account-error" role="alert">{error}</p>}
      {deleting && (
        <DeleteAccountDialog
          onClose={() => setDeleting(false)}
          onDeleted={() => leave("/sign-in?conta-excluida=1")}
        />
      )}
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
