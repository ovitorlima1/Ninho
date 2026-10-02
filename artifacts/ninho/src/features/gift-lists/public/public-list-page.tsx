import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ExternalLink, Gift, Link2, MapPin, QrCode, ShieldCheck, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Brand } from "@/components/brand";
import { TinyButton } from "@/components/controls";
import { ModalShell } from "@/components/modal-shell";
import { PixCode } from "@/components/pix-code";
import { SplitProgress } from "@/components/progress";
import { LoadingSpinner } from "@/components/states";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { eventLabel, formatCents, percentOf, progressText } from "@/lib/gift-lists";
import { cancelPledge, fetchPublicList, lookupPledges, type GuestPledge, type PublicGiftListItem } from "@/lib/gift-lists-api";
import { GuestItemModal } from "@/features/gift-lists/public/guest-item-modal";
import { addManageToken, adoptTokenFromHash, readManageTokens } from "@/features/gift-lists/public/guest-storage";

function pledgeText(pledge: GuestPledge): string {
  if (pledge.kind === "money") return formatCents(pledge.amountCents ?? 0);
  if (pledge.kind === "units") return `${pledge.units} un.`;
  return pledge.wholeMode === "pix" ? `Presente inteiro · ${formatCents(pledge.amountCents ?? 0)}` : "Presente inteiro";
}

function ItemAction({ item, onOpen }: { item: PublicGiftListItem; onOpen: () => void }) {
  if (item.state === "complete") return <span className="badge badge-mint">Completo</span>;
  if (item.state === "whole") return <span className="badge badge-peach">{item.wholeBy ? `Presente de ${item.wholeBy}` : "Já escolhido"}</span>;
  return (
    <button type="button" className="guest-item-action" onClick={onOpen} data-testid={`button-guest-item-${item.id}`}>
      {item.kind === "money" ? "Participar" : "Quero dar"}
    </button>
  );
}

