import { useState } from "react";
import { CheckCircle2, ClipboardCheck, Gift, Heart, Link2, Sparkles, Utensils } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Brand } from "@/components/brand";
import { LoadingSpinner } from "@/components/states";
import { fetchPublicGiftList, type CategoryKey, type PublicGiftItem } from "@/lib/api";
import { GiftReservationModal } from "@/features/gift/gift-reservation-modal";

const iconForCategory = (cat: CategoryKey) =>
  cat === "Alimentação" ? Utensils : cat === "Higiene" ? ClipboardCheck : cat === "Acessórios" ? Sparkles : Heart;

export function PublicGiftPage() {
  const [, params] = useRoute("/gift/:token");
  const token = params?.token || "";
  const [selectedItem, setSelectedItem] = useState<PublicGiftItem | null>(null);
  const listQuery = useQuery({
    queryKey: ["public-gift-list", token],
    queryFn: () => fetchPublicGiftList(token),
    enabled: Boolean(token),
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });
  const qc = useQueryClient();
  const title = listQuery.data?.ownerName ? `Lista de presentes de ${listQuery.data.ownerName}` : "Lista de presentes";

  if (listQuery.isPending) {
    return <div className="public-gift-page"><LoadingSpinner /></div>;
  }

  if (listQuery.isError || !listQuery.data) {
    return (
      <main className="public-gift-page public-gift-state">
        <Brand />
        <div className="public-gift-invalid">
          <Link2 size={30} />
          <span className="eyebrow">LINK INDISPONÍVEL</span>
          <h1>Esta lista não está mais disponível.</h1>
          <p>Ela pode ter sido revogada ou o endereço não está completo. Peça um novo link para quem compartilhou.</p>
        </div>
      </main>
    );
  }

  const { items, babyName } = listQuery.data;
  const available = items.filter((item) => !item.reserved).length;
  return (
    <main className="public-gift-page">
      <header className="public-gift-header">
        <Brand />
        <span className="eyebrow">Lista compartilhada com carinho</span>
      </header>
      <section className="public-gift-hero">
        <span className="eyebrow">CHEGADA EM PREPARO</span>
        <h1>{title}</h1>
        <p>{babyName ? `Para celebrar a chegada de ${babyName}.` : "Uma seleção de itens para cuidar da nova chegada."}</p>
        <div className="public-gift-summary"><Gift size={15} /><span>{available} {available === 1 ? "item disponível" : "itens disponíveis"} para presentear</span></div>
      </section>
      <section className="public-gift-list" aria-label="Itens para presentear">
        {items.length === 0 ? (
          <div className="public-gift-empty"><CheckCircle2 size={27} /><h2>Todos os itens já foram resolvidos.</h2><p>Que bonito ver tanta gente cuidando desta chegada.</p></div>
        ) : items.map((item) => {
          const Icon = iconForCategory(item.category as CategoryKey);
          return (
            <article className={`public-gift-item ${item.reserved ? "is-reserved" : ""}`} key={item.id}>
              <span className="public-gift-item-icon"><Icon size={17} /></span>
              <div className="public-gift-item-copy">
                <small>{item.category} · {item.qty} {item.qty === 1 ? "unidade" : "unidades"}</small>
                <h2>{item.name}</h2>
                {item.reserved && <p><CheckCircle2 size={13} /> {item.reservation?.guestName ? `${item.reservation.guestName} ${item.reservation.status}` : `Item ${item.reservation?.status || "reservado"}`}</p>}
              </div>
              {item.reserved ? (
                <span className="public-gift-reserved">reservado</span>
              ) : (
                <button type="button" onClick={() => setSelectedItem(item)} data-testid={`button-reserve-gift-${item.id}`}>
                  <Gift size={14} /> vou presentear
                </button>
              )}
            </article>
          );
        })}
      </section>
      <p className="public-gift-note">Os valores, o orçamento e os dados pessoais desta família não aparecem aqui.</p>
      {selectedItem && (
        <GiftReservationModal
          item={selectedItem}
          token={token}
          onClose={() => setSelectedItem(null)}
          onReserved={() => qc.invalidateQueries({ queryKey: ["public-gift-list", token] })}
        />
      )}
    </main>
  );
}
