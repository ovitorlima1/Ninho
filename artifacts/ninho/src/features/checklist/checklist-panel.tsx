import { useRef, useState } from "react";
import { Activity, Check, Gift, Heart, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { CategoryBadge } from "@/components/category-icon";
import { Pill, TinyButton } from "@/components/controls";
import { GuestPhone } from "@/components/guest-phone";
import { ItemPhoto } from "@/components/item-photo";
import { Progress } from "@/components/progress";
import { type ChecklistTemplate, type GiftReservationStatus, type ItemStatus } from "@/lib/api";
import {
  MAX_CATEGORIES,
  MAX_CHECKLISTS,
  showSuggestionsNotice,
  type Checklist,
  type ListCategory,
} from "@/lib/checklists";
import { ITEM_STATUS_OPTIONS, describeItemTotal, searchItems, type ChecklistItem } from "@/lib/items";
import { enxovalProgress } from "@/lib/overview";
import { isRecommendationVisible } from "@/lib/recommendations";
import { CategoryModal, CreateChecklistModal, EditChecklistModal, LimitDialog } from "@/features/checklist/list-modals";

/** O que a tela pede para mudar em listas e categorias; cada ação só resolve depois de gravar. */
export type ChecklistActions = {
  createList: (data: { template: ChecklistTemplate; name: string }) => Promise<unknown>;
  renameList: (id: number, name: string) => Promise<unknown>;
  deleteList: (id: number) => Promise<unknown>;
  dismissNotice: (id: number) => void;
  createCategory: (listId: number, data: { name: string; icon: string }) => Promise<ListCategory>;
  updateCategory: (id: number, data: { name: string; icon: string }) => Promise<unknown>;
  deleteCategory: (id: number, moveTo: number | null) => Promise<unknown>;
};

type Dialog = "new-list" | "edit-list" | "new-category" | "edit-category" | null;

/**
 * Aba Enxoval: as listas da conta, a lista aberta com suas categorias e os itens da categoria
 * escolhida. Recebe só os itens e as categorias da lista aberta; o Workspace remonta o painel
 * (key) ao trocar de lista, então categoria escolhida e busca recomeçam.
 */
export function ChecklistPanel({
  lists, list, categories, items, actions, onSelectList,
  onToggle, onAdd, onEdit, onDelete, onOpenRecommendation, onUnlinkRecommendation,
  onReleaseGiftReservation, onUpdateGiftReservation, pendingItemId, isActionPending,
}: {
  lists: Checklist[];
  list: Checklist;
  categories: ListCategory[];
  items: ChecklistItem[];
  actions: ChecklistActions;
  onSelectList: (id: number) => void;
  onToggle: (id: number, status: ItemStatus) => void;
  onAdd: (categoryId: number) => void;
  onEdit: (item: ChecklistItem) => void;
  onDelete: (id: number) => void;
  onOpenRecommendation: (id: string) => void;
  onUnlinkRecommendation: (id: number) => void;
  onReleaseGiftReservation: (reservationId: number) => void;
  onUpdateGiftReservation: (reservationId: number, status: GiftReservationStatus) => void;
  /** Só a linha que está gravando fica travada; o resto da lista continua viva. */
  pendingItemId: number | null;
  isActionPending: boolean;
}) {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // Categoria excluída ou ainda não escolhida: vale a primeira da lista.
  const category = categories.find((c) => c.id === categoryId) ?? categories[0];
  const visible = items.filter((i) => i.categoryId === category?.id);
  const progress = enxovalProgress(items);
  const allDone = progress.done;
  const rowActions = {
    onToggle, onEdit, onDelete, onOpenRecommendation, onUnlinkRecommendation,
    onReleaseGiftReservation, onUpdateGiftReservation, pendingItemId,
  };
  // A busca atravessa as categorias da lista aberta: com texto no campo, o chip deixa de valer.
  const searching = query.trim() !== "";
  const results = searchItems(items, query, categories);
  const found = results.reduce((n, g) => n + g.items.length, 0);
  const clearSearch = () => {
    setQuery("");
    searchRef.current?.focus();
  };

  return (
    <div className="screen checklist">
      <nav className="list-switcher" aria-label="Suas listas">
        {lists.map((other) => (
          <button
            type="button"
            key={other.id}
            className={`list-chip ${other.id === list.id ? "is-current" : ""}`}
            aria-current={other.id === list.id ? "true" : undefined}
            onClick={() => onSelectList(other.id)}
            data-testid={`button-list-${other.id}`}
          >
            {other.name}
          </button>
        ))}
        <button type="button" className="list-chip list-chip-add" onClick={() => setDialog("new-list")} data-testid="button-new-list">
          <Plus size={16} aria-hidden /> nova lista
        </button>
      </nav>
      <div className="screen-intro">
        <div className="list-heading">
          <h2 className="screen-title" data-testid="text-list-name">{list.name}</h2>
          <TinyButton onClick={() => setDialog("edit-list")} label={`Editar a lista ${list.name}`} testId="button-edit-list"><Pencil size={16} /></TinyButton>
        </div>
        <p className="screen-lead"><strong>{allDone} de {items.length}</strong> itens resolvidos. Toque em um item para ajustar quantidade e preço.</p>
        <Progress value={progress.percent} label={`${list.name}: ${allDone} de ${items.length} itens resolvidos`} />
      </div>
      {showSuggestionsNotice(list, items) && (
        <div className="suggestion-notice" role="note" data-testid="suggestions-notice">
          <span className="suggestion-notice-icon" aria-hidden><Sparkles size={18} /></span>
          <p>
            <strong>Começamos com sugestões do Ninho.</strong>{" "}
            Apague, edite e acrescente à vontade. Quantidades e preços são estimativas.
          </p>
          <button type="button" className="secondary-button" onClick={() => actions.dismissNotice(list.id)} data-testid="button-dismiss-suggestions">
            entendi
          </button>
        </div>
      )}
      <div className="list-search">
        <Search size={18} aria-hidden />
        <label className="visually-hidden" htmlFor="checklist-search">Buscar item</label>
        <input
          ref={searchRef}
          id="checklist-search"
          type="search"
          placeholder="Buscar item"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query) {
              e.preventDefault();
              setQuery("");
            }
          }}
          data-testid="input-checklist-search"
        />
        {query && (
          <button type="button" className="list-search-clear" onClick={clearSearch} aria-label="Limpar busca" data-testid="button-clear-checklist-search">
            <X size={16} aria-hidden />
          </button>
        )}
      </div>
      <p className="visually-hidden" role="status">
        {searching ? `${found} ${found === 1 ? "item encontrado" : "itens encontrados"}` : ""}
      </p>
      <div className="filter-row" role="group" aria-label="Categorias">
        {categories.map((c) => (
          <Pill key={c.id} active={!searching && category?.id === c.id} onClick={() => { setCategoryId(c.id); setQuery(""); }} testId={`button-phone-category-${c.name.toLowerCase().replace(/\s+/g, "-")}`}>
            <CategoryBadge icon={c.icon} tone={c.tone} small />{c.name}
          </Pill>
        ))}
        <button type="button" className="pill pill-add" onClick={() => setDialog("new-category")} data-testid="button-new-category">
          <Plus size={14} aria-hidden /> categoria
        </button>
      </div>
      {searching ? (
        <section className="card checklist-card" aria-labelledby="checklist-category-title">
          <div className="card-header">
            <h2 className="card-title" id="checklist-category-title">Resultados para “{query.trim()}”</h2>
          </div>
          <div className="check-list" aria-busy={isActionPending}>
            {results.length === 0 && (
              <div className="empty-category">
                <p>Nenhum item com “{query.trim()}”.</p>
                <button type="button" className="text-action" onClick={clearSearch} data-testid="button-empty-clear-checklist-search">
                  <X size={13} aria-hidden /> limpar busca
                </button>
              </div>
            )}
            {results.map((group) => (
              <div className="search-group" key={group.category.id}>
                <h3 className="search-group-title"><CategoryBadge icon={group.category.icon} tone={group.category.tone} small />{group.category.name}</h3>
                {group.items.map((item) => <ItemRow key={item.id} item={item} {...rowActions} />)}
              </div>
            ))}
          </div>
        </section>
      ) : category && (
        <section className="card checklist-card" aria-labelledby="checklist-category-title">
          <div className="card-header">
            <h2 className="card-title card-title-with-badge" id="checklist-category-title"><CategoryBadge icon={category.icon} tone={category.tone} small />{category.name}</h2>
            <div className="card-header-actions">
              <TinyButton onClick={() => setDialog("edit-category")} label={`Editar a categoria ${category.name}`} testId="button-edit-category"><Pencil size={16} /></TinyButton>
              <TinyButton onClick={() => onAdd(category.id)} label={`Adicionar item em ${category.name}`} testId="button-phone-add-item"><Plus size={18} /></TinyButton>
            </div>
          </div>
          <div className="check-list" aria-busy={isActionPending}>
            {visible.length === 0 && (
              <div className="empty-category">
                <p>Nenhum item em {category.name} ainda.</p>
                <button type="button" className="text-action" onClick={() => onAdd(category.id)} data-testid="button-phone-add-category-item">
                  <Plus size={13} /> adicionar primeiro item
                </button>
              </div>
            )}
            {visible.map((item) => <ItemRow key={item.id} item={item} {...rowActions} />)}
          </div>
          <button type="button" className="text-action" onClick={() => onAdd(category.id)} data-testid="button-phone-add-list-item">
            <Plus size={16} aria-hidden /> adicionar item
          </button>
        </section>
      )}
      <div className="log-card">
        <div className="log-title"><Activity size={15} /> seu progresso</div>
        <div className="log-row"><span className="log-dot" /><span>{allDone} de {items.length} itens resolvidos</span></div>
        {items.filter((i) => i.status !== "A comprar").slice(-1).map((i) => (
          <div className="log-row" key={i.id}><span className="log-dot dim" /><span>{i.name} marcado como {i.status.toLowerCase()}</span></div>
        ))}
      </div>

      {dialog === "new-list" && (lists.length >= MAX_CHECKLISTS ? (
        <LimitDialog
          title="Limite de listas"
          message={`Você chegou ao limite de ${MAX_CHECKLISTS} listas. Exclua uma para criar outra.`}
          onClose={() => setDialog(null)}
        />
      ) : (
        <CreateChecklistModal onClose={() => setDialog(null)} onCreate={actions.createList} />
      ))}
      {dialog === "edit-list" && (
        <EditChecklistModal
          list={list}
          itemCount={items.length}
          isOnlyList={lists.length === 1}
          onClose={() => setDialog(null)}
          onRename={(name) => actions.renameList(list.id, name)}
          onDelete={() => actions.deleteList(list.id)}
        />
      )}
      {dialog === "new-category" && (categories.length >= MAX_CATEGORIES ? (
        <LimitDialog
          title="Limite de categorias"
          message={`Esta lista chegou ao limite de ${MAX_CATEGORIES} categorias. Exclua uma para criar outra.`}
          onClose={() => setDialog(null)}
        />
      ) : (
        <CategoryModal
          siblings={categories}
          onClose={() => setDialog(null)}
          onSave={async (data) => {
            const created = await actions.createCategory(list.id, data);
            // A categoria nova já abre, vazia, pronta para o primeiro item (LC-R7).
            setCategoryId(created.id);
            setQuery("");
          }}
        />
      ))}
      {dialog === "edit-category" && category && (
        <CategoryModal
          category={category}
          siblings={categories}
          itemCount={visible.length}
          onClose={() => setDialog(null)}
          onSave={(data) => actions.updateCategory(category.id, data)}
          onDelete={(moveTo) => actions.deleteCategory(category.id, moveTo)}
        />
      )}
    </div>
  );
}

