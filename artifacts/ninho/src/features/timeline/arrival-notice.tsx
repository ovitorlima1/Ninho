import { Heart } from "lucide-react";
import { useLocation } from "wouter";

/** Depois da data prevista o app não sabe se o bebê nasceu — então pergunta. */
export function ArrivalNotice() {
  const [, setLocation] = useLocation();
  return (
    <div className="arrival-notice" role="status">
      <Heart size={15} aria-hidden />
      <div>
        <strong>A chegada pode ser a qualquer momento.</strong>
        <p>Se o bebê já nasceu, você pode ajustar a data no seu perfil.</p>
      </div>
      <button type="button" className="text-action" onClick={() => setLocation("/profile")} data-testid="button-arrival-notice-profile">
        abrir perfil
      </button>
    </div>
  );
}
