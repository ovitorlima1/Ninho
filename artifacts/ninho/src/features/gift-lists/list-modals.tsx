import { useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TinyButton } from "@/components/controls";
import { DraftNumberInput, parseQtyInput } from "@/components/draft-number-input";
import { ConfirmDialog, ModalShell } from "@/components/modal-shell";
import { PixCode } from "@/components/pix-code";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { formatCents, formatCentsInput, KIND_LABELS, parseCentsInput, TEMPLATE_LABELS } from "@/lib/gift-lists";
import {
  deletePixAccount,
  fetchPixTest,
  savePixAccount,
  type GiftItemInput,
  type GiftItemKind,
  type GiftListInput,
  type GiftTemplate,
  type OwnerGiftItem,
  type OwnerGiftList,
  type OwnerPledge,
  type PixAccount,
  type PledgeStatus,
} from "@/lib/gift-lists-api";

function ModalTop({ eyebrow, title, titleId, onClose }: { eyebrow: string; title: string; titleId: string; onClose: () => void }) {
  return (
    <div className="modal-top">
      <div><span className="eyebrow">{eyebrow}</span><h2 id={titleId}>{title}</h2></div>
      <TinyButton onClick={onClose} label="Fechar" testId="button-close-gift-modal"><X size={17} /></TinyButton>
    </div>
  );
}

/** Interruptor acessível: um checkbox com cara de chave. */
function Switch({ label, hint, checked, onChange, testId }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void; testId: string }) {
  return (
    <label className="switch-row">
      <span className="switch-copy"><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" role="switch" className="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} data-testid={testId} />
    </label>
  );
}

// ─── Criar lista ─────────────────────────────────────────────────────────────

const TEMPLATES: GiftTemplate[] = ["cha-de-fralda", "cha-de-bebe", "em-branco"];

export function CreateListModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: { template: GiftTemplate; name: string }) => Promise<unknown> }) {
  const [template, setTemplate] = useState<GiftTemplate>("cha-de-fralda");
  const [name, setName] = useState<string>(TEMPLATE_LABELS["cha-de-fralda"].title);
  const [touched, setTouched] = useState(false);
  const mutation = useMutation({ mutationFn: () => onCreate({ template, name: name.trim() || TEMPLATE_LABELS[template].title }) });

  const choose = (next: GiftTemplate) => {
    setTemplate(next);
    // O nome acompanha o modelo até a pessoa escrever o próprio.
    if (!touched) setName(next === "em-branco" ? "Lista de presentes" : TEMPLATE_LABELS[next].title);
  };

  return (
    <ModalShell labelledBy="create-list-title" onClose={onClose} onSubmit={() => !mutation.isPending && mutation.mutate()}>
      <>
        <ModalTop eyebrow="Presentes" title="Criar lista" titleId="create-list-title" onClose={onClose} />
        <div className="choice-list" role="radiogroup" aria-label="Modelo da lista">
          {TEMPLATES.map((id) => (
            <button
              type="button"
              key={id}
              role="radio"
              aria-checked={template === id}
              className={`choice-card ${template === id ? "is-selected" : ""}`}
              onClick={() => choose(id)}
              data-testid={`button-template-${id}`}
            >
              <span className="choice-mark" aria-hidden>{template === id && <Check size={14} />}</span>
              <span className="choice-copy"><strong>{TEMPLATE_LABELS[id].title}</strong><small>{TEMPLATE_LABELS[id].description}</small></span>
            </button>
          ))}
        </div>
        <label className="modal-label">
          Nome da lista
          <input value={name} maxLength={80} onChange={(event) => { setName(event.target.value); setTouched(true); }} data-testid="input-list-name" />
        </label>
        {mutation.isError && <p className="field-error" role="alert">{getFriendlyErrorMessage(mutation.error)}</p>}
        <button type="submit" className="primary-button" disabled={mutation.isPending} data-testid="button-confirm-create-list">
          {mutation.isPending ? "criando…" : "criar lista"}
        </button>
      </>
    </ModalShell>
  );
}

// ─── Dados da lista ──────────────────────────────────────────────────────────

