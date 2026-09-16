import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TinyButton } from "@/components/controls";
import { ModalShell } from "@/components/modal-shell";
import { updateProfile, type Workspace } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { getDueDateBounds, validateDueDate } from "@/lib/gestation";

export function OnboardingModal({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [dueDate, setDueDateVal] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { displayName?: string; dueDate?: string | null; onboardingComplete: boolean }) =>
      updateProfile(data),
    onSuccess: (profile) => {
      qc.setQueryData<Workspace>(["workspace", userId], (old) => old ? { ...old, profile } : old);
      onComplete();
    },
  });

  const bounds = getDueDateBounds();

  /** Salva com a data; sem data válida a mensagem explica em vez de ignorar. */
  const finish = () => {
    if (!dueDate) {
      setDateError("Escolha a data prevista ou toque em “configurar depois”.");
      return;
    }
    const problem = validateDueDate(dueDate);
    if (problem) {
      setDateError(problem);
      return;
    }
    setDateError(null);
    save(dueDate);
  };

  const save = (date: string | null) => {
    mutation.mutate({
      displayName: name.trim() || undefined,
      dueDate: date,
      onboardingComplete: true,
    });
  };

  return (
    <ModalShell
      className="onboarding-card"
      labelledBy={`onboarding-step-${step}-title`}
      describedBy={`onboarding-step-${step}-description`}
      onClose={() => undefined}
      onSubmit={() => (step === 1 ? setStep(2) : finish())}
      dismissible={false}
      focusKey={step}
    >
      <>
        <div className="onboarding-progress">
          <span className={step >= 1 ? "step-active" : ""} />
          <span className={step >= 2 ? "step-active" : ""} />
        </div>

        {step === 1 && (
          <>
            <div className="modal-top">
              <div className="onboarding-intro"><span className="eyebrow">BEM-VINDA</span><h2 id="onboarding-step-1-title">Como posso te chamar?</h2></div>
            </div>
            <p className="onboarding-description" id="onboarding-step-1-description">Pode ser seu nome, um apelido ou como você gosta de ser chamada.</p>
            <label className="modal-label">
              NOME OU APELIDO
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex.: Ana, Duda, Mãe da Lara…"
                data-testid="input-onboarding-name"
              />
            </label>
            <div className="onboarding-actions">
              <button type="submit" className="primary-button" data-testid="button-onboarding-next">
                Continuar <ChevronRight size={15} />
              </button>
              <button type="button" className="text-action" onClick={() => setStep(2)} data-testid="button-onboarding-skip-name">
                pular por agora
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="modal-top">
              <div className="onboarding-intro"><span className="eyebrow">CHEGADA</span><h2 id="onboarding-step-2-title">Qual é a data prevista?</h2></div>
              <TinyButton onClick={() => setStep(1)} label="Voltar" testId="button-onboarding-back"><ChevronRight size={17} className="rotate-180" /></TinyButton>
            </div>
            <p className="onboarding-description" id="onboarding-step-2-description">A partir dela, calculamos sua semana e os marcos. Você pode mudar depois.</p>
            <label className="modal-label">
              DATA PREVISTA
              <input
                type="date"
                value={dueDate}
                min={bounds.min}
                max={bounds.max}
                aria-invalid={dateError ? true : undefined}
                aria-describedby={dateError ? "onboarding-due-date-error" : undefined}
                onChange={(e) => { setDueDateVal(e.target.value); setDateError(null); }}
                className="date-input"
                data-testid="input-onboarding-due-date"
              />
            </label>
            {dateError && <p className="field-error" role="alert" id="onboarding-due-date-error">{dateError}</p>}
            {mutation.isError && <p className="field-error" role="alert">{getFriendlyErrorMessage(mutation.error)}</p>}
            <div className="onboarding-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={mutation.isPending}
                data-testid="button-onboarding-finish"
              >
                {mutation.isPending ? "Salvando…" : "Entrar no meu ninho"}
              </button>
              <button type="button" className="text-action" onClick={() => save(null)} disabled={mutation.isPending} data-testid="button-onboarding-skip-date">
                configurar depois
              </button>
            </div>
          </>
        )}
      </>
    </ModalShell>
  );
}
