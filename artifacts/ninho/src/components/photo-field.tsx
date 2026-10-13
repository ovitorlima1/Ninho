import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { PHOTO_ACCEPT, photoUrl, validatePhotoFile, type PhotoDraft } from "@/lib/photos";

/**
 * Campo "Foto do produto" dos diálogos de item. Mostra a prévia na hora, mas não envia nada:
 * guarda o rascunho, e quem salva o item decide (FP-R4). O <input type="file"> fica dentro do
 * rótulo que faz as vezes de botão, então teclado e leitor de tela chegam nele como em qualquer campo.
 */
export function PhotoField({
  photoKey, name, draft, onChange, disabled = false,
}: {
  /** Foto que o item já tem, se tiver. */
  photoKey: string | null;
  /** Nome do item, para o texto alternativo da prévia. */
  name: string;
  draft: PhotoDraft;
  onChange: (draft: PhotoDraft) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => (draft.file ? URL.createObjectURL(draft.file) : null), [draft.file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  const showing = preview ?? (!draft.remove && photoKey ? photoUrl(photoKey) : null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = validatePhotoFile(file);
    setError(problem);
    if (!problem) onChange({ file, remove: false });
  };

  return (
    <div className="photo-field">
      <span className="photo-field-title">Foto do produto <small>(opcional)</small></span>
      <div className="photo-field-row">
        {showing ? (
          <img className="item-photo item-photo-md" src={showing} alt={`Foto de ${name.trim() || "o item"}`} width={72} height={72} data-testid="photo-preview" />
        ) : (
          <span className="photo-field-empty" aria-hidden><ImagePlus size={22} /></span>
        )}
        <div className="photo-field-actions">
          <label className={`secondary-button photo-field-pick ${disabled ? "is-disabled" : ""}`.trim()}>
            <input
              type="file"
              className="visually-hidden"
              accept={PHOTO_ACCEPT}
              disabled={disabled}
              aria-describedby="photo-field-hint"
              onChange={(event) => {
                pick(event.target.files?.[0]);
                // Escolher o mesmo arquivo de novo também precisa avisar.
                event.target.value = "";
              }}
              data-testid="input-photo"
            />
            {showing ? "trocar foto" : "escolher foto"}
          </label>
          {showing && (
            <button type="button" className="text-action danger-action" onClick={() => { setError(null); onChange({ file: null, remove: true }); }} disabled={disabled} data-testid="button-remove-photo">
              <Trash2 size={14} aria-hidden /> remover foto
            </button>
          )}
        </div>
      </div>
      <span className="field-hint" id="photo-field-hint">JPEG, PNG ou WebP, até 8 MB. A localização da foto não é guardada.</span>
      {error && <p className="field-error" role="alert" data-testid="photo-error">{error}</p>}
    </div>
  );
}
