import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, CheckCircle2, Star } from "lucide-react";
import { type ServerGiftShare, type ServerProfile, type UpdateProfileInput } from "@/lib/api";
import { calcGestation, formatGestation, getDueDateBounds, validateDueDate } from "@/lib/gestation";
import { GiftShareCard } from "@/features/profile/gift-share-card";
import { AccountSection } from "@/features/profile/account-section";

export function ProfilePanel({
  profile, onSave, saveState, saveError, share, onCreateShare, onRevokeShare, shareLoading, shareError,
}: {
  profile: ServerProfile;
  onSave: (data: UpdateProfileInput) => void;
  saveState: "idle" | "saving" | "error" | "success";
  saveError: string | null;
  share: ServerGiftShare | null | undefined;
  onCreateShare: () => void;
  onRevokeShare: () => void;
  shareLoading: boolean;
  shareError: string | null;
}) {
  const dueDateBounds = getDueDateBounds();
  const [name, setName] = useState(profile.displayName || "");
  const [city, setCity] = useState(profile.city || "");
  const [babyName, setBabyName] = useState(profile.babyName || "");
  const [dueDate, setDueDateVal] = useState(profile.dueDate || "");
  const [hospital, setHospital] = useState(profile.hospital || "");
  const [supportPerson, setSupportPerson] = useState(profile.supportPerson || "");
  const [personalNotes, setPersonalNotes] = useState(profile.personalNotes || "");

  // Sem effect de sincronia: o Workspace remonta este painel (key) quando o perfil salvo muda.
  // Os campos ficam sempre abertos: o lápis de 28px escondia a edição inteira
  // atrás de um alvo difícil de achar. O botão de salvar aparece quando muda algo.
  const isDirty =
    name !== (profile.displayName || "")
    || city !== (profile.city || "")
    || babyName !== (profile.babyName || "")
    || dueDate !== (profile.dueDate || "")
    || hospital !== (profile.hospital || "")
    || supportPerson !== (profile.supportPerson || "")
    || personalNotes !== (profile.personalNotes || "");
  const dueDateError = dueDate ? validateDueDate(dueDate) : null;

  const save = () => {
    onSave({
      displayName: name.trim() || null,
      city: city.trim() || null,
      babyName: babyName.trim() || null,
      dueDate: dueDate || null,
      hospital: hospital.trim() || null,
      supportPerson: supportPerson.trim() || null,
      personalNotes: personalNotes.trim() || null,
    });
  };

  const initials = (profile.displayName || "?").slice(0, 2).toUpperCase();
  const gestation = calcGestation(profile.dueDate);
  const week = gestation?.week ?? null;
  const canSave = isDirty && !dueDateError && saveState !== "saving";

  return (
    <div className="screen profile">
      <div className="screen-intro">
        <h2 className="screen-title">Seu espaço, do seu jeito</h2>
        <p className="screen-lead">Preencha só o que fizer sentido. Tudo aqui é opcional.</p>
      </div>
      <div className="profile-card">
        <div className="avatar" aria-hidden>{initials}</div>
        <div>
          <p className="profile-card-name">{profile.displayName || "Seu perfil"}</p>
          <p className="profile-card-meta">{gestation ? `${formatGestation(gestation)} de 40` : "Data prevista não informada"}</p>
        </div>
      </div>
      <div className="card profile-form">
        <section className="profile-section">
          <div className="profile-section-heading">
            <div><span className="eyebrow">QUEM ESTÁ PREPARANDO</span><h3>Sobre você</h3></div>
          </div>
           <p className="profile-section-copy">Conte só o que fizer sentido para você.</p>
          <label>
            NOME OU APELIDO
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como você prefere ser chamada?" data-testid="input-phone-profile-name" />
          </label>
          <label>
            CIDADE
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Onde você está?" data-testid="input-phone-profile-city" />
          </label>
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <div><span className="eyebrow">A PEQUENA PESSOA</span><h3>Sobre o bebê</h3></div>
          </div>
           <p className="profile-section-copy">Nome, apelido ou nada por enquanto — tudo bem.</p>
          <label>
            NOME OU APELIDO DO BEBÊ
            <input value={babyName} onChange={(e) => setBabyName(e.target.value)} placeholder="Como vocês chamam o bebê?" data-testid="input-phone-profile-baby-name" />
          </label>
          <label>
            DATA PREVISTA DO PARTO
            <input
              type="date"
              value={dueDate}
              min={dueDateBounds.min}
              max={dueDateBounds.max}
              aria-invalid={dueDateError ? true : undefined}
              aria-describedby={dueDateError ? "profile-due-date-error" : undefined}
              onChange={(e) => setDueDateVal(e.target.value)}
              className="date-input"
              data-testid="input-phone-profile-due-date"
            />
            {dueDateError && <span className="field-error" role="alert" id="profile-due-date-error">{dueDateError}</span>}
          </label>
          {week && (
            <div className="profile-week"><CalendarDays size={15} /><span>semana gestacional<strong>{gestation ? `${formatGestation(gestation)} de 40` : "—"}</strong></span></div>
          )}
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <div><span className="eyebrow">PARA CHEGAR COM CALMA</span><h3>Organização da chegada</h3></div>
          </div>
           <p className="profile-section-copy">Anote o que ajudar a organizar a chegada, no seu tempo.</p>
          <label>
            MATERNIDADE OU HOSPITAL
            <input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="Onde você imagina a chegada?" data-testid="input-phone-profile-hospital" />
          </label>
          <label>
            PESSOA DE APOIO
            <input value={supportPerson} onChange={(e) => setSupportPerson(e.target.value)} placeholder="Quem estará com você?" data-testid="input-phone-profile-support-person" />
          </label>
          <label className="profile-notes-label">
            OBSERVAÇÕES PESSOAIS
            <textarea value={personalNotes} onChange={(e) => setPersonalNotes(e.target.value)} placeholder="Anote algo importante para lembrar depois." rows={3} data-testid="input-phone-profile-notes" />
          </label>
        </section>

        {saveState === "error" && (
          <div className="profile-save-message profile-save-error" role="alert">
            Não foi possível salvar agora. {saveError || "Tente novamente em instantes."}
          </div>
        )}
        {saveState === "success" && !isDirty && (
          <div className="profile-save-message profile-save-success" role="status">
            <CheckCircle2 size={14} /> Perfil salvo.
          </div>
        )}
        {isDirty && (
          <button type="button" className="primary-button" style={{ marginTop: 12 }} onClick={save} disabled={!canSave} data-testid="button-save-profile">
            {saveState === "saving" ? "salvando…" : <><Check size={14} /> salvar perfil</>}
          </button>
        )}
      </div>
      <GiftShareCard
        share={share}
        onCreate={onCreateShare}
        onRevoke={onRevokeShare}
        isLoading={shareLoading}
        error={shareError}
      />
      <AccountSection />
      {/* O cartão inteiro é o link: antes só o texto (19px de altura) era clicável. */}
      <a className="soft-action feedback-link" href="https://forms.gle/ninho-feedback" target="_blank" rel="noopener noreferrer">
        <Star size={16} aria-hidden />
        <span>deixar feedback do beta</span>
        <ArrowUpRight size={16} aria-hidden />
      </a>
    </div>
  );
}
