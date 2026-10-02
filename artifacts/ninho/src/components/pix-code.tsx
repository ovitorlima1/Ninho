import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { formatCents } from "@/lib/gift-lists";

/** Desenho do QR como um único caminho SVG, a partir do texto do Pix. */
function qrPath(text: string): { path: string; size: number } {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let path = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  return { path, size };
}

/** QR Code e "copia e cola" de um Pix já com o valor, o recebedor e o identificador. */
export function PixCode({
  payload, amountCents, recipientName, keyMasked,
}: {
  payload: string;
  amountCents: number;
  recipientName: string;
  keyMasked?: string;
}) {
  const { path, size } = useMemo(() => qrPath(payload), [payload]);
  const [copied, setCopied] = useState<boolean | null>(null);
  const margin = 2;

  const copy = async () => {
    const ok = await copyText(payload);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(null), 2400);
  };

  return (
    <div className="pix-code">
      <svg
        className="pix-qr"
        role="img"
        aria-label={`QR Code do Pix de ${formatCents(amountCents)} para ${recipientName}`}
        viewBox={`${-margin} ${-margin} ${size + margin * 2} ${size + margin * 2}`}
        shapeRendering="crispEdges"
        data-testid="pix-qr"
      >
        <rect x={-margin} y={-margin} width={size + margin * 2} height={size + margin * 2} fill="#ffffff" />
        <path d={path} fill="#000000" />
      </svg>
      <p className="pix-hint">Aponte a câmera do app do seu banco. O valor já vai preenchido.</p>
      <div className="pix-copy">
        <span className="pix-payload" data-testid="pix-payload">{payload}</span>
        <button type="button" className="pix-copy-button" onClick={copy} data-testid="button-copy-pix">
          {copied ? <><Check size={15} aria-hidden /> Copiado</> : <><Copy size={15} aria-hidden /> Copiar</>}
        </button>
      </div>
      {copied === false && <p className="field-error" role="alert">Não deu para copiar sozinho. Selecione o código acima e copie.</p>}
      <p className="pix-recipient">
        Recebedor: <strong>{recipientName}</strong>{keyMasked ? ` · ${keyMasked}` : ""}
      </p>
    </div>
  );
}
