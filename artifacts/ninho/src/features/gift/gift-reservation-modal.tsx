import { useState } from "react";
import { Gift, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { ContactFields, useGuestContact } from "@/components/contact-fields";
import { TinyButton } from "@/components/controls";
import { ModalShell } from "@/components/modal-shell";
import { reservePublicGift, type GiftReservationStatus, type PublicGiftItem } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { saveGuestContact } from "@/lib/guest-contact";

export function GiftReservationModal({
  item, token, ownerName, onClose, onReserved,
}: {
  item: PublicGiftItem;
  token: string;
  /** Nome de quem recebe, para o aviso de privacidade. */
  ownerName: string | null;
  onClose: () => void;
  onReserved: () => void;
}) {
  const { contact, errors, change, check } = useGuestContact();
  const [showName, setShowName] = useState(true);
  const [status, setStatus] = useState<GiftReservationStatus>("vou presentear");
  const mutation = useMutation({
    mutationFn: (who: { guestName: string; guestPhone: string }) => reservePublicGift(token, { itemId: item.id, ...who, showName, status }),
    onSuccess: () => {
      saveGuestContact(contact);
      onReserved();
      onClose();
    },
  });

  const submit = () => {
    if (mutation.isPending) return;
    const who = check();
    if (who) mutation.mutate(who);
  };
  const name = contact.name.trim();

  return (
    <ModalShell
      className="gift-reservation-modal"
      labelledBy="reserve-gift-title"
      onClose={onClose}
      onSubmit={submit}
    >
      <>
        <div className="modal-top">
          <div><span className="eyebrow">Um presente com carinho</span><h2 id="reserve-gift-title">{item.name}</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-gift-reservation"><X size={17} /></TinyButton>
        </div>
        <p>Você está reservando {item.qty > 1 ? `${item.qty} unidades` : "este item"} para que ele não se repita.</p>
        <ContactFields contact={contact} errors={errors} onChange={change} ownerName={ownerName} testIdPrefix="gift-guest" />
        <label className="switch-row">
          <span className="switch-copy">
            <strong>Mostrar meu nome na lista</strong>
            <small>{name ? `Os outros convidados veem “${name}”.` : "Os outros convidados veem “já escolhido”."}</small>
          </span>
          <input type="checkbox" role="switch" className="switch" checked={showName} onChange={(event) => setShowName(event.target.checked)} data-testid="switch-gift-show-name" />
        </label>
        <fieldset className="gift-status-picker">
          <legend>Como você quer marcar?</legend>
          <button type="button" className={status === "vou presentear" ? "selected" : ""} onClick={() => setStatus("vou presentear")} data-testid="button-gift-status-intend">
            vou presentear
          </button>
          <button type="button" className={status === "presenteado" ? "selected" : ""} onClick={() => setStatus("presenteado")} data-testid="button-gift-status-gifted">
            já presenteei
          </button>
        </fieldset>
        {mutation.isError && <p className="gift-share-error" role="alert">{getFriendlyErrorMessage(mutation.error)}</p>}
        <button type="submit" className="primary-button" disabled={mutation.isPending} data-testid="button-confirm-gift-reservation">
          <Gift size={15} /> {mutation.isPending ? "reservando…" : "confirmar reserva"}
        </button>
      </>
    </ModalShell>
  );
}