export function ListSettingsModal({
  data, onClose, onSave, onDelete,
}: {
  data: OwnerGiftList;
  onClose: () => void;
  onSave: (input: GiftListInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const { list, pledges } = data;
  const [name, setName] = useState(list.name);
  const [eventDate, setEventDate] = useState(list.eventDate ?? "");
  const [eventTime, setEventTime] = useState(list.eventTime ?? "");
  const [eventPlace, setEventPlace] = useState(list.eventPlace ?? "");
  const [message, setMessage] = useState(list.message ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const save = useMutation({
    mutationFn: () => onSave({
      name: name.trim(),
      eventDate: eventDate || null,
      eventTime: eventTime || null,
      eventPlace: eventPlace.trim() || null,
      message: message.trim() || null,
    }),
    onSuccess: onClose,
  });
  const remove = useMutation({ mutationFn: onDelete });
  const active = pledges.filter((pledge) => pledge.status !== "cancelled").length;

  // A confirmação troca de lugar com o diálogo (um formulário não cabe dentro do outro).
  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title="Excluir esta lista?"
        description={active > 0
          ? `A lista sai do ar e ${active} ${active === 1 ? "reserva ou contribuição será apagada" : "reservas ou contribuições serão apagadas"}. Não dá para desfazer.`
          : "A lista sai do ar para quem tem o link. Não dá para desfazer."}
        confirmLabel="excluir lista"
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmingDelete(false)}
      />
    );
  }

  return (
    <ModalShell labelledBy="list-settings-title" onClose={onClose} onSubmit={() => !save.isPending && name.trim() && save.mutate()}>
      <>
        <ModalTop eyebrow="Presentes" title="Dados da lista" titleId="list-settings-title" onClose={onClose} />
        <label className="modal-label">
          Nome da lista
          <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} data-testid="input-list-name" />
        </label>
        <div className="item-form-row">
          <label className="modal-label">
            <span>Data do evento <small>(opcional)</small></span>
            <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} data-testid="input-list-date" />
          </label>
          <label className="modal-label">
            <span>Hora <small>(opcional)</small></span>
            <input type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} data-testid="input-list-time" />
          </label>
        </div>
        <label className="modal-label">
          <span>Local <small>(opcional)</small></span>
          <input value={eventPlace} maxLength={200} onChange={(event) => setEventPlace(event.target.value)} placeholder="Onde vai ser?" data-testid="input-list-place" />
        </label>
        <label className="modal-label">
          <span>Mensagem para os convidados <small>(opcional)</small></span>
          <textarea value={message} maxLength={280} rows={3} onChange={(event) => setMessage(event.target.value)} placeholder="Um recado de boas-vindas" data-testid="input-list-message" />
        </label>
        {(save.isError || remove.isError) && <p className="field-error" role="alert">{getFriendlyErrorMessage(save.error ?? remove.error)}</p>}
        <button type="submit" className="primary-button" disabled={save.isPending || !name.trim()} data-testid="button-save-list">
          {save.isPending ? "salvando…" : "salvar"}
        </button>
        <button type="button" className="text-action danger-action" onClick={() => setConfirmingDelete(true)} data-testid="button-delete-list">
          <Trash2 size={14} aria-hidden /> excluir esta lista
        </button>
      </>
    </ModalShell>
  );
}

// ─── Presente (item) ─────────────────────────────────────────────────────────

const KINDS: GiftItemKind[] = ["money", "units", "single"];

