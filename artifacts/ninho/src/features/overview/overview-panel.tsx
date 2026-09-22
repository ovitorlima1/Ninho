import { CalendarDays, ChevronRight, Sparkles, WalletCards } from "lucide-react";
import { Progress } from "@/components/progress";
import { type ServerBudgetCategory, type ServerMilestone, type ServerProfile } from "@/lib/api";
import { calcSpent } from "@/lib/budget";
import { formatDate } from "@/lib/format";
import { calcGestation, formatGestation } from "@/lib/gestation";
import { CATEGORIES, type ChecklistItem } from "@/lib/items";
import { getNextMilestone } from "@/lib/milestones";
import { enxovalProgress, itemsToBuy, moneyShort } from "@/lib/overview";
import { ArrivalNotice } from "@/features/timeline/arrival-notice";

/**
 * Início em blocos (design system Ninho Bento, canvas etapa 2). Cada cor de bloco tem papel:
 * malva = enxoval (o herói, um por tela), pêssego = datas e marcos, menta = dinheiro, manteiga = dicas.
 * A ordem do HTML é a do celular; tablet e computador só reorganizam com grid.
 */
export function OverviewPanel({
  items, profile, milestones: miles, budget, setLocation,
}: {
  items: ChecklistItem[];
  profile: ServerProfile;
  milestones: ServerMilestone[];
  budget: ServerBudgetCategory[];
  setLocation: (path: string) => void;
}) {
  const progress = enxovalProgress(items);
  const gestation = calcGestation(profile.dueDate);
  const spent = calcSpent(items);
  const totalPlanned = budget.reduce((sum, b) => sum + (parseFloat(b.planned) || 0), 0);
  const nextMilestone = getNextMilestone(miles, gestation?.week ?? null);
  const milestoneLate = Boolean(nextMilestone && gestation && nextMilestone.week < gestation.week);
  const toBuy = itemsToBuy(items);
  const weeksToGo = gestation ? Math.max(0, Math.ceil(gestation.daysToGo / 7)) : null;
  const firstName = profile.displayName?.trim().split(/\s+/)[0];

  return (
    <div className="screen overview">
      <section className="overview-hello" aria-labelledby="overview-greeting">
        {gestation && (
          <p className="overview-when">
            <span className="overview-week">{formatGestation(gestation)}</span>
            {" · "}
            {gestation.isOverdue
              ? "a data prevista chegou."
              : `${weeksToGo === 1 ? "falta 1 semana" : `faltam ${weeksToGo} semanas`} para ${formatDate(profile.dueDate!)}`}
          </p>
        )}
        <h2 className="overview-greeting" id="overview-greeting">{firstName ? `Olá, ${firstName}.` : "Olá."}</h2>
        {!gestation && (
          <>
            <p className="overview-lead">Com a data prevista, o Ninho mostra sua semana e os marcos no tempo certo.</p>
            <button type="button" className="secondary-button" onClick={() => setLocation("/profile")} data-testid="button-overview-set-due-date">
              <CalendarDays size={18} aria-hidden /> informar data prevista
            </button>
          </>
        )}
      </section>

      {gestation?.isOverdue && <ArrivalNotice />}

      <div className="overview-bento">
        <button type="button" className="tile tile-lilac tile-hero" onClick={() => setLocation("/checklist")} data-testid="button-open-overview-list">
          <span className="tile-kicker">Enxoval pronto</span>
          <span className="tile-value">{progress.percent}%</span>
          <span className="tile-spacer" aria-hidden />
          <Progress value={progress.percent} label="Enxoval pronto" size="lg" />
          <span className="tile-note">
            {progress.done} de {progress.total} itens · {progress.toBuy === 1 ? "1 a comprar" : `${progress.toBuy} a comprar`}
          </span>
        </button>

        <button
          type="button"
          className={`tile ${milestoneLate ? "tile-late" : "tile-peach"}`}
          onClick={() => setLocation("/milestones")}
          data-testid="button-open-overview-milestones"
        >
          <span className="tile-icon" aria-hidden><CalendarDays size={20} /></span>
          <span className="tile-kicker">{milestoneLate ? "Marco atrasado" : "Próximo marco"}</span>
          {nextMilestone ? (
            <>
              <span className="tile-value">Semana {nextMilestone.week}</span>
              <span className="tile-note">{nextMilestone.title}</span>
            </>
          ) : (
            <>
              <span className="tile-value">Tudo em dia</span>
              <span className="tile-note">{gestation ? "Todos os marcos concluídos." : "Informe a data prevista."}</span>
            </>
          )}
        </button>

        <button type="button" className="tile tile-mint" onClick={() => setLocation("/budget")} data-testid="button-open-overview-budget">
          <span className="tile-icon" aria-hidden><WalletCards size={20} /></span>
          <span className="tile-kicker">Orçamento</span>
          <span className="tile-value">{moneyShort(spent)}</span>
          <span className="tile-note">{totalPlanned > 0 ? `de ${moneyShort(totalPlanned)} planejados` : "investido até aqui"}</span>
          {totalPlanned > 0 && (
            <Progress value={(spent / totalPlanned) * 100} label="Orçamento usado" tone={spent > totalPlanned ? "brand" : "accent"} />
          )}
        </button>

        <button type="button" className="tile tile-butter tile-wide" onClick={() => setLocation("/recommendations")} data-testid="button-open-recommendations">
          <span className="tile-icon" aria-hidden><Sparkles size={20} /></span>
          <span className="tile-wide-text">
            <span className="tile-kicker">Inspirações</span>
            <span className="tile-wide-title">Ideias para o que falta</span>
          </span>
          <ChevronRight className="tile-arrow" size={20} aria-hidden />
        </button>
      </div>

      <section className="card overview-buy" aria-labelledby="overview-buy-title">
        <div className="card-header">
          <h2 className="card-title" id="overview-buy-title">Para comprar agora</h2>
          <button type="button" className="link-button" onClick={() => setLocation("/checklist")} data-testid="button-overview-buy-list">
            ver lista <ChevronRight size={16} aria-hidden />
          </button>
        </div>
        {toBuy.length ? (
          <ul className="overview-buy-list">
            {toBuy.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="overview-buy-row"
                  onClick={() => setLocation("/checklist")}
                  data-testid={index === 0 ? "button-overview-next-item" : `button-overview-buy-${item.id}`}
                >
                  <span className="overview-buy-name">{item.name}</span>
                  <span className="overview-buy-meta">
                    {item.category} · {item.qty} un.
                    {item.essential && <span className="badge badge-butter">Essencial</span>}
                  </span>
                  <ChevronRight className="overview-buy-arrow" size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="overview-buy-empty">Lista resolvida. Nada pendente por enquanto.</p>
        )}
      </section>

      <section className="card overview-categories" aria-labelledby="overview-categories-title">
        <h2 className="card-title" id="overview-categories-title">Por categoria</h2>
        <ul className="category-progress">
          {CATEGORIES.map((category) => {
            const inCategory = items.filter((i) => i.category === category);
            const resolved = inCategory.filter((i) => i.status !== "A comprar").length;
            const pct = inCategory.length ? (resolved / inCategory.length) * 100 : 0;
            return (
              <li key={category}>
                <span className="category-progress-name">{category}</span>
                <span className="category-progress-count">{resolved}/{inCategory.length}</span>
                <Progress value={pct} label={`${category}: ${resolved} de ${inCategory.length} resolvidos`} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
