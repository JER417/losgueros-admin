// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection, onSnapshot, query, orderBy, Timestamp, limit,
} from "firebase/firestore";
import {
  Users, ShoppingBag, TrendingUp, Receipt,
  Search, ArrowRight, AlertCircle, Plus,
} from "lucide-react";

interface Cliente {
  id: string; nombre: string; apellidos: string; telefono: string; createdAt: Timestamp;
}
interface Pedido {
  id: string; clienteNombre: string; totalGeneral: number; status: string; createdAt: Timestamp;
}

/* ── helpers ─────────────────────────────────── */
const initials = (n: string, a: string) =>
  `${n?.[0] ?? ""}${a?.[0] ?? ""}`.toUpperCase();

const fmtDate = (ts: Timestamp | undefined) =>
  ts?.toDate().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "2-digit" }) ?? "—";

const fmtMoney = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/* ── sub-components ──────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color: "red" | "yellow" | "blue" | "green";
}) {
  const cfg = {
    red:    { bg: "#eff6ff", iconBg: "#2563eb", text: "#1d4ed8" },
    yellow: { bg: "#fefce8", iconBg: "#ca8a04", text: "#a16207" },
    blue:   { bg: "#eff6ff", iconBg: "#2563eb", text: "#1d4ed8" },
    green:  { bg: "#f0fdf4", iconBg: "#16a34a", text: "#15803d" },
  }[color];

  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #f3f4f6",
        borderRadius: 14,
        padding: "20px 20px 16px",
        boxShadow: "0 1px 4px rgba(0,0,0,.05)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </p>
        <div
          style={{
            width: 34, height: 34, borderRadius: 9,
            background: cfg.iconBg,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon size={16} style={{ color: "#fff" }} />
        </div>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
          {value}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{sub}</p>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", alignItems: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f3f4f6" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 12, width: "55%", background: "#f3f4f6", borderRadius: 4 }} />
        <div style={{ height: 10, width: "35%", background: "#f3f4f6", borderRadius: 4 }} />
      </div>
    </div>
  );
}

/* ── main ────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const isOwner  = user?.role === "owner";

  const [clientes,        setClientes]        = useState<Cliente[]>([]);
  const [pedidos,         setPedidos]         = useState<Pedido[]>([]);
  const [searchPhone,     setSearchPhone]     = useState("");
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingPedidos,  setLoadingPedidos]  = useState(true);
  const [networkError,    setNetworkError]    = useState("");

  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"));
    return onSnapshot(q,
      snap => { setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Cliente[]); setLoadingClientes(false); },
      err  => { console.error(err); setNetworkError("Error de conexión. Verifica tu red."); setLoadingClientes(false); }
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q,
      snap => { setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[]); setLoadingPedidos(false); },
      err  => { console.error(err); setNetworkError("Error de conexión. Verifica tu red."); setLoadingPedidos(false); }
    );
  }, []);

  const stats = useMemo(() => {
    const now         = new Date();
    const sevenAgo    = new Date(now.getTime() - 7 * 86400000);
    const firstMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      nuevos7d:     clientes.filter(c => c.createdAt?.toDate() >= sevenAgo).length,
      pedidosMes:   pedidos.filter(p => p.createdAt?.toDate() >= firstMonth).length,
      ticketPromedio: pedidos.length
        ? Math.round(pedidos.reduce((s, p) => s + (p.totalGeneral ?? 0), 0) / pedidos.length)
        : 0,
    };
  }, [clientes, pedidos]);

  const searchResults = useMemo(() => {
    const term = searchPhone.replace(/\s/g, "");
    if (term.length < 3) return [];
    return clientes.filter(c => c.telefono.replace(/\s/g, "").includes(term));
  }, [searchPhone, clientes]);

  const card: React.CSSProperties = {
    background: "#fff",
    border: "1.5px solid #f3f4f6",
    borderRadius: 14,
    padding: "20px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,.05)",
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
            Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af", fontWeight: 400 }}>
            Bienvenido, {user?.displayName || user?.email}
          </p>
        </div>
        <Link
          href="/dashboard/nuevo-pedido"
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 18px", background: "#2563eb",
            border: "none", borderRadius: 9, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            textDecoration: "none", transition: "background .15s",
          }}
        >
          <Plus size={14} /> Nuevo Pedido
        </Link>
      </div>

      {/* Error banner */}
      {networkError && (
        <div
          style={{
            display: "flex", gap: 8, alignItems: "center",
            padding: "11px 16px", marginBottom: 20,
            background: "#eff6ff", border: "1px solid #bfdbfe",
            borderRadius: 10, fontSize: 13, color: "#1d4ed8", fontWeight: 500,
          }}
        >
          <AlertCircle size={15} /> {networkError}
        </div>
      )}

      {/* Stats — owner only */}
      {isOwner && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <StatCard label="Total clientes"   value={loadingClientes ? "—" : clientes.length}   sub="Registrados"   icon={Users}        color="red"    />
          <StatCard label="Nuevos (7 días)"  value={loadingClientes ? "—" : stats.nuevos7d}     sub="Últimos 7 días" icon={TrendingUp}   color="blue"   />
          <StatCard label="Pedidos del mes"  value={loadingPedidos  ? "—" : stats.pedidosMes}   sub="Mes actual"    icon={ShoppingBag}  color="green"  />
          <StatCard label="Ticket promedio"  value={loadingPedidos  ? "—" : fmtMoney(stats.ticketPromedio)} sub="Por pedido" icon={Receipt} color="yellow" />
        </div>
      )}

      {/* Búsqueda rápida */}
      <div style={{ ...card, marginBottom: 20 }}>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#374151" }}>
          Búsqueda rápida de cliente
        </p>
        <div style={{ position: "relative", maxWidth: 340 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            type="tel"
            maxLength={10}
            value={searchPhone}
            onChange={e => setSearchPhone(e.target.value)}
            placeholder="Número de teléfono..."
            className="field"
            style={{ paddingLeft: 36 }}
          />
        </div>

        {searchResults.length > 0 && (
          <div style={{ marginTop: 14, borderTop: "1.5px solid #f3f4f6", paddingTop: 14 }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {searchResults.length} resultado{searchResults.length !== 1 && "s"}
            </p>
            {searchResults.map(c => (
              <div
                key={c.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: "1px solid #f9fafb",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "#eff6ff", color: "#2563eb",
                      fontSize: 12, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {initials(c.nombre, c.apellidos)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>
                      {c.nombre} {c.apellidos}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{c.telefono}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/nuevo-pedido"
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", background: "#facc15",
                    borderRadius: 7, fontSize: 12, fontWeight: 700,
                    color: "#1e3a8a", textDecoration: "none",
                  }}
                >
                  Nuevo Pedido <ArrowRight size={11} />
                </Link>
              </div>
            ))}
          </div>
        )}

        {searchPhone.replace(/\s/g, "").length >= 3 && searchResults.length === 0 && !loadingClientes && (
          <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
            No se encontró ningún cliente.{" "}
            <Link href="/dashboard/clientes" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              Registrar cliente nuevo
            </Link>
          </div>
        )}
      </div>

      {/* Clientes recientes */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#374151" }}>Clientes recientes</p>
          <Link
            href="/dashboard/clientes"
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 12, color: "#2563eb", fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>

        {loadingClientes
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          : clientes.slice(0, 6).map(c => (
              <div
                key={c.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: "1px solid #f9fafb",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "#eff6ff", color: "#2563eb",
                      fontSize: 12, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {initials(c.nombre, c.apellidos)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>
                      {c.nombre} {c.apellidos}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{c.telefono}</p>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#d1d5db", fontWeight: 500 }}>
                  {fmtDate(c.createdAt)}
                </span>
              </div>
            ))
        }
        {!loadingClientes && clientes.length === 0 && (
          <p style={{ textAlign: "center", color: "#d1d5db", fontSize: 14, padding: "24px 0", margin: 0 }}>
            No hay clientes registrados
          </p>
        )}
      </div>
    </div>
  );
}