export function GiftItemModal({
  item, onClose, onSave, onDelete,
}: {
  /** Sem item, o diálogo cria um presente novo. */
  item: OwnerGiftItem | null;
  onClose: () => void;
  onSave: (input: GiftItemInput) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [kind, setKind] = useState<GiftItemKind>(item?.kind ?? "single");
  const [goalCents, setGoalCents] = useState<number | null>(item?.goalCents ?? null);
  const [goalUnits, setGoalUnits] = useState(item?.goalUnits ?? 1);
  const [unitLabel, setUnitLabel] = useState(item?.unitLabel ?? "unidades");
  const [note, setNote] = useState(item?.note ?? "");
  const [storeUrl, setStoreUrl] = useState(item?.storeUrl ?? "");
  const [similarOk, setSimilarOk] = useState(item?.similarOk ?? false);
  const [allowWhole, setAllowWhole] = useState(item?.allowWhole ?? true);
  const [hidden, setHidden] = useState(item?.hidden ?? false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const save = useMutation({
    mutationFn: () => onSave({
      name: name.trim(),
      kind,
      goalCents: kind === "money" ? goalCents : null,
      goalUnits: kind === "units" ? goalUnits : null,
      unitLabel: kind === "units" ? unitLabel.trim() || "unidades" : undefined,
      note: note.trim() || null,
      storeUrl: storeUrl.trim() || null,
      similarOk,
      allowWhole,
      hidden,
    }),
    onSuccess: onClose,
  });
  const remove = useMutation({ mutationFn: async () => onDelete?.(), onSuccess: onClose });
  const locked = (item?.summary.active ?? 0) > 0;

  const submit = () => {
    if (!name.trim()) return setError("Dê um nome para o presente.");
    if (kind === "money" && (!goalCents || goalCents < 100)) return setError("Informe o valor total do presente (mínimo R$ 1,00).");
    if (storeUrl.trim() && !/^https:\/\//i.test(storeUrl.trim())) return setError("Use um link que comece com https://");
    setError(null);
    if (!save.isPending) save.mutate();
  };

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title="Remover este presente?"
        description={locked ? "As reservas e contribuições deste presente também serão apagadas." : "Ele sai da lista dos convidados."}
        confirmLabel="remover presente"
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmingDelete(false)}
      />
    );
  }

  return (
    <ModalShell labelledBy="gift-item-title" onClose={onClose} onSubmit={submit}>
      <>
        <ModalTop eyebrow="Presente" title={item ? "Editar presente" : "Adicionar presente"} titleId="gift-item-title" onClose={onClose} />
        <label className="modal-label">
          Nome do presente
          <input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="ex.: carrinho de bebê" data-testid="input-gift-item-name" />
        </label>
        <fieldset className="kind-picker">
          <legend>Como os convidados podem dar?</legend>
          <div className="segmented" role="radiogroup" aria-label="Tipo de meta">
            {KINDS.map((id) => (
              <button
                type="button"
                key={id}
                role="radio"
                aria-checked={kind === id}
                className={`segmented-option ${kind === id ? "is-selected" : ""}`}
                onClick={() => setKind(id)}
                disabled={locked && kind !== id}
                data-testid={`button-gift-kind-${id}`}
              >
                {KIND_LABELS[id].title}
              </button>
            ))}
          </div>
          <p className="field-hint">{locked ? "Este presente já tem contribuições, então o tipo não muda." : KIND_LABELS[kind].hint}</p>
        </fieldset>
        {kind === "money" && (
          <label className="modal-label">
            Valor total
            <span className="price-input">
              <span aria-hidden>R$</span>
              <DraftNumberInput
                inputMode="decimal"
                value={goalCents ?? 0}
                parse={parseCentsInput}
                format={formatCentsInput}
                onChange={setGoalCents}
                placeholder="0,00"
                data-testid="input-gift-goal-cents"
              />
            </span>
          </label>
        )}
        {kind === "units" && (
          <div className="item-form-row">
            <label className="modal-label">
              Quantidade
              <DraftNumberInput inputMode="numeric" value={goalUnits} parse={parseQtyInput} format={String} onChange={setGoalUnits} data-testid="input-gift-goal-units" />
            </label>
            <label className="modal-label">
              Unidade
              <input value={unitLabel} maxLength={20} onChange={(event) => setUnitLabel(event.target.value)} placeholder="pacotes" data-testid="input-gift-unit-label" />
            </label>
          </div>
        )}
        <label className="modal-label">
          <span>Link do produto <small>(opcional)</small></span>
          <input type="url" inputMode="url" value={storeUrl} maxLength={2000} onChange={(event) => setStoreUrl(event.target.value)} placeholder="https://" data-testid="input-gift-store-url" />
          <span className="field-hint">Só links https. O convidado vê o nome da loja antes de abrir.</span>
        </label>
        <label className="modal-label">
          <span>Recado <small>(opcional)</small></span>
          <input value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="ex.: de preferência sem perfume" data-testid="input-gift-note" />
        </label>
        <Switch label="Pode ser parecido" hint="O convidado pode escolher outro modelo." checked={similarOk} onChange={setSimilarOk} testId="switch-gift-similar" />
        {kind === "money" && (
          <Switch label="Aceitar o presente inteiro" hint="Enquanto ninguém contribuiu, alguém pode assumir tudo." checked={allowWhole} onChange={setAllowWhole} testId="switch-gift-allow-whole" />
        )}
        {item && <Switch label="Já tenho" hint="Sai da lista dos convidados, sem apagar o histórico." checked={hidden} onChange={setHidden} testId="switch-gift-hidden" />}
        {(error || save.isError || remove.isError) && (
          <p className="field-error" role="alert">{error ?? getFriendlyErrorMessage(save.error ?? remove.error)}</p>
        )}
        <button type="submit" className="primary-button" disabled={save.isPending} data-testid="button-save-gift-item">
          <Check size={15} aria-hidden /> {save.isPending ? "salvando…" : item ? "salvar presente" : "adicionar presente"}
        </button>
        {item && onDelete && (
          <button type="button" className="text-action danger-action" onClick={() => setConfirmingDelete(true)} data-testid="button-delete-gift-item">
            <Trash2 size={14} aria-hidden /> remover presente
          </button>
        )}
      </>
    </ModalShell>
  );
}

