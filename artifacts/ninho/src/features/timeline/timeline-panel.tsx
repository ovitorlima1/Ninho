import { CalendarDays, CheckCircle2, Circle, ClipboardCheck, Gift, Heart, Sparkles } from "lucide-react";
import { Progress } from "@/components/progress";
import { type ServerMilestone, type ServerProfile } from "@/lib/api";
import { calcGestation, formatGestation } from "@/lib/gestation";
import { ArrivalNotice } from "@/features/timeline/arrival-notice";

const GESTATION_WEEKS = Array.from({ length: 40 }, (_, index) => index + 1);

export function TimelinePanel({
  milestones: miles, profile, onToggle, isActionPending,
}: {
  milestones: ServerMilestone[];
  profile: ServerProfile;
  onToggle: (id: number, completed: boolean) => void;
  isActionPending: boolean;
}) {
  const gestation = calcGestation(profile.dueDate);
  const week = gestation?.week ?? null;
  const displayWeek = week;
  const trimester = week === null ? null : week <= 13 ? 1 : week <= 27 ? 2 : 3;

  return (
    <div className="screen timeline">
      <div className="screen-intro">
        <h2 className="screen-title">Os próximos pequenos marcos</h2>
        <p className="screen-lead">Cada marco tem uma semana sugerida. Marque quando resolver — sem pressa.</p>
      </div>

      {gestation?.isOverdue && <ArrivalNotice />}

      {!gestation ? (
        <div className="empty-state">
          <CalendarDays size={28} aria-hidden />
          <p>Informe a data prevista no seu perfil para ver sua semana e os marcos no tempo certo.</p>
        </div>
      ) : (
        <section className="card gestation-card" aria-labelledby="gestation-title">
          <div className="card-header">
            <h2 className="card-title" id="gestation-title">{formatGestation(gestation)}</h2>
            <span className="card-meta">{trimester}º trimestre</span>
          </div>
          <Progress value={(gestation.week / 40) * 100} label={`Gestação: ${formatGestation(gestation)} de 40`} size="lg" />
          <div className="tape-scale" aria-hidden>
            <span>semana 1</span><span>semana 20</span><span>semana 40</span>
          </div>
          <ol className="week-grid" aria-label="Semanas da gestação">
            {GESTATION_WEEKS.map((weekNumber) => {
              const isCurrent = weekNumber === displayWeek;
              const isPast = weekNumber < (displayWeek ?? 0);
              return (
                <li
                  key={weekNumber}
                  className={`week-marker ${isPast ? "is-past" : ""} ${isCurrent ? "is-current" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Semana ${weekNumber}${isCurrent ? ", semana atual" : isPast ? ", já passou" : ""}`}
                >
                  {weekNumber}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <h2 className="section-title">Sua linha do tempo</h2>
      <div className="milestone-list">
        {miles.map((m) => {
          const Icon = m.week <= 20 ? Sparkles : m.week <= 28 ? ClipboardCheck : m.week <= 32 ? Gift : Heart;
          const past = week !== null && m.week < week;
          const current = week !== null && m.week === week;
          // Atrasado é diferente de concluído: antes ficava esmaecido, com cara de resolvido.
          const late = past && !m.completed;
          const state = m.completed ? "completed" : late ? "late" : current ? "current" : "future";
          // As notas do seed ("seu momento", "a seguir") são fixas e erravam o
          // tempo; o rótulo agora vem da semana atual.
          const statusLabel = m.completed ? "concluído"
            : late ? "atrasado"
              : current ? "nesta semana"
                : week !== null ? `daqui a ${m.week - week} ${m.week - week === 1 ? "semana" : "semanas"}`
                  : m.note;
          return (
            <button
              type="button"
              className={`milestone-item milestone-${state}`}
              key={m.id}
              onClick={() => onToggle(m.id, !m.completed)}
              disabled={isActionPending}
              aria-pressed={m.completed}
              aria-current={current ? "step" : undefined}
              aria-label={`${m.title}, semana ${m.week}, ${statusLabel}. ${m.completed ? "Toque para marcar como pendente." : "Toque para marcar como concluído."}`}
              data-testid={`button-phone-milestone-${m.week}`}
            >
              <span className="milestone-icon" aria-hidden><Icon size={18} /></span>
              <span className="milestone-text">
                <span className="milestone-meta">Semana {m.week} · {statusLabel}</span>
                <strong>{m.title}</strong>
              </span>
              <span className="milestone-check" aria-hidden>
                {m.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
