import { useState } from "react";
import { Check, Copy, Gift, Link2, RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/components/modal-shell";
import { type ServerGiftShare } from "@/lib/api";
import { basePath } from "@/lib/format";

export function GiftShareCard({
  share, onCreate, onRevoke, isLoading, error,
}: {
  share: ServerGiftShare | null | undefined;
  onCreate: () => void;
  onRevoke: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<"regenerate" | "revoke" | null>(null);
  const [copyError, setCopyError] = useState(false);
  const link = share ? `${window.location.origin}${basePath}/gift/${share.token}` : "";

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const field = document.createElement("textarea");
        field.value = link;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copiedWithFallback = document.execCommand("copy");
        field.remove();
        if (!copiedWithFallback) throw new Error("Clipboard unavailable");
      }
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  return (
    <section className="gift-share-card" aria-labelledby="gift-share-title">
      <div className="gift-share-icon"><Gift size={18} /></div>
      <div className="gift-share-copy">
        <span className="eyebrow">LISTA PARA PRESENTES</span>
        <h2 id="gift-share-title">Deixe quem ama vocês participar.</h2>
        <p>Compartilhe só os itens do enxoval. Seus dados pessoais e orçamento ficam no seu ninho.</p>
      </div>
      {share ? (
        <>
          <div className="gift-share-link" aria-label="Link público da sua lista">
            <Link2 size={14} /><span>{link}</span>
          </div>
          <div className="gift-share-actions">
            <button type="button" className="primary-button gift-share-primary" onClick={copyLink} disabled={isLoading} data-testid="button-copy-gift-link">
              {copied ? <><Check size={15} /> link copiado</> : <><Copy size={15} /> copiar link</>}
            </button>
            <button type="button" className="gift-share-secondary" onClick={() => setConfirming("regenerate")} disabled={isLoading} data-testid="button-regenerate-gift-link">
              <RefreshCw size={14} /> gerar novo
            </button>
            <button type="button" className="gift-share-revoke" onClick={() => setConfirming("revoke")} disabled={isLoading} data-testid="button-revoke-gift-link">
              revogar link
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="primary-button gift-share-primary gift-share-create" onClick={onCreate} disabled={isLoading} data-testid="button-create-gift-link">
          <Gift size={15} /> {isLoading ? "criando link…" : "criar link para presentes"}
        </button>
      )}
      {copyError && <p className="gift-share-error" role="alert">Não foi possível copiar automaticamente. Selecione o endereço acima e copie manualmente.</p>}
      {error && <p className="gift-share-error" role="alert">{error}</p>}
      {confirming === "regenerate" && (
        <ConfirmDialog
          title="Gerar um link novo?"
          description="O link atual para de funcionar na hora. Quem já recebeu o antigo vai precisar do novo endereço."
          confirmLabel="gerar link novo"
          onConfirm={onCreate}
          onClose={() => setConfirming(null)}
        />
      )}
      {confirming === "revoke" && (
        <ConfirmDialog
          title="Revogar o link?"
          description="A lista sai do ar para todo mundo que tem o endereço. As reservas já feitas continuam salvas no seu ninho."
          confirmLabel="revogar link"
          onConfirm={onRevoke}
          onClose={() => setConfirming(null)}
        />
      )}
    </section>
  );
}
