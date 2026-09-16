import { CheckCircle2, X } from "lucide-react";

export type RecommendationFeedback = {
  tone: "success" | "error";
  message: string;
};

export type ActionFeedback = RecommendationFeedback & {
  /** Ação opcional no aviso, usada pelo "Desfazer" da remoção. */
  action?: { label: string; onAction: () => void };
};

export function ActionFeedbackBanner({ feedback, onDismiss }: { feedback: ActionFeedback | null; onDismiss: () => void }) {
  if (!feedback) return null;
  return (
    <div className={`action-feedback action-feedback-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>
      {feedback.tone === "success" ? <CheckCircle2 size={15} /> : <X size={15} />}
      <span>{feedback.message}</span>
      {feedback.action && (
        <button
          type="button"
          className="action-feedback-action"
          onClick={() => { feedback.action?.onAction(); onDismiss(); }}
          data-testid="button-action-feedback-action"
        >
          {feedback.action.label}
        </button>
      )}
      <button type="button" onClick={onDismiss} aria-label="Fechar mensagem" data-testid="button-dismiss-action-feedback"><X size={13} /></button>
    </div>
  );
}