// ─── Pix ─────────────────────────────────────────────────────────────────────

const KEY_TYPE_LABELS: Record<PixAccount["keyType"], string> = { cpf: "CPF", cnpj: "CNPJ", phone: "celular", email: "e-mail", random: "chave aleatória" };

export function PixModal({ pix, onClose, onChanged }: { pix: PixAccount | null; onClose: () => void; onChanged: () => void }) {
  const [key, setKey] = useState(pix?.key ?? "");
  const [recipientName, setRecipientName] = useState(pix?.recipientName ?? "");
  const [city, setCity] = useState(pix?.city ?? "");
  const [saved, setSaved] = useState<PixAccount | null>(null);
  const save = useMutation({
    mutationFn: () => savePixAccount({ key, recipientName, city }),
    onSuccess: ({ pix: next }) => {
      setSaved(next);
      onChanged();
    },
  });
  const remove = useMutation({ mutationFn: deletePixAccount, onSuccess: () => { onChanged(); onClose(); } });
  // O Pix de teste só é pedido depois de salvar: é a conferência no banco da própria mãe.
  const test = useQuery({ queryKey: ["pix-test", saved?.key, saved?.recipientName, saved?.city], queryFn: fetchPixTest, enabled: Boolean(saved), staleTime: Infinity });

  if (saved) {
    return (
      <ModalShell labelledBy="pix-title" onClose={onClose}>
        <>
          <ModalTop eyebrow="Chave salva" title="Confira no seu banco" titleId="pix-title" onClose={onClose} />
          <p>Chave reconhecida como <strong>{KEY_TYPE_LABELS[saved.keyType]}</strong>. Leia este Pix de teste de {formatCents(1)} no app do seu banco e confira se o nome que aparece é o seu. Não precisa pagar.</p>
          {test.data && <PixCode payload={test.data.payload} amountCents={test.data.amountCents} recipientName={test.data.recipientName} keyMasked={saved.keyMasked} />}
          {test.isError && <p className="field-error" role="alert">{getFriendlyErrorMessage(test.error)}</p>}
          <button type="button" className="primary-button" onClick={onClose} data-testid="button-pix-done">pronto</button>
        </>
      </ModalShell>
    );
  }

  return (
    <ModalShell labelledBy="pix-title" onClose={onClose} onSubmit={() => !save.isPending && save.mutate()}>
      <>
        <ModalTop eyebrow="Para receber contribuições" title="Sua chave Pix" titleId="pix-title" onClose={onClose} />
        <p>O convidado paga direto para você. A chave só aparece para quem escolhe contribuir, dentro do código do Pix.</p>
        <label className="modal-label">
          Chave Pix
          <input value={key} maxLength={120} onChange={(event) => setKey(event.target.value)} placeholder="CPF, celular, e-mail ou chave aleatória" autoComplete="off" data-testid="input-pix-key" />
          <span className="field-hint">Celular com 11 dígitos que também vale como CPF? Digite com +55.</span>
        </label>
        <label className="modal-label">
          Nome de quem recebe
          <input value={recipientName} maxLength={25} onChange={(event) => setRecipientName(event.target.value)} placeholder="Como aparece no seu banco" data-testid="input-pix-name" />
        </label>
        <label className="modal-label">
          Cidade
          <input value={city} maxLength={15} onChange={(event) => setCity(event.target.value)} data-testid="input-pix-city" />
        </label>
        {(save.isError || remove.isError) && <p className="field-error" role="alert">{getFriendlyErrorMessage(save.error ?? remove.error)}</p>}
        <button type="submit" className="primary-button" disabled={save.isPending} data-testid="button-save-pix">
          {save.isPending ? "salvando…" : "salvar chave"}
        </button>
        {pix && (
          <button type="button" className="text-action danger-action" onClick={() => remove.mutate()} disabled={remove.isPending} data-testid="button-delete-pix">
            <Trash2 size={14} aria-hidden /> remover minha chave
          </button>
        )}
      </>
    </ModalShell>
  );
}

