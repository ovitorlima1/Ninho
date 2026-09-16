export function LoadingSpinner() {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>Carregando seu ninho…</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state">
      <p>{message}</p>
      {onRetry && <button type="button" className="primary-button" onClick={onRetry}>Tentar novamente</button>}
    </div>
  );
}
