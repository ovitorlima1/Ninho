import { useLocation } from 'wouter';
import { Compass } from 'lucide-react';

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="system-page">
      <div className="system-card">
        <Compass size={26} aria-hidden />
        <h1>Não encontramos esta página</h1>
        <p>O endereço pode ter mudado de lugar. Volte para o seu ninho e continue de onde parou.</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => setLocation('/dashboard')}
          data-testid="button-not-found-home"
        >
          voltar para o início
        </button>
      </div>
    </div>
  );
}
