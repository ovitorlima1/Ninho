import { useState } from "react";
import { QrCode } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPixAccount } from "@/lib/gift-lists-api";
import { PixModal } from "@/features/gift-lists/list-modals";

/**
 * Chave Pix da conta, no Perfil. É a mesma das listas de presentes: uma por
 * conta, usada só dentro do código Pix de quem escolhe contribuir.
 */
export function PixCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const pixQuery = useQuery({ queryKey: ["pix-account", userId], queryFn: fetchPixAccount });
  const pix = pixQuery.data?.pix ?? null;

  return (
    <section className="card gift-pix" aria-labelledby="profile-pix-title">
      <h2 className="card-title" id="profile-pix-title"><QrCode size={17} aria-hidden /> Pix para receber presentes</h2>
      {pix ? (
        <p>Chave: <strong>{pix.keyMasked}</strong> · {pix.recipientName}</p>
      ) : (
        <p>Cadastre sua chave para os convidados contribuírem com valor nas suas listas de presentes. O dinheiro cai direto na sua conta.</p>
      )}
      <button type="button" className="secondary-button" onClick={() => setOpen(true)} disabled={pixQuery.isPending} data-testid="button-profile-pix">
        {pix ? "trocar chave" : "cadastrar chave Pix"}
      </button>
      {open && (
        <PixModal
          pix={pix}
          onClose={() => setOpen(false)}
          onChanged={() => {
            void pixQuery.refetch();
            // As listas mostram se o Pix está pronto: recarregam na próxima visita.
            void qc.invalidateQueries({ queryKey: ["gift-list", userId] });
          }}
        />
      )}
    </section>
  );
}
