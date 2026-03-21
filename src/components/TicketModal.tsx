"use client";

import { useRef } from "react";
import { X, Printer, Share2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";

interface PedidoItem {
  cantidad: number;
  concepto: string;
  precioUnitario?: number;
  total: number;
}

interface DireccionEntrega {
  calle: string;
  noExt: string;
  noInt?: string;
  colonia: string;
  ciudad: string;
  estado?: string;
  cp?: string;
  referencias: string;
}

export interface PedidoConDireccion {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  direccionEntrega?: DireccionEntrega | null;
  fecha: Timestamp;
  notas: string;
  items: PedidoItem[];
  totalGeneral: number;
  status: string;
  createdAt: Timestamp;
}

interface Props {
  pedido: PedidoConDireccion;
  onClose: () => void;
}

const fmtDate = (ts: Timestamp) =>
  ts?.toDate().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }) ?? "";

const shortId = (id: string) => id.slice(-6).toUpperCase();

export default function TicketModal({ pedido, onClose }: Props) {
  const handlePrint = () => window.print();

  const handleShare = async () => {
    const dir = pedido.direccionEntrega;
    const dirTxt = dir?.calle
      ? `${dir.calle} ${dir.noExt}${dir.noInt ? ` Int.${dir.noInt}` : ""}, Col. ${dir.colonia}, ${dir.ciudad}${dir.referencias ? ` (Ref: ${dir.referencias})` : ""}`
      : "Sin dirección registrada";

    const itemsTxt = pedido.items
      .map((i) => `• ${i.cantidad}x ${i.concepto} — $${i.total.toLocaleString("es-MX")}`)
      .join("\n");

    const text =
      `🥩 *Barbacoa Los Güeros — Pedido #${shortId(pedido.id)}*\n\n` +
      `👤 *Cliente:* ${pedido.clienteNombre}\n` +
      `📞 *Tel:* ${pedido.clienteTelefono}\n\n` +
      `📍 *Dirección:*\n${dirTxt}\n\n` +
      `📦 *Productos:*\n${itemsTxt}\n\n` +
      `💰 *Total a cobrar: $${pedido.totalGeneral.toLocaleString("es-MX")} MXN*` +
      (pedido.notas ? `\n\n📝 Notas: ${pedido.notas}` : "");

    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Ticket copiado al portapapeles");
    }
  };

  const dir = pedido.direccionEntrega;

  return (
    <>
      {/* Print: solo muestra el ticket */}
      <div id="ticket-print-root">
        <TicketContent pedido={pedido} />
      </div>

      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-800">Ticket de entrega</h2>
              <p className="text-xs text-slate-500">Pedido #{shortId(pedido.id)}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Preview (scrollable) */}
          <div className="max-h-[65vh] overflow-y-auto p-5">
            <TicketContent pedido={pedido} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-slate-100 p-4">
            <button
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Share2 className="h-4 w-4" />
              Compartir / WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#facc15] py-2.5 text-sm font-medium text-slate-900 hover:bg-amber-400"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Contenido visual del ticket (reutilizado en preview y print) ── */
function TicketContent({ pedido }: { pedido: PedidoConDireccion }) {
  const dir = pedido.direccionEntrega;
  const mono: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace" };
  const divider = <div style={{ borderTop: "1px dashed #bbb", margin: "10px 0" }} />;

  return (
    <div
      style={{
        ...mono,
        background: "#fff",
        color: "#1a1a1a",
        padding: "20px",
        maxWidth: "340px",
        margin: "0 auto",
        border: "1px dashed #ccc",
        borderRadius: "8px",
        fontSize: "13px",
        lineHeight: "1.5",
      }}
    >
      {/* Encabezado */}
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "2px" }}>
          🥩 LOS GÜEROS
        </div>
        <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
          BARBACOA ESTILO HIDALGO — DESDE 1994
        </div>
        {divider}
        <div style={{ fontSize: "12px" }}>
          Pedido <strong>#{shortId(pedido.id)}</strong>
        </div>
        <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
          {fmtDate(pedido.fecha)}
        </div>
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "5px" }}>
          ── CLIENTE ──────────────────────
        </div>
        <div>👤 <strong>{pedido.clienteNombre}</strong></div>
        <div>📞 {pedido.clienteTelefono}</div>
      </div>

      {/* Dirección */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "5px" }}>
          ── DIRECCIÓN DE ENTREGA ─────────
        </div>
        {dir?.calle ? (
          <div style={{ display: "flex", gap: "6px" }}>
            <span>📍</span>
            <div>
              <div>{dir.calle} {dir.noExt}{dir.noInt ? ` Int. ${dir.noInt}` : ""}</div>
              <div>Col. {dir.colonia}</div>
              <div>{dir.ciudad}{dir.cp ? `, CP ${dir.cp}` : ""}</div>
              {dir.referencias && (
                <div style={{ fontStyle: "italic", color: "#555", marginTop: "3px" }}>
                  Ref: {dir.referencias}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: "#999", fontStyle: "italic" }}>Sin dirección registrada</div>
        )}
      </div>

      {/* Productos */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "9px", color: "#888", letterSpacing: "1px", marginBottom: "5px" }}>
          ── PRODUCTOS ────────────────────
        </div>
        {pedido.items.map((item, i) => (
          <div
            key={i}
            style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}
          >
            <span>
              <span style={{ color: "#888" }}>{item.cantidad}x</span> {item.concepto}
            </span>
            <strong>${item.total.toLocaleString("es-MX")}</strong>
          </div>
        ))}
      </div>

      {/* Total */}
      {divider}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <span style={{ fontWeight: "bold", fontSize: "14px" }}>TOTAL A COBRAR</span>
        <span
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            background: "#facc15",
            padding: "2px 10px",
            borderRadius: "6px",
          }}
        >
          ${pedido.totalGeneral.toLocaleString("es-MX")}
        </span>
      </div>
      <div style={{ fontSize: "9px", color: "#888", textAlign: "right" }}>MXN — PAGO EN EFECTIVO</div>

      {/* Notas */}
      {pedido.notas && (
        <div
          style={{
            marginTop: "10px",
            padding: "7px 10px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "6px",
            fontSize: "12px",
          }}
        >
          <strong>📝 Notas: </strong>{pedido.notas}
        </div>
      )}

      {/* Footer */}
      {divider}
      <div style={{ textAlign: "center", fontSize: "10px", color: "#aaa" }}>
        ¡Gracias por su preferencia!
      </div>
    </div>
  );
}
