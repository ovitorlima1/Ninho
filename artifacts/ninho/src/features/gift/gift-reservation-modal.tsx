import { useState } from "react";
import { Gift, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { TinyButton } from "@/components/controls";
import { ModalShell } from "@/components/modal-shell";
import { reservePublicGift, type GiftReservationStatus, type PublicGiftItem } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errors";

export function GiftReservationModal({
  item, token, onClose, onReserved,
}: {
  item: PublicGiftItem;
  token: string;
  onClose: () => void;
  onReserved: () => void;
}) {
  const [guestName, setGuestName] = useState("");
  const [status, setStatus] = useState<GiftReservationStatus>("vou presentear");
  const mutation = useMutation({
    mutationFn: () => reservePublicGift(token, {
      itemId: item.id,
      guestName: guestName.trim() || null,
      status,
    }),
    onSuccess: () => {
      onReserved();
      onClose();
    },
  });

  return (
    <ModalShell
      className="gift-reservation-modal"
      labelledBy="reserve-gift-title"
      onClose={onClose}
      onSubmit={() => !mutation.isPending && mutation.mutate()}
    >
      <>
        <div className="modal-top">
          <div><span className="eyebrow">UM PRESENTE COM CARINHO</span><h2 id="reserve-gift-title">{item.name}</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-gift-reservation"><X size={17} /></TinyButton>
        </div>
        <p>Você está reservando {item.qty > 1 ? `${item.qty} unidades` : "este item"} para que ele não se repita.</p>
        <label className="modal-label">
          SEU NOME <small>(opcional)</small>
          <input value={guestName} maxLength={120} onChange={(event) => setGuestName(event.target.value)} placeholder="Como a família vai reconhecer você?" data-testid="input-gift-guest-name" />
        </label>
        <fieldset className="gift-status-picker">
          <legend>COMO VOCÊ QUER MARCAR?</legend>
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
