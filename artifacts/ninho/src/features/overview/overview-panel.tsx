import { CalendarDays, ChevronRight } from "lucide-react";
import { Progress } from "@/components/progress";
import { type ServerBudgetCategory, type ServerMilestone, type ServerProfile } from "@/lib/api";
import { calcSpent } from "@/lib/budget";
import { formatDate, money } from "@/lib/format";
import { calcGestation, formatGestation } from "@/lib/gestation";
import { CATEGORIES, type ChecklistItem } from "@/lib/items";
import { getNextMilestone } from "@/lib/milestones";
import { ArrivalNotice } from "@/features/timeline/arrival-notice";

export function OverviewPanel({
  items, profile, milestones: miles, budget, setLocation,
}: {
  items: ChecklistItem[];
  profile: ServerProfile;
  milestones: ServerMilestone[];
  budget: ServerBudgetCategory[];
  setLocation: (path: string) => void;
}) {
  const done = items.filter((i) => i.status !== "A comprar").length;
  const score = items.length ? Math.round((done / items.length) * 100) : 0;
  const gestation = calcGestation(profile.dueDate);
  const spent = calcSpent(items);
  const totalPlanned = budget.reduce((sum, b) => sum + (parseFloat(b.planned) || 0), 0);
  const nextMilestone = getNextMilestone(miles, gestation?.week ?? null);
  const milestoneLate = Boolean(nextMilestone && gestation && nextMilestone.week < gestation.week);
  const nextItem = items.find((i) => i.status === "A comprar" && i.essential)
    ?? items.find((i) => i.status === "A comprar");
  const weeksToGo = gestation ? Math.max(0, Math.ceil(gestation.daysToGo / 7)) : null;
  const firstName = profile.displayName?.trim().split(/\s+/)[0];

  return (
    <div className="screen overview">
      <section className="overview-hero" aria-labelledby="overview-week">
        <p className="overview-greeting">{firstName ? `Olá, ${firstName}` : "Olá"}</p>
        {gestation ? (
          <>
            <h2 className="overview-week" id="overview-week">{formatGestation(gestation)}</h2>
            <p className="overview-countdown">
              {gestation.isOverdue
                ? "A data prevista chegou."
                : `${weeksToGo === 1 ? "Falta 1 semana" : `Faltam ${weeksToGo} semanas`} para ${formatDate(profile.dueDate!)}.`}
            </p>
            <Progress value={(gestation.week / 40) * 100} label={`Gestação: ${formatGestation(gestation)} de 40`} size="lg" />
          </>
        ) : (
          <>
            <h2 className="overview-week" id="overview-week">Quando o bebê chega?</h2>
            <p className="overview-countdown">Com a data prevista, o Ninho mostra sua semana e os marcos no tempo certo.</p>
            <button type="button" className="secondary-button" onClick={() => setLocation("/profile")} data-testid="button-overview-set-due-date">
              <CalendarDays size={16} aria-hidden /> informar data prevista
            </button>
          </>
        )}
      </section>

      {gestation?.isOverdue && <ArrivalNotice />}

      <section className="card overview-prep" aria-labelledby="overview-prep-title">
        <div className="card-header">
          <h2 className="card-title" id="overview-prep-title">Preparo do enxoval</h2>
          <button type="button" className="link-button" onClick={() => setLocation("/checklist")} data-testid="button-open-overview-list">
            ver lista <ChevronRight size={16} aria-hidden />
          </button>
        </div>
        <p className="overview-score"><strong>{score}%</strong> resolvido · {done} de {items.length} itens</p>
        <Progress value={score} label="Preparo do enxoval" size="lg" />
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

      <div className="card-grid">
        <button type="button" className={`card card-link ${milestoneLate ? "is-late" : ""}`} onClick={() => setLocation("/milestones")} data-testid="button-open-overview-milestones">
          <span className="eyebrow">{milestoneLate ? "Marco atrasado" : "Próximo marco"}</span>
          {nextMilestone ? (
            <>
              <strong className="card-value">Semana {nextMilestone.week}</strong>
              <span className="card-note">{nextMilestone.title}</span>
            </>
          ) : (
            <>
              <strong className="card-value">Tudo em dia</strong>
              <span className="card-note">{gestation ? "Todos os marcos foram concluídos." : "Informe a data prevista para ver os marcos."}</span>
            </>
          )}
          <ChevronRight className="card-link-arrow" size={18} aria-hidden />
        </button>

        <button type="button" className="card card-link" onClick={() => setLocation("/budget")} data-testid="button-open-overview-budget">
          <span className="eyebrow">Orçamento</span>
          <strong className="card-value">{money(spent)}</strong>
          <span className="card-note">{totalPlanned > 0 ? `investido de ${money(totalPlanned)} planejados` : "investido até aqui"}</span>
          {totalPlanned > 0 && (
            <Progress value={(spent / totalPlanned) * 100} label="Orçamento usado" tone={spent > totalPlanned ? "brand" : "accent"} />
          )}
          <ChevronRight className="card-link-arrow" size={18} aria-hidden />
        </button>

        <button type="button" className="card card-link" onClick={() => setLocation("/checklist")} data-testid="button-overview-next-item">
          <span className="eyebrow">Próximo item</span>
          {nextItem ? (
            <>
              <strong className="card-value">{nextItem.name}</strong>
              <span className="card-note">{nextItem.essential ? "Essencial" : "Pendente"} em {nextItem.category.toLowerCase()}</span>
            </>
          ) : (
            <>
              <strong className="card-value">Lista resolvida</strong>
              <span className="card-note">Nada pendente por enquanto.</span>
            </>
          )}
          <ChevronRight className="card-link-arrow" size={18} aria-hidden />
        </button>

        <button type="button" className="card card-link card-soft" onClick={() => setLocation("/recommendations")} data-testid="button-open-recommendations">
          <span className="eyebrow">Inspirações</span>
          <strong className="card-value">Ideias para o que falta</strong>
          <span className="card-note">Sugestões que combinam com os itens pendentes.</span>
          <ChevronRight className="card-link-arrow" size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
