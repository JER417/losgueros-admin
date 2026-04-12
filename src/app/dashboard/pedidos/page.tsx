// src/app/dashboard/pedidos/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, Timestamp, limit,
} from "firebase/firestore";
import { Plus, Phone, Calendar, FileText, Receipt, AlertCircle, ChevronDown, Search, X } from "lucide-react";
import TicketModal, { PedidoConDireccion } from "@/components/TicketModal";

const STATUS_OPTIONS = [
  { value: "pendiente",  label: "Pendiente",  bg: "#fefce8", text: "#a16207",  border: "#fde68a" },
  { value: "en camino",  label: "En camino",  bg: "#eff6ff", text: "#1d4ed8",  border: "#bfdbfe" },
  { value: "completado", label: "Completado", bg: "#f0fdf4", text: "#15803d",  border: "#bbf7d0" },
  { value: "cancelado",  label: "Cancelado",  bg: "#fef2f2", text: "#991b1b",  border: "#fecaca" },
];

const TIPO_LABELS: Record<string, string> = {
  llevar: "Llevar", recoger: "Recoger", envio: "Envío", mesa: "Mesa",
};

const fmtDate = (ts: Timestamp | undefined) =>
  ts?.toDate().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }) ?? "—";

const fmtMoney = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function Skeleton() {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #f3f4f6", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ height: 14, width: "40%", background: "#f3f4f6", borderRadius: 4 }} />
        <div style={{ height: 14, width: 60, background: "#f3f4f6", borderRadius: 4 }} />
      </div>
      <div style={{ height: 12, width: "60%", background: "#f3f4f6", borderRadius: 4 }} />
    </div>
  );
}

