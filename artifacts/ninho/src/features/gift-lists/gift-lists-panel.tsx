import { useState } from "react";
import { ChevronRight, Gift, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/progress";
import { ErrorState, LoadingSpinner } from "@/components/states";
import { eventLabel, percentOf } from "@/lib/gift-lists";
import { createGiftList, fetchGiftLists, type GiftListCard } from "@/lib/gift-lists-api";
import { CreateListModal } from "@/features/gift-lists/list-modals";

function listMeta(list: GiftListCard): string {
  const when = eventLabel(list.eventDate, list.eventTime);
  const items = `${list.doneCount} de ${list.itemCount} ${list.itemCount === 1 ? "presente resolvido" : "presentes resolvidos"}`;
  return when ? `${when} · ${items}` : items;
}

/** Aba Presentes da Lista: as listas da mãe (chá de fralda, chá de bebê…) e o botão de criar. */
export function GiftListsPanel({ userId, go }: { userId: string; go: (path: string) => void }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const listsQuery = useQuery({ queryKey: ["gift-lists", userId], queryFn: fetchGiftLists });

  if (listsQuery.isPending) return <LoadingSpinner />;
  if (listsQuery.isError) return <ErrorState message="Não foi possível carregar suas listas." onRetry={() => listsQuery.refetch()} />;

  const { lists, limit } = listsQuery.data;
  const full = lists.length >= limit;
  return (
    <div className="screen gift-lists">
      <div className="screen-intro">
        <h2 className="screen-title">Listas para presentear</h2>
        <p className="screen-lead">Monte a lista do chá, envie o link e acompanhe quem vai dar o quê.</p>
      </div>
      {lists.length === 0 ? (
        <div className="empty-state">
          <Gift size={26} aria-hidden />
          <p>Você ainda não tem uma lista de presentes.</p>
          <button type="button" className="primary-button" onClick={() => setCreating(true)} data-testid="button-create-first-list">
            <Plus size={15} aria-hidden /> criar minha primeira lista
          </button>
        </div>
      ) : (
        <>
          <ul className="gift-list-cards">
            {lists.map((list) => (
              <li key={list.id}>
                <a
                  className="card gift-list-card"
                  href={`/gifts/${list.id}`}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                    event.preventDefault();
                    go(`/gifts/${list.id}`);
                  }}
                  data-testid={`link-gift-list-${list.id}`}
                >
                  <span className="gift-list-card-copy">
                    <strong>{list.name}</strong>
                    <small>{listMeta(list)}</small>
                    <Progress value={percentOf(list.doneCount, list.itemCount)} label={`${list.name}: ${list.doneCount} de ${list.itemCount} presentes resolvidos`} />
                  </span>
                  <ChevronRight size={18} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
          <button type="button" className="secondary-button" onClick={() => setCreating(true)} disabled={full} data-testid="button-create-list">
            <Plus size={15} aria-hidden /> criar outra lista
          </button>
          {full && <p className="field-hint">Você chegou ao limite de {limit} listas. Exclua uma para criar outra.</p>}
        </>
      )}
      {creating && (
        <CreateListModal
          onClose={() => setCreating(false)}
          onCreate={async (data) => {
            const { id } = await createGiftList(data);
            await qc.invalidateQueries({ queryKey: ["gift-lists", userId] });
            setCreating(false);
            go(`/gifts/${id}`);
          }}
        />
      )}
    </div>
  );
}
