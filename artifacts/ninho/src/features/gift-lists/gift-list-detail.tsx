import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Check, Copy, ExternalLink, Pencil, Plus, QrCode, TriangleAlert, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SplitProgress } from "@/components/progress";
import { ErrorState, LoadingSpinner } from "@/components/states";
import { copyText } from "@/lib/clipboard";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { basePath } from "@/lib/format";
import { daysUntil, eventLabel, KIND_LABELS, percentOf, progressText } from "@/lib/gift-lists";
import {
  createGiftItem,
  deleteGiftItem,
  deleteGiftList,
  fetchGiftList,
  fetchPixAccount,
  reorderGiftItems,
  updateGiftItem,
  updateGiftList,
  updatePledgeStatus,
  type OwnerGiftItem,
  type PledgeStatus,
} from "@/lib/gift-lists-api";
import { GiftItemModal, ListSettingsModal, PixModal, PledgesModal } from "@/features/gift-lists/list-modals";

function countdown(date: string | null): string | null {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return "O evento já passou";
  if (days === 0) return "É hoje";
  return days === 1 ? "Falta 1 dia" : `Faltam ${days} dias`;
}

/** /gifts/:id — uma lista de presentes: evento, link, Pix, presentes e contribuições. */
export function GiftListDetail({ userId, listId, go }: { userId: string; listId: number; go: (path: string) => void }) {
  const qc = useQueryClient();
  const key = ["gift-list", userId, listId] as const;
  const listQuery = useQuery({ queryKey: key, queryFn: () => fetchGiftList(listId) });
  const pixQuery = useQuery({ queryKey: ["pix-account", userId], queryFn: fetchPixAccount });
  const [modal, setModal] = useState<"settings" | "pix" | "new-item" | null>(null);
  const [editing, setEditing] = useState<OwnerGiftItem | null>(null);
  const [pledgesOf, setPledgesOf] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean | null>(null);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: key }),
      qc.invalidateQueries({ queryKey: ["gift-lists", userId] }),
    ]);
  };
  const pledgeMutation = useMutation({
    mutationFn: ({ pledgeId, status }: { pledgeId: number; status: PledgeStatus }) => updatePledgeStatus(listId, pledgeId, status),
    onSettled: refresh,
  });
  const orderMutation = useMutation({ mutationFn: (ids: number[]) => reorderGiftItems(listId, ids), onSettled: refresh });

  if (listQuery.isPending) return <LoadingSpinner />;
  if (listQuery.isError) {
    return (
      <div className="screen">
        <ErrorState message="Não encontramos essa lista." onRetry={() => go("/gifts")} />
      </div>
    );
  }

  const { list, pledges, pixReady } = listQuery.data;
  const link = `${window.location.origin}${basePath}/lista/${list.token}`;
  const when = eventLabel(list.eventDate, list.eventTime);
  const left = countdown(list.eventDate);
  const hasMoney = list.items.some((item) => item.kind === "money" && !item.hidden);
  const pledgesItem = list.items.find((item) => item.id === pledgesOf) ?? null;

  const move = (index: number, delta: number) => {
    const ids = list.items.map((item) => item.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    orderMutation.mutate(ids);
  };

  const copyLink = async () => {
    const ok = await copyText(link);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(null), 2400);
  };

  return (
    <div className="screen gift-list-detail">
      <div className="screen-intro">
        <button type="button" className="text-action back-action" onClick={() => go("/gifts")} data-testid="button-back-to-lists">
          <ArrowLeft size={14} aria-hidden /> minhas listas
        </button>
        <div className="detail-title-row">
          <h2 className="screen-title">{list.name}</h2>
          <button type="button" className="icon-button" onClick={() => setModal("settings")} aria-label="Editar dados da lista" data-testid="button-edit-list">
            <Pencil size={17} />
          </button>
        </div>
        {list.message && <p className="screen-lead">{list.message}</p>}
      </div>

      <section className="tile tile-peach tile-static gift-event" aria-label="Evento">
        <span className="tile-kicker"><CalendarDays size={14} aria-hidden /> {when || "Sem data marcada"}</span>
        <strong className="tile-value">{left ?? "Quando vai ser?"}</strong>
        <span className="tile-note">{list.eventPlace || (when ? "Local a combinar" : "Toque no lápis para informar data, hora e local.")}</span>
      </section>

      <section className="card gift-share" aria-labelledby="gift-share-heading">
        <h3 className="card-title" id="gift-share-heading">Link para os convidados</h3>
        <p className="gift-link" data-testid="text-gift-list-link">{link}</p>
        <div className="gift-share-row">
          <button type="button" className="primary-button" onClick={copyLink} data-testid="button-copy-list-link">
            {copied ? <><Check size={15} aria-hidden /> link copiado</> : <><Copy size={15} aria-hidden /> copiar link</>}
          </button>
          <a className="secondary-button" href={link} target="_blank" rel="noopener noreferrer" data-testid="link-open-public-list">
            <ExternalLink size={15} aria-hidden /> ver como convidado
          </a>
        </div>
        {copied === false && <p className="field-error" role="alert">Não deu para copiar sozinho. Selecione o endereço acima e copie.</p>}
      </section>

      <section className={`card gift-pix ${hasMoney && !pixReady ? "is-warning" : ""}`} aria-labelledby="gift-pix-heading">
        <h3 className="card-title" id="gift-pix-heading"><QrCode size={17} aria-hidden /> Pix para contribuições</h3>
        {pixQuery.data?.pix ? (
          <p>Chave: <strong>{pixQuery.data.pix.keyMasked}</strong> · {pixQuery.data.pix.recipientName}</p>
        ) : hasMoney ? (
          <p role="status"><TriangleAlert size={15} aria-hidden /> Cadastre sua chave Pix para os convidados contribuírem com valor. Sem ela, só dá para assumir o presente inteiro.</p>
        ) : (
          <p>Só é preciso se algum presente tiver meta em reais.</p>
        )}
        <button type="button" className="secondary-button" onClick={() => setModal("pix")} data-testid="button-open-pix">
          {pixQuery.data?.pix ? "trocar chave" : "cadastrar chave Pix"}
        </button>
      </section>

      <section className="card gift-items" aria-labelledby="gift-items-heading">
        <div className="card-header">
          <h3 className="card-title" id="gift-items-heading">Presentes</h3>
          <button type="button" className="icon-button" onClick={() => setModal("new-item")} aria-label="Adicionar presente" data-testid="button-add-gift-item">
            <Plus size={18} />
          </button>
        </div>
        {list.items.length === 0 && (
          <div className="empty-category">
            <p>Nenhum presente nesta lista ainda.</p>
            <button type="button" className="text-action" onClick={() => setModal("new-item")} data-testid="button-add-first-gift-item">
              <Plus size={13} aria-hidden /> adicionar o primeiro
            </button>
          </div>
        )}
        <ul className="gift-item-list" aria-busy={orderMutation.isPending}>
          {list.items.map((item, index) => {
            const { summary } = item;
            const count = summary.active;
            return (
              <li className={`gift-item-row ${item.hidden ? "is-hidden" : ""}`} key={item.id} data-testid={`gift-item-${item.id}`}>
                <button type="button" className="gift-item-main" onClick={() => setEditing(item)} data-testid={`button-edit-gift-item-${item.id}`}>
                  <span className="gift-item-name">
                    <strong>{item.name}</strong>
                    <span className="badge">{KIND_LABELS[item.kind].title}</span>
                    {item.hidden && <span className="badge badge-butter">já tenho</span>}
                    {summary.state === "complete" && <span className="badge badge-mint">completo</span>}
                    {summary.state === "whole" && <span className="badge badge-peach">presente inteiro</span>}
                  </span>
                  {item.kind !== "single" && (
                    <SplitProgress
                      confirmed={percentOf(summary.confirmed, summary.goal)}
                      committed={percentOf(summary.committed, summary.goal)}
                      label={`${item.name}: ${progressText({ ...summary, kind: item.kind, unitLabel: item.unitLabel })}`}
                    />
                  )}
                  <small>{progressText({ ...summary, kind: item.kind, unitLabel: item.unitLabel })}</small>
                </button>
                <div className="gift-item-tools">
                  <button type="button" className="text-action" onClick={() => setPledgesOf(item.id)} data-testid={`button-gift-pledges-${item.id}`}>
                    <Users size={14} aria-hidden /> {count === 0 ? "ninguém ainda" : count === 1 ? "1 pessoa" : `${count} pessoas`}
                  </button>
                  <span className="gift-item-order">
                    <button type="button" className="icon-button" onClick={() => move(index, -1)} disabled={index === 0 || orderMutation.isPending} aria-label={`Subir ${item.name}`} data-testid={`button-gift-up-${item.id}`}>
                      <ArrowUp size={15} />
                    </button>
                    <button type="button" className="icon-button" onClick={() => move(index, 1)} disabled={index === list.items.length - 1 || orderMutation.isPending} aria-label={`Descer ${item.name}`} data-testid={`button-gift-down-${item.id}`}>
                      <ArrowDown size={15} />
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        {(pledgeMutation.isError || orderMutation.isError) && (
          <p className="field-error" role="alert">{getFriendlyErrorMessage(pledgeMutation.error ?? orderMutation.error)}</p>
        )}
        {list.items.length > 0 && (
          <button type="button" className="text-action" onClick={() => setModal("new-item")} data-testid="button-add-gift-item-bottom">
            <Plus size={16} aria-hidden /> adicionar presente
          </button>
        )}
      </section>

      {modal === "settings" && (
        <ListSettingsModal
          data={listQuery.data}
          onClose={() => setModal(null)}
          onSave={async (input) => { await updateGiftList(listId, input); await refresh(); }}
          onDelete={async () => {
            await deleteGiftList(listId);
            await qc.invalidateQueries({ queryKey: ["gift-lists", userId] });
            go("/gifts");
          }}
        />
      )}
      {modal === "pix" && (
        <PixModal
          pix={pixQuery.data?.pix ?? null}
          onClose={() => setModal(null)}
          onChanged={() => { void pixQuery.refetch(); void refresh(); }}
        />
      )}
      {modal === "new-item" && (
        <GiftItemModal
          item={null}
          onClose={() => setModal(null)}
          onSave={async (input) => { await createGiftItem(listId, input); await refresh(); }}
        />
      )}
      {editing && (
        <GiftItemModal
          item={editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => { await updateGiftItem(listId, editing.id, input); await refresh(); }}
          onDelete={async () => { await deleteGiftItem(listId, editing.id); await refresh(); }}
        />
      )}
      {pledgesItem && (
        <PledgesModal
          item={pledgesItem}
          pledges={pledges.filter((pledge) => pledge.itemId === pledgesItem.id)}
          onClose={() => setPledgesOf(null)}
          onStatus={(pledgeId, status) => pledgeMutation.mutate({ pledgeId, status })}
          pendingId={pledgeMutation.isPending ? pledgeMutation.variables.pledgeId : null}
        />
      )}
    </div>
  );
}
