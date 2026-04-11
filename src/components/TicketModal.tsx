// src/components/TicketModal.tsx
"use client";

import { X, Printer, Share2, Copy } from "lucide-react";
import { Timestamp } from "firebase/firestore";

interface PedidoItem {
  cantidad: number;
  concepto: string;
  precioUnitario?: number;
  total: number;
}

interface DireccionEntrega {
  calle: string; noExt: string; noInt?: string; colonia: string;
  ciudad: string; estado?: string; cp?: string; referencias: string;
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

interface Props { pedido: PedidoConDireccion; onClose: () => void; }

const fmtDate = (ts: Timestamp) =>
  ts?.toDate().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) ?? "";

const shortId = (id: string) => id.slice(-6).toUpperCase();

const fmtMoney = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

function buildTicketText(pedido: PedidoConDireccion): string {
  const dir    = pedido.direccionEntrega;
  const dirTxt = dir?.calle
    ? `${dir.calle} ${dir.noExt}${dir.noInt ? ` Int.${dir.noInt}` : ""}, Col. ${dir.colonia}, ${dir.ciudad}${dir.referencias ? ` (Ref: ${dir.referencias})` : ""}`
    : "Sin dirección registrada";
  const itemsTxt = pedido.items.map(i => `• ${i.cantidad}x ${i.concepto} — ${fmtMoney(i.total)}`).join("\n");
  return (
    `*Los Güeros — Pedido #${shortId(pedido.id)}*\n\n` +
    `Cliente: ${pedido.clienteNombre}\nTel: ${pedido.clienteTelefono}\n\n` +
    `Dirección:\n${dirTxt}\n\nProductos:\n${itemsTxt}\n\n` +
    `Total: ${fmtMoney(pedido.totalGeneral)}` +
    (pedido.notas ? `\n\nNotas: ${pedido.notas}` : "")
  );
}

export default function TicketModal({ pedido, onClose }: Props) {
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const handlePrint = () => window.print();
  const handleShare = async () => {
    const text = buildTicketText(pedido);
    if (canShare) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Ticket copiado al portapapeles ✓");
    }
  };

  return (
    <>
      {/* Print target */}
      <div id="ticket-print-root">
        <TicketContent pedido={pedido} />
      </div>

      {/* Modal overlay */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)", padding: 16,
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          style={{
            display: "flex", flexDirection: "column",
            background: "#fff", borderRadius: 18,
            width: "100%", maxWidth: 420,
            boxShadow: "0 32px 64px rgba(0,0,0,.25)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1.5px solid #f3f4f6",
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "#111827" }}>
                Ticket de entrega
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>
                Pedido #{shortId(pedido.id)}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ padding: 7, border: "none", background: "#f3f4f6", borderRadius: 8, cursor: "pointer", display: "flex", color: "#6b7280" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Preview */}
          <div style={{ maxHeight: "62vh", overflowY: "auto", padding: "16px 20px" }}>
            <TicketContent pedido={pedido} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, padding: 16, borderTop: "1.5px solid #f3f4f6" }}>
            <button
              onClick={handleShare}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 0", border: "1.5px solid #e5e7eb",
                borderRadius: 10, background: "#fff", fontSize: 13, fontWeight: 600,
                color: "#374151", cursor: "pointer", fontFamily: "var(--font-sans)",
              }}
            >
              {canShare ? <><Share2 size={14} /> Enviar por WhatsApp</> : <><Copy size={14} /> Copiar texto</>}
            </button>
            <button
              onClick={handlePrint}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 0", border: "none",
                borderRadius: 10, background: "#2563eb", fontSize: 13, fontWeight: 700,
                color: "#fff", cursor: "pointer", fontFamily: "var(--font-sans)",
              }}
            >
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Ticket content (used in modal preview + print) ─── */
function TicketContent({ pedido }: { pedido: PedidoConDireccion }) {
  const dir = pedido.direccionEntrega;

  const row = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{ fontWeight: 700, textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );

  const divider = (dashed = false) => (
    <div style={{ borderTop: `1px ${dashed ? "dashed" : "solid"} #ddd`, margin: "10px 0" }} />
  );

  return (
    <div
      style={{
        fontFamily: "'DM Mono', 'Courier New', monospace",
        background: "#fff", color: "#1a1a1a",
        padding: 20, maxWidth: 320, margin: "0 auto",
        border: "1px solid #e5e7eb", borderRadius: 10,
        fontSize: 12, lineHeight: 1.6,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div
          style={{
            display: "inline-block",
            background: "#2563eb", color: "#fff",
            padding: "4px 16px", borderRadius: 6,
            fontWeight: 700, fontSize: 15, letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          LOS GÜEROS
        </div>
        <p style={{ margin: 0, fontSize: 10, color: "#999", letterSpacing: "0.05em" }}>
          BARBACOA · TICKET DE ENTREGA
        </p>
      </div>

      {divider(true)}

      {/* Order meta */}
      {row("Pedido",  `#${shortId(pedido.id)}`)}
      {row("Fecha",   fmtDate(pedido.fecha))}

      {divider(true)}

      {/* Cliente */}
      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Cliente
      </p>
      {row("Nombre",   pedido.clienteNombre || "—")}
      {row("Teléfono", pedido.clienteTelefono || "—")}

      {/* Dirección */}
      {dir && (
        <>
          {divider(true)}
          <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Dirección de entrega
          </p>
          {dir.calle ? (
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
              <div>{dir.calle} {dir.noExt}{dir.noInt ? ` Int. ${dir.noInt}` : ""}</div>
              <div>Col. {dir.colonia}, {dir.ciudad}</div>
              {dir.cp && <div>CP {dir.cp}</div>}
              {dir.referencias && <div style={{ color: "#999", fontStyle: "italic", marginTop: 3 }}>Ref: {dir.referencias}</div>}
            </div>
          ) : (
            <p style={{ color: "#999", fontStyle: "italic", margin: 0 }}>Sin dirección registrada</p>
          )}
        </>
      )}

      {divider(true)}

      {/* Items */}
      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Productos
      </p>
      {pedido.items.map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span>
            <span style={{ color: "#999" }}>{item.cantidad}x </span>
            {item.concepto}
          </span>
          <strong>{fmtMoney(item.total)}</strong>
        </div>
      ))}

      {divider()}

      {/* Total */}
      <div
        style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", margin: "10px 0 6px",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13 }}>TOTAL A COBRAR</span>
        <span
          style={{
            fontSize: 20, fontWeight: 800,
            background: "#facc15", padding: "2px 10px",
            borderRadius: 6,
          }}
        >
          {fmtMoney(pedido.totalGeneral)}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 9, color: "#bbb", textAlign: "right" }}>MXN</p>

      {/* Notas */}
      {pedido.notas && (
        <div
          style={{
            marginTop: 10, padding: "8px 10px",
            background: "#fefce8", border: "1px solid #fde68a",
            borderRadius: 7, fontSize: 12,
          }}
        >
          <strong>Notas:</strong> {pedido.notas}
        </div>
      )}

      {divider(true)}
      <p style={{ textAlign: "center", fontSize: 10, color: "#bbb", margin: 0 }}>
        ¡Gracias por su preferencia!
      </p>
    </div>
  );
}
