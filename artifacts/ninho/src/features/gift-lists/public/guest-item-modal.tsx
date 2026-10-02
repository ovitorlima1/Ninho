import { useState } from "react";
import { Check, Copy, ExternalLink, Gift, Heart, Minus, Plus, ShieldCheck, Sparkles, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { TinyButton } from "@/components/controls";
import { ModalShell } from "@/components/modal-shell";
import { PixCode } from "@/components/pix-code";
import { SplitProgress } from "@/components/progress";
import { copyText } from "@/lib/clipboard";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { formatCents, formatCentsShort, parseCentsInput, percentOf, progressText, suggestedAmounts } from "@/lib/gift-lists";
import {
  createPledge,
  markPledgePaid,
  type GuestPledge,
  type PledgeInput,
  type PublicGiftListItem,
  type WholeMode,
} from "@/lib/gift-lists-api";

type Step = "choose" | "amount" | "units" | "whole" | "pix" | "done";

function firstStep(item: PublicGiftListItem): Step {
  if (item.kind === "units") return "units";
  if (item.kind === "single") return "whole";
  return "choose";
}

/** Recado, link da loja e "pode ser parecido": o que a mãe disse sobre o presente. */
function ItemNotes({ item }: { item: PublicGiftListItem }) {
  return (
    <>
      {item.storeUrl && (
        <a className="store-link" href={item.storeUrl} target="_blank" rel="noopener noreferrer" data-testid="link-guest-store">
          <ExternalLink size={16} aria-hidden /><span>Ver o modelo na loja</span><small>{item.storeDomain}</small>
        </a>
      )}
      {(item.note || item.similarOk) && (
        <p className="guest-note">
          <Sparkles size={16} aria-hidden />
          <span>{item.note}{item.note && item.similarOk ? " " : ""}{item.similarOk && "Pode ser parecido."}</span>
        </p>
      )}
    </>
  );
}

/**
 * Folha do convidado para um presente: escolher como dar, informar o valor ou
 * a quantidade, ver o Pix e receber o link para gerenciar a reserva.
 */
export function GuestItemModal({
  item, listToken, ownerName, pixReady, onClose, onPledged,
}: {
  item: PublicGiftListItem;
  listToken: string;
  ownerName: string;
  pixReady: boolean;
  onClose: () => void;
  /** Guarda o link de gerenciamento e atualiza a lista. */
  onPledged: (manageToken: string) => void;
}) {
  const [step, setStep] = useState<Step>(() => firstStep(item));
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [usingCustom, setUsingCustom] = useState(false);
  const [units, setUnits] = useState(1);
  const [wholeMode, setWholeMode] = useState<WholeMode>("bring");
  const [guestName, setGuestName] = useState("");
  const [showName, setShowName] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pledge: GuestPledge; manageToken: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean | null>(null);

  const pledge = useMutation({
    mutationFn: (input: PledgeInput) => createPledge(listToken, input),
    onSuccess: (data) => {
      setResult(data);
      onPledged(data.manageToken);
      setStep(data.pledge.pix ? "pix" : "done");
    },
  });
  const paid = useMutation({
    mutationFn: () => markPledgePaid(listToken, result!.manageToken, true),
    onSettled: () => setStep("done"),
  });

  const name = guestName.trim() || null;
  const chosenCents = usingCustom ? parseCentsInput(customAmount) : amountCents;
  const suggestions = suggestedAmounts(item.remaining);
  const manageLink = result ? `${window.location.origin}${window.location.pathname}#p=${result.manageToken}` : "";
  const summaryText = progressText(item);

  const submitAmount = () => {
    if (chosenCents === null || chosenCents < 100) return setError("Escolha um valor a partir de R$ 1,00.");
    if (chosenCents > item.remaining) return setError(`Faltam só ${formatCents(item.remaining)} para este presente.`);
    setError(null);
    pledge.mutate({ itemId: item.id, kind: "money", amountCents: chosenCents, guestName: name });
  };
  const submitUnits = () => pledge.mutate({ itemId: item.id, kind: "units", units, guestName: name });
  const submitWhole = () => pledge.mutate({
    itemId: item.id,
    kind: "whole",
    wholeMode: item.kind === "money" ? wholeMode : undefined,
    guestName: name,
    showName: Boolean(name) && showName,
  });
  const onSubmit = step === "amount" ? submitAmount : step === "units" ? submitUnits : step === "whole" ? submitWhole : undefined;

  const top = (eyebrow: string, title: string) => (
    <div className="modal-top">
      <div><span className="eyebrow">{eyebrow}</span><h2 id="guest-item-title">{title}</h2></div>
      <TinyButton onClick={onClose} label="Fechar" testId="button-close-guest-item"><X size={17} /></TinyButton>
    </div>
  );
  const nameField = (
    <label className="modal-label">
      <span>Seu nome <small>(opcional)</small></span>
      <input value={guestName} maxLength={120} onChange={(event) => setGuestName(event.target.value)} placeholder="Como a família vai reconhecer você?" data-testid="input-guest-name" />
    </label>
  );
  const failure = (error || pledge.isError) && (
    <p className="field-error" role="alert">{error ?? getFriendlyErrorMessage(pledge.error)}</p>
  );

  return (
    <ModalShell labelledBy="guest-item-title" className="guest-item-modal" onClose={onClose} onSubmit={onSubmit} focusKey={step}>
      <>
        {step === "choose" && (
          <>
            {top("Presente para a chegada", item.name)}
            <div className="guest-progress">
              <div className="guest-progress-line">
                <strong>{formatCentsShort(item.committed)} de {formatCentsShort(item.goal)}</strong>
                <strong className="guest-remaining">faltam {formatCentsShort(item.remaining)}</strong>
              </div>
              <SplitProgress size="lg" confirmed={percentOf(item.confirmed, item.goal)} committed={percentOf(item.committed, item.goal)} label={`${item.name}: ${summaryText}`} />
              <p className="tape-legend"><span className="legend-dot" /> já recebido <span className="legend-dot legend-dot-promised" /> prometido</p>
            </div>
            <ItemNotes item={item} />
            {pixReady ? (
              <button type="button" className="primary-button" onClick={() => setStep("amount")} data-testid="button-guest-contribute">
                <Heart size={16} aria-hidden /> Contribuir com um valor
              </button>
            ) : (
              <p className="field-hint">Esta lista ainda não aceita contribuições em valor.</p>
            )}
            {item.canWhole ? (
              <button type="button" className="secondary-button" onClick={() => setStep("whole")} data-testid="button-guest-whole">
                <Gift size={16} aria-hidden /> Dar o presente inteiro
              </button>
            ) : pixReady && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => { setUsingCustom(false); setAmountCents(item.remaining); setStep("amount"); }}
                data-testid="button-guest-complete"
              >
                Completar o que falta · {formatCentsShort(item.remaining)}
              </button>
            )}
          </>
        )}

        {step === "amount" && (
          <>
            {top(`${item.name} · faltam ${formatCentsShort(item.remaining)}`, "Com quanto você quer participar?")}
            <div className="amount-grid" role="group" aria-label="Valor da contribuição">
              {suggestions.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={`amount-chip ${!usingCustom && amountCents === value ? "is-selected" : ""}`}
                  aria-pressed={!usingCustom && amountCents === value}
                  onClick={() => { setUsingCustom(false); setAmountCents(value); setError(null); }}
                  data-testid={`button-amount-${value}`}
                >
                  {formatCentsShort(value)}
                </button>
              ))}
              <button
                type="button"
                className={`amount-chip ${usingCustom ? "is-selected" : ""}`}
                aria-pressed={usingCustom}
                onClick={() => { setUsingCustom(true); setError(null); }}
                data-testid="button-amount-custom"
              >
                Outro
              </button>
              <button
                type="button"
                className={`amount-chip amount-chip-wide ${!usingCustom && amountCents === item.remaining ? "is-selected" : ""}`}
                aria-pressed={!usingCustom && amountCents === item.remaining}
                onClick={() => { setUsingCustom(false); setAmountCents(item.remaining); setError(null); }}
                data-testid="button-amount-rest"
              >
                Completar o que falta · {formatCentsShort(item.remaining)}
              </button>
            </div>
            {usingCustom && (
              <label className="modal-label">
                Outro valor
                <span className="price-input">
                  <span aria-hidden>R$</span>
                  <input inputMode="decimal" value={customAmount} onChange={(event) => { setCustomAmount(event.target.value); setError(null); }} placeholder="0,00" data-testid="input-amount-custom" />
                </span>
              </label>
            )}
            {nameField}
            <p className="privacy-note"><ShieldCheck size={16} aria-hidden /><span>Só {ownerName} vê quem deu e quanto. Os outros convidados veem apenas quanto falta.</span></p>
            {failure}
            <button type="submit" className="primary-button" disabled={pledge.isPending} data-testid="button-confirm-amount">
              {pledge.isPending ? "registrando…" : chosenCents ? `Continuar para o Pix · ${formatCentsShort(chosenCents)}` : "Continuar para o Pix"}
            </button>
          </>
        )}

        {step === "units" && (
          <>
            {top("Um presente com carinho", item.name)}
            <p>Faltam {item.remaining} {item.unitLabel}.</p>
            <ItemNotes item={item} />
            <div className="stepper-row">
              <span id="guest-units-label">Quantos {item.unitLabel}?</span>
              <div className="stepper" role="group" aria-labelledby="guest-units-label">
                <button type="button" onClick={() => setUnits((value) => Math.max(1, value - 1))} disabled={units <= 1} aria-label="Diminuir" data-testid="button-units-minus"><Minus size={18} /></button>
                <output aria-live="polite" data-testid="text-units">{units}</output>
                <button type="button" onClick={() => setUnits((value) => Math.min(item.remaining, value + 1))} disabled={units >= item.remaining} aria-label="Aumentar" data-testid="button-units-plus"><Plus size={18} /></button>
              </div>
            </div>
            {nameField}
            {failure}
            <button type="submit" className="primary-button" disabled={pledge.isPending} data-testid="button-confirm-units">
              <Gift size={16} aria-hidden /> {pledge.isPending ? "reservando…" : `Reservar ${units} ${item.unitLabel}`}
            </button>
          </>
        )}

        {step === "whole" && (
          <>
            {top(item.kind === "money" ? `${item.name} · ${formatCentsShort(item.goal)}` : "Um presente com carinho", item.kind === "money" ? "Dar o presente inteiro" : item.name)}
            {item.kind === "single" && item.referenceCents ? <p>Valor de referência: {formatCents(item.referenceCents)}.</p> : null}
            <ItemNotes item={item} />
            {item.kind === "money" && (
              <div className="choice-list" role="radiogroup" aria-label="Como você vai dar o presente">
                <button type="button" role="radio" aria-checked={wholeMode === "bring"} className={`choice-card ${wholeMode === "bring" ? "is-selected" : ""}`} onClick={() => setWholeMode("bring")} data-testid="button-whole-bring">
                  <span className="choice-mark" aria-hidden>{wholeMode === "bring" && <Check size={14} />}</span>
                  <span className="choice-copy"><strong>Vou comprar e levar</strong><small>{ownerName} recebe o presente em mãos.</small></span>
                </button>
                <button type="button" role="radio" aria-checked={wholeMode === "pix"} className={`choice-card ${wholeMode === "pix" ? "is-selected" : ""}`} onClick={() => setWholeMode("pix")} disabled={!pixReady} data-testid="button-whole-pix">
                  <span className="choice-mark" aria-hidden>{wholeMode === "pix" && <Check size={14} />}</span>
                  <span className="choice-copy"><strong>Vou mandar o valor por Pix</strong><small>{pixReady ? `${formatCents(item.goal)}, com o QR Code na próxima tela.` : "Esta lista ainda não aceita Pix."}</small></span>
                </button>
              </div>
            )}
            {nameField}
            <label className="switch-row">
              <span className="switch-copy"><strong>Mostrar meu nome na lista</strong><small>{name ? `Os outros convidados veem “Presente de ${name}”.` : "Preencha seu nome para ele aparecer."}</small></span>
              <input type="checkbox" role="switch" className="switch" checked={Boolean(name) && showName} disabled={!name} onChange={(event) => setShowName(event.target.checked)} data-testid="switch-show-name" />
            </label>
            {failure}
            <button type="submit" className="primary-button" disabled={pledge.isPending} data-testid="button-confirm-whole">
              <Gift size={16} aria-hidden /> {pledge.isPending ? "reservando…" : "Reservar o presente inteiro"}
            </button>
            <p className="field-hint">O presente fecha para os outros convidados. Mudou de ideia? Cancele por esta mesma página.</p>
          </>
        )}

        {step === "pix" && result?.pledge.pix && (
          <>
            {top(item.name, `Pix de ${formatCents(result.pledge.pix.amountCents)} para ${ownerName}`)}
            <PixCode {...result.pledge.pix} />
            <p className="privacy-note"><span>Sua contribuição fica como <strong>prometida</strong>. Quando o Pix cair, {ownerName} confirma.</span></p>
            <button type="button" className="primary-button" onClick={() => paid.mutate()} disabled={paid.isPending} data-testid="button-pix-paid">
              <Check size={16} aria-hidden /> Já fiz o Pix
            </button>
            <button type="button" className="secondary-button" onClick={() => setStep("done")} data-testid="button-pix-later">Vou fazer depois</button>
          </>
        )}

        {step === "done" && result && (
          <>
            {top("Tudo certo", name ? `Reserva feita, ${name}.` : "Reserva feita.")}
            <p className="guest-done" role="status">
              <Check size={18} aria-hidden />
              <span>
                {result.pledge.kind === "money" && `${formatCents(result.pledge.amountCents ?? 0)} para ${item.name}.`}
                {result.pledge.kind === "units" && `${result.pledge.units} ${item.unitLabel} de ${item.name} no seu nome.`}
                {result.pledge.kind === "whole" && `${item.name} é presente seu.`}
                {" "}{ownerName} vai saber que foi você.
              </span>
            </p>
            <p>Para rever o Pix ou cancelar depois, volte a esta página neste aparelho ou guarde o seu link particular:</p>
            <button
              type="button"
              className="secondary-button"
              onClick={async () => setLinkCopied(await copyText(manageLink))}
              data-testid="button-copy-manage-link"
            >
              {linkCopied ? <><Check size={15} aria-hidden /> link copiado</> : <><Copy size={15} aria-hidden /> copiar meu link particular</>}
            </button>
            {linkCopied === false && <p className="gift-link" data-testid="text-manage-link">{manageLink}</p>}
            <button type="button" className="primary-button" onClick={onClose} data-testid="button-guest-done">Ver a lista de novo</button>
          </>
        )}
      </>
    </ModalShell>
  );
}