type RowActions = Pick<
  Parameters<typeof ChecklistPanel>[0],
  "onToggle" | "onEdit" | "onDelete" | "onOpenRecommendation" | "onUnlinkRecommendation" |
  "onReleaseGiftReservation" | "onUpdateGiftReservation" | "pendingItemId"
>;

function ItemRow({
  item, onToggle, onEdit, onDelete, onOpenRecommendation, onUnlinkRecommendation,
  onReleaseGiftReservation, onUpdateGiftReservation, pendingItemId,
}: RowActions & { item: ChecklistItem }) {
  return (
    <div className={`check-item-row ${pendingItemId === item.id ? "is-saving" : ""}`}>
      <button
        type="button"
        className="check-item"
        onClick={() => onEdit(item)}
        disabled={pendingItemId === item.id}
        data-testid={`button-phone-check-${item.id}`}
      >
        <span className={`check-circle ${item.status !== "A comprar" ? "checked" : ""}`} aria-hidden>
          {item.status === "Comprado" && <Check size={12} />}
          {item.status === "Ganhei" && <Heart size={10} />}
        </span>
        {item.photoKey && <ItemPhoto photoKey={item.photoKey} name={item.name} />}
        <span className="check-name">
          <strong>{item.name}</strong>
          <small>
            {describeItemTotal(item)}
            {item.essential && <span className="badge badge-butter">Essencial</span>}
            {item.suggested && <span className="badge badge-suggestion" data-testid={`badge-suggestion-${item.id}`}>Sugestão</span>}
          </small>
          {item.giftReservation && (
            <span className="gift-reservation-owner">
              <Gift size={11} />
              {item.giftReservation.guestName || "Alguém"} {item.giftReservation.status}
            </span>
          )}
        </span>
        <span className="check-item-edit-hint" aria-hidden><Pencil size={13} /></span>
      </button>
      <div
        className="status-picker"
        role="radiogroup"
        aria-label={`Status de ${item.name}`}
      >
        {ITEM_STATUS_OPTIONS.map(({ value, label, short }) => (
          <button
            type="button"
            key={value}
            role="radio"
            aria-checked={item.status === value}
            className={`status-option ${item.status === value ? "selected" : ""}`}
            onClick={() => item.status !== value && onToggle(item.id, value)}
            disabled={pendingItemId === item.id}
            title={label}
            data-testid={`button-item-status-${item.id}-${value.replace(/\s/g, "-")}`}
          >
            {short}
          </button>
        ))}
      </div>
      {item.recommendationId && (
        <div className="check-recommendation-actions">
          {isRecommendationVisible(item.recommendationId) ? (
            <button
              type="button"
              className="check-recommendation-link"
              onClick={() => onOpenRecommendation(item.recommendationId!)}
              data-testid={`button-open-item-recommendation-${item.id}`}
            >
              <Sparkles size={10} /> ver inspiração
            </button>
          ) : (
            <span className="check-recommendation-unavailable">inspiração indisponível</span>
          )}
          <button
            type="button"
            className="check-recommendation-unlink"
            onClick={() => onUnlinkRecommendation(item.id)}
            disabled={pendingItemId === item.id}
            data-testid={`button-unlink-recommendation-${item.id}`}
          >
            desvincular
          </button>
        </div>
      )}
      {item.giftReservation && (
        <span className="gift-reservation-actions">
          <GuestPhone phone={item.giftReservation.guestPhone} testId={`reservation-phone-${item.id}`} />
          <button
            type="button"
            className="gift-reservation-status"
            disabled={pendingItemId === item.id}
            onClick={() => onUpdateGiftReservation(
              item.giftReservation!.id,
              item.giftReservation!.status === "vou presentear" ? "presenteado" : "vou presentear",
            )}
            data-testid={`button-gift-reservation-status-${item.id}`}
          >
            {item.giftReservation.status === "vou presentear" ? "marcar presenteado" : "marcar reservado"}
          </button>
          <button
            type="button"
            className="gift-reservation-release"
            onClick={() => onReleaseGiftReservation(item.giftReservation!.id)}
            disabled={pendingItemId === item.id}
            data-testid={`button-gift-reservation-release-${item.id}`}
          >
            desfazer
          </button>
        </span>
      )}
      <button type="button" className="delete-item-btn" onClick={() => onDelete(item.id)} disabled={pendingItemId === item.id} aria-label={`Remover ${item.name}`} data-testid={`button-phone-delete-${item.id}`}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}