/** Resalta el término buscado dentro de un texto */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 3, padding: "0 2px" }}>
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export default function PedidosPage() {
  const [pedidos,      setPedidos]      = useState<PedidoConDireccion[]>([]);
  const [ticketPedido, setTicketPedido] = useState<PedidoConDireccion | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [loadingData,  setLoadingData]  = useState(true);
  const [networkError, setNetworkError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q,
      snap => { setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PedidoConDireccion[]); setLoadingData(false); },
      err  => { console.error(err); setNetworkError("Error de conexión. Verifica tu red."); setLoadingData(false); }
    );
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, "pedidos", id), { status });
  };

  const getStatusCfg = (status: string) =>
    STATUS_OPTIONS.find(s => s.value === status) ?? { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb", label: status };

  /* ── Filtrado combinado: status + búsqueda ── */
  const filtered = useMemo(() => {
    let list = filterStatus === "todos" ? pedidos : pedidos.filter(p => p.status === filterStatus);

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(p => {
      const nombre   = (p.clienteNombre    ?? "").toLowerCase();
      const telefono = (p.clienteTelefono  ?? "").replace(/\s/g, "");
      const orderId  = ((p as any).orderNumber ?? p.id ?? "").toLowerCase();
      const qClean   = q.replace(/\s/g, "");

      return (
        nombre.includes(q)          ||
        telefono.includes(qClean)   ||
        orderId.includes(q)
      );
    });
  }, [pedidos, filterStatus, searchQuery]);

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div style={{ maxWidth: 840, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
            Pedidos
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af" }}>
            {loadingData
              ? "Cargando..."
              : hasSearch
                ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} para "${searchQuery}"`
                : `${pedidos.length} pedido${pedidos.length !== 1 ? "s" : ""} recientes`
            }
          </p>
        </div>
        <Link
          href="/dashboard/nuevo-pedido"
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 18px", background: "#2563eb",
            borderRadius: 9, color: "#fff", fontSize: 13,
            fontWeight: 700, textDecoration: "none",
          }}
        >
          <Plus size={14} /> Nuevo Pedido
        </Link>
      </div>

      {networkError && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9, marginBottom: 16, fontSize: 13, color: "#1d4ed8" }}>
          <AlertCircle size={14} /> {networkError}
        </div>
      )}

      {/* ── Buscador ── */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, celular o número de pedido…"
          className="field"
          style={{ paddingLeft: 38, paddingRight: searchQuery ? 36 : 14 }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              border: "none", background: "none", cursor: "pointer",
              color: "#9ca3af", display: "flex", padding: 2, borderRadius: 4,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      {!loadingData && (
        <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
          {["todos", ...STATUS_OPTIONS.map(s => s.value)].map(status => {
            const active = filterStatus === status;
            const cfg    = STATUS_OPTIONS.find(s => s.value === status);
            // count respects active search
            const base   = hasSearch ? filtered : pedidos;
            const count  = status === "todos"
              ? (hasSearch ? filtered.length : pedidos.length)
              : pedidos.filter(p => p.status === status && (
                  !hasSearch || (
                    (p.clienteNombre ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                    (p.clienteTelefono ?? "").replace(/\s/g, "").includes(searchQuery.trim().replace(/\s/g, "")) ||
                    ((p as any).orderNumber ?? p.id ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase())
                  )
                )).length;

            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
                  borderColor: active ? (cfg?.border ?? "#e5e7eb") : "#e5e7eb",
                  background: active ? (cfg?.bg ?? "#111827") : "#fff",
                  color: active ? (cfg?.text ?? "#fff") : "#6b7280",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  whiteSpace: "nowrap", fontFamily: "var(--font-sans)",
                  transition: "all .15s",
                }}
              >
                {status === "todos" ? "Todos" : cfg?.label ?? status} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loadingData
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)
          : filtered.map(pedido => {
              const cfg        = getStatusCfg(pedido.status);
              const orderNum   = (pedido as any).orderNumber ?? "";
              const searchTerm = searchQuery.trim();

              return (
                <div
                  key={pedido.id}
                  style={{
                    background: "#fff", border: "1.5px solid #f3f4f6",
                    borderRadius: 14, padding: "16px 20px",
                    boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
                    {/* Left */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                        {/* Número de pedido */}
                        {orderNum && (
                          <span style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "2px 7px", borderRadius: 5 }}>
                            <Highlight text={orderNum} term={searchTerm} />
                          </span>
                        )}
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                          <Highlight text={pedido.clienteNombre || "—"} term={searchTerm} />
                        </span>
                        {/* Status select */}
                        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                          <select
                            value={pedido.status}
                            onChange={e => handleUpdateStatus(pedido.id, e.target.value)}
                            style={{
                              appearance: "none",
                              padding: "3px 22px 3px 8px",
                              borderRadius: 20,
                              border: `1.5px solid ${cfg.border}`,
                              background: cfg.bg,
                              color: cfg.text,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "var(--font-sans)",
                            }}
                          >
                            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <ChevronDown size={10} style={{ position: "absolute", right: 6, pointerEvents: "none", color: cfg.text }} />
                        </div>
                        {/* Tipo */}
                        {(pedido as any).tipoPedido && (
                          <span style={{ fontSize: 11, color: "#9ca3af", background: "#f3f4f6", padding: "3px 8px", borderRadius: 20, fontWeight: 600 }}>
                            {TIPO_LABELS[(pedido as any).tipoPedido] ?? (pedido as any).tipoPedido}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6b7280", flexWrap: "wrap" }}>
                        {pedido.clienteTelefono && (
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Phone size={11} style={{ color: "#2563eb" }} />
                            <Highlight text={pedido.clienteTelefono} term={searchTerm} />
                          </span>
                        )}
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Calendar size={11} style={{ color: "#2563eb" }} />
                          {fmtDate((pedido as any).fecha)}
                        </span>
                      </div>
                    </div>

                    {/* Right */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                        {fmtMoney(pedido.totalGeneral)}
                      </span>
                      <button
                        onClick={() => setTicketPedido(pedido)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "5px 12px", border: "1.5px solid #f3f4f6",
                          borderRadius: 8, background: "#fff",
                          fontSize: 11, fontWeight: 600, color: "#6b7280",
                          cursor: "pointer", fontFamily: "var(--font-sans)",
                          transition: "all .12s",
                        }}
                      >
                        <Receipt size={12} /> Ver ticket
                      </button>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div style={{ borderTop: "1px solid #f9fafb", paddingTop: 10, fontSize: 12, color: "#9ca3af" }}>
                    <span style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <FileText size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{pedido.items.map(i => `${i.cantidad}x ${i.concepto}`).join(", ")}</span>
                    </span>
                    {pedido.notas && (
                      <p style={{ margin: "5px 0 0", fontStyle: "italic", color: "#d1d5db" }}>
                        Nota: {pedido.notas}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
        }

        {!loadingData && filtered.length === 0 && (
          <div style={{ background: "#fff", border: "1.5px dashed #e5e7eb", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
            <Search size={28} style={{ color: "#d1d5db", margin: "0 auto 12px" }} />
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 8px", fontWeight: 500 }}>
              {hasSearch
                ? `Sin resultados para "${searchQuery}"`
                : `No hay pedidos${filterStatus !== "todos" ? " con este filtro" : ""}.`
              }
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {hasSearch && (
                <button onClick={() => setSearchQuery("")}
                  style={{ color: "#2563eb", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  Limpiar búsqueda
                </button>
              )}
              {filterStatus !== "todos" && (
                <button onClick={() => setFilterStatus("todos")}
                  style={{ color: "#2563eb", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  Ver todos los estados
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {ticketPedido && <TicketModal pedido={ticketPedido} onClose={() => setTicketPedido(null)} />}
    </div>
  );
}