/** /lista/:token — a lista de presentes como o convidado vê, sem conta e sem dados da família. */
export function PublicListPage() {
  const [, params] = useRoute("/lista/:token");
  const token = params?.token || "";
  const qc = useQueryClient();
  const [tokens, setTokens] = useState<string[]>(() => {
    adoptTokenFromHash(token);
    return readManageTokens(token);
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [pixOf, setPixOf] = useState<GuestPledge | null>(null);

  const listQuery = useQuery({
    queryKey: ["public-list", token],
    queryFn: () => fetchPublicList(token),
    enabled: Boolean(token),
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });
  const mineQuery = useQuery({
    queryKey: ["public-list-mine", token, tokens],
    queryFn: () => lookupPledges(token, tokens),
    enabled: Boolean(token) && tokens.length > 0,
    staleTime: 0,
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["public-list", token] });
    void qc.invalidateQueries({ queryKey: ["public-list-mine", token] });
  };
  const cancel = useMutation({ mutationFn: (manageToken: string) => cancelPledge(token, manageToken), onSettled: refresh });

  const name = listQuery.data?.name;
  useEffect(() => {
    document.title = name ? `${name} · Ninho` : "Lista de presentes · Ninho";
  }, [name]);

  if (listQuery.isPending) return <div className="public-gift-page"><LoadingSpinner /></div>;
  if (listQuery.isError || !listQuery.data) {
    return (
      <main className="public-gift-page public-gift-state">
        <Brand />
        <div className="public-gift-invalid">
          <Link2 size={30} aria-hidden />
          <span className="eyebrow">Link indisponível</span>
          <h1>Esta lista não está mais disponível.</h1>
          <p>O endereço pode estar incompleto ou a lista foi encerrada. Peça um novo link para quem compartilhou.</p>
        </div>
      </main>
    );
  }

  const list = listQuery.data;
  const owner = list.ownerName || "a família";
  const when = eventLabel(list.eventDate, list.eventTime);
  const mine = (mineQuery.data?.pledges ?? []).filter((pledge) => pledge.status !== "cancelled");
  const selectedItem = list.items.find((item) => item.id === selected) ?? null;

  return (
    <main className="public-gift-page public-list-page">
      <header className="public-gift-header">
        <Brand />
        <span className="eyebrow">Lista compartilhada com carinho</span>
      </header>

      <section className="tile tile-peach tile-static public-list-hero">
        <span className="tile-kicker">{list.ownerName ? `Lista de ${list.ownerName}` : "Lista de presentes"}</span>
        <h1 className="tile-value">{list.name}</h1>
        {when && <span className="tile-note"><CalendarDays size={15} aria-hidden /> {when}</span>}
        {list.eventPlace && <span className="tile-note"><MapPin size={15} aria-hidden /> {list.eventPlace}</span>}
      </section>
      <p className="public-list-message">
        {list.message || "Dê o presente inteiro ou participe com uma parte. A lista mostra quanto falta, e ninguém repete."}
      </p>

      {mine.length > 0 && (
        <section className="card guest-mine" aria-labelledby="guest-mine-title">
          <h2 className="card-title" id="guest-mine-title">Suas reservas</h2>
          <ul className="pledge-list">
            {mine.map((pledge) => (
              <li className="pledge-row" key={pledge.id} data-testid={`guest-pledge-${pledge.id}`}>
                <div className="pledge-copy">
                  <strong>{pledge.itemName}</strong>
                  <small>{pledgeText(pledge)} · {pledge.status === "confirmed" ? "recebido" : pledge.pix ? (pledge.guestSaysPaid ? "Pix avisado" : "falta o Pix") : "reservado"}</small>
                </div>
                <div className="pledge-actions">
                  {pledge.pix && (
                    <button type="button" className="text-action" onClick={() => setPixOf(pledge)} data-testid={`button-guest-pix-${pledge.id}`}>
                      <QrCode size={14} aria-hidden /> ver Pix
                    </button>
                  )}
                  {pledge.status === "promised" && pledge.manageToken && (
                    <button type="button" className="text-action danger-action" onClick={() => cancel.mutate(pledge.manageToken!)} disabled={cancel.isPending} data-testid={`button-guest-cancel-${pledge.id}`}>
                      cancelar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {cancel.isError && <p className="field-error" role="alert">{getFriendlyErrorMessage(cancel.error)}</p>}
        </section>
      )}

      <section className="card guest-items" aria-label="Presentes da lista">
        {list.items.length === 0 ? (
          <div className="public-gift-empty"><CheckCircle2 size={27} aria-hidden /><h2>Esta lista ainda não tem presentes.</h2><p>Volte daqui a pouco.</p></div>
        ) : (
          <ul className="guest-item-list">
            {list.items.map((item) => {
              const text = progressText(item);
              return (
                <li className="guest-item" key={item.id} data-testid={`guest-item-${item.id}`}>
                  <span className="guest-item-icon" aria-hidden><Gift size={22} /></span>
                  <div className="guest-item-copy">
                    <div className="guest-item-head">
                      <h2>{item.name}</h2>
                      <ItemAction item={item} onOpen={() => setSelected(item.id)} />
                    </div>
                    {item.kind !== "single" && (
                      <SplitProgress confirmed={percentOf(item.confirmed, item.goal)} committed={percentOf(item.committed, item.goal)} label={`${item.name}: ${text}`} />
                    )}
                    <p className="guest-item-progress">{text}</p>
                    {item.note && <p className="guest-item-note">{item.note}</p>}
                    {item.storeUrl ? (
                      <a className="guest-store" href={item.storeUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-store-${item.id}`}>
                        <ExternalLink size={14} aria-hidden /> ver na loja <span>· {item.storeDomain}</span>
                      </a>
                    ) : item.similarOk && (
                      <span className="guest-store-none">pode ser parecido</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p className="public-gift-note"><ShieldCheck size={16} aria-hidden /> Os valores de cada pessoa, o orçamento e os dados pessoais desta família não aparecem aqui.</p>

      {selectedItem && (
        <GuestItemModal
          key={selectedItem.id}
          item={selectedItem}
          listToken={token}
          ownerName={owner}
          pixReady={list.pixReady}
          onClose={() => { setSelected(null); refresh(); }}
          onPledged={(manageToken) => { setTokens(addManageToken(token, manageToken)); refresh(); }}
        />
      )}
      {pixOf?.pix && (
        <ModalShell labelledBy="guest-pix-title" onClose={() => setPixOf(null)}>
          <>
            <div className="modal-top">
              <div><span className="eyebrow">{pixOf.itemName}</span><h2 id="guest-pix-title">Pix de {formatCents(pixOf.pix.amountCents)}</h2></div>
              <TinyButton onClick={() => setPixOf(null)} label="Fechar" testId="button-close-guest-pix"><X size={17} /></TinyButton>
            </div>
            <PixCode {...pixOf.pix} />
          </>
        </ModalShell>
      )}
    </main>
  );
}
