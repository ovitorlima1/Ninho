import { useId, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { EMPTY_CONTACT, readGuestContact, validateContact, type ContactErrors, type GuestContact } from "@/lib/guest-contact";
import { formatBrPhone, normalizeBrPhone } from "@/lib/phone";

/**
 * Estado dos campos de contato do convidado: começa com o que o aparelho
 * lembra, limpa o erro do campo que a pessoa mexeu e valida antes de enviar.
 */
export function useGuestContact() {
  const [contact, setContact] = useState<GuestContact>(() => readGuestContact() ?? EMPTY_CONTACT);
  const [errors, setErrors] = useState<ContactErrors>({});

  const change = (next: GuestContact) => {
    setErrors((current) => ({
      name: next.name !== contact.name ? undefined : current.name,
      phone: next.phone !== contact.phone ? undefined : current.phone,
    }));
    setContact(next);
  };

  /** Marca o que falta, leva o foco ao primeiro campo com erro e devolve o que a API espera. */
  const check = (): { guestName: string; guestPhone: string } | null => {
    const found = validateContact(contact);
    setErrors(found);
    if (found.name || found.phone) {
      window.setTimeout(() => document.querySelector<HTMLElement>('.modal-card input[aria-invalid="true"]')?.focus(), 0);
      return null;
    }
    return { guestName: contact.name.trim(), guestPhone: normalizeBrPhone(contact.phone)! };
  };

  return { contact, errors, change, check };
}

/**
 * Nome e WhatsApp de quem escolhe um presente, com o aviso do que a mãe faz com
 * eles. Devolve só os campos (sem caixa em volta), para continuarem filhos
 * diretos do diálogo e herdarem o espaçamento dele.
 */
export function ContactFields({
  contact, errors, onChange, ownerName, testIdPrefix, extraNote,
}: {
  contact: GuestContact;
  errors: ContactErrors;
  onChange: (next: GuestContact) => void;
  /** Nome de quem recebe; sem ele o aviso fala em "a família". */
  ownerName: string | null;
  /** `guest` → `input-guest-name` e `input-guest-phone`. */
  testIdPrefix: string;
  /** Frase a mais no aviso, para o que só aquele passo precisa dizer. */
  extraNote?: string;
}) {
  const id = useId();
  const nameErrorId = `${id}-name-error`;
  const phoneErrorId = `${id}-phone-error`;
  const phoneHintId = `${id}-phone-hint`;
  const owner = ownerName?.trim() || "a família";

  return (
    <>
      <label className="modal-label">
        <span>Seu nome</span>
        <input
          value={contact.name}
          maxLength={120}
          autoComplete="name"
          placeholder="Como a família vai reconhecer você?"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? nameErrorId : undefined}
          onChange={(event) => onChange({ ...contact, name: event.target.value })}
          data-testid={`input-${testIdPrefix}-name`}
        />
        {errors.name && <span id={nameErrorId} className="field-error" role="alert">{errors.name}</span>}
      </label>
      <label className="modal-label">
        <span>Seu WhatsApp</span>
        <input
          type="tel"
          inputMode="tel"
          value={contact.phone}
          maxLength={25}
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? phoneErrorId : phoneHintId}
          onChange={(event) => onChange({ ...contact, phone: event.target.value })}
          onBlur={() => {
            const normalized = normalizeBrPhone(contact.phone);
            if (normalized) onChange({ ...contact, phone: formatBrPhone(normalized) });
          }}
          data-testid={`input-${testIdPrefix}-phone`}
        />
        {errors.phone
          ? <span id={phoneErrorId} className="field-error" role="alert">{errors.phone}</span>
          : <small id={phoneHintId} className="field-hint">Com o DDD, para {owner} poder falar com você.</small>}
      </label>
      <p className="privacy-note">
        <ShieldCheck size={16} aria-hidden />
        <span>
          Seu nome e telefone ficam só com {owner}, para ela saber quem escolheu e falar com você. Não são usados para mais nada.
          {extraNote ? ` ${extraNote}` : ""}
        </span>
      </p>
    </>
  );
}