// ─── Contribuições de um presente ────────────────────────────────────────────

function pledgeAmount(pledge: OwnerPledge, item: OwnerGiftItem): string {
  if (pledge.kind === "money") return formatCents(pledge.amountCents ?? 0);
  if (pledge.kind === "units") return `${pledge.units} ${item.unitLabel}`;
  return pledge.wholeMode === "pix" ? `Inteiro · ${formatCents(pledge.amountCents ?? 0)}` : "Inteiro · vai levar";
}

function pledgeWhen(pledge: OwnerPledge): string {
  const day = new Date(pledge.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  if (pledge.status === "confirmed") return `${day} · recebido`;
  const needsPix = pledge.kind === "money" || pledge.wholeMode === "pix";
  if (!needsPix) return `${day} · reservado`;
  return pledge.guestSaysPaid ? `${day} · disse que já fez o Pix` : `${day} · vai fazer o Pix`;
}

export function PledgesModal({
  item, pledges, onClose, onStatus, pendingId,
}: {
  item: OwnerGiftItem;
  pledges: OwnerPledge[];
  onClose: () => void;
  onStatus: (pledgeId: number, status: PledgeStatus) => void;
  pendingId: number | null;
}) {
  const active = pledges.filter((pledge) => pledge.status !== "cancelled");
  return (
    <ModalShell labelledBy="pledges-title" className="pledges-modal" onClose={onClose}>
      <>
        <ModalTop eyebrow="Contribuições" title={item.name} titleId="pledges-title" onClose={onClose} />
        {active.length === 0 ? (
          <p>Ninguém reservou este presente ainda.</p>
        ) : (
          <ul className="pledge-list">
            {active.map((pledge) => (
              <li className="pledge-row" key={pledge.id} data-testid={`pledge-row-${pledge.id}`}>
                <div className="pledge-copy">
                  <strong>{pledge.guestName || "Alguém"}</strong>
                  <small>{pledgeWhen(pledge)}{pledge.kind !== "units" && pledge.wholeMode !== "bring" ? ` · ${pledge.code}` : ""}</small>
                </div>
                <span className="pledge-amount">{pledgeAmount(pledge, item)}</span>
                <div className="pledge-actions">
                  {pledge.status === "promised" ? (
                    <>
                      <button type="button" className="primary-button pledge-confirm" onClick={() => onStatus(pledge.id, "confirmed")} disabled={pendingId === pledge.id} data-testid={`button-pledge-confirm-${pledge.id}`}>
                        <Check size={14} aria-hidden /> Recebi
                      </button>
                      <button type="button" className="text-action" onClick={() => onStatus(pledge.id, "cancelled")} disabled={pendingId === pledge.id} data-testid={`button-pledge-cancel-${pledge.id}`}>
                        não veio
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="badge badge-mint">recebido</span>
                      <button type="button" className="text-action" onClick={() => onStatus(pledge.id, "promised")} disabled={pendingId === pledge.id} data-testid={`button-pledge-undo-${pledge.id}`}>
                        desfazer
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="field-hint">Toque em “Recebi” quando o presente ou o Pix chegar. “Não veio” desfaz a promessa e devolve o saldo para a lista.</p>
      </>
    </ModalShell>
  );
}
