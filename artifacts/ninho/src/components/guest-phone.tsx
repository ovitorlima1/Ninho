import { formatBrPhone, whatsappLink } from "@/lib/phone";

/**
 * O telefone que o convidado deixou, para a dona: número e atalho para o
 * WhatsApp. Reservas feitas antes de o telefone ser pedido não têm número.
 */
export function GuestPhone({ phone, testId }: { phone: string | null; testId?: string }) {
  if (!phone) return <small className="guest-phone" data-testid={testId}>sem telefone</small>;
  const link = whatsappLink(phone);
  const shown = formatBrPhone(phone);
  return (
    <span className="guest-phone" data-testid={testId}>
      <span>{shown}</span>
      {link && (
        <a className="text-action" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Chamar ${shown} no WhatsApp`}>
          Chamar no WhatsApp
        </a>
      )}
    </span>
  );
}
