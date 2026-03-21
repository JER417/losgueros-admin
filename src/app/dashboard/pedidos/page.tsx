// src/app/dashboard/pedidos/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  Timestamp,
  limit,
} from "firebase/firestore";
import { Plus, Calendar, Phone, FileText, Ticket, Filter } from "lucide-react";
import TicketModal, { PedidoConDireccion } from "@/components/TicketModal";

const STATUS_OPTIONS = [
  { value: "pendiente",  label: "Pendiente",  color: "bg-amber-100 text-amber-800"  },
  { value: "en camino",  label: "En camino",  color: "bg-blue-100 text-blue-800"   },
  { value: "completado", label: "Completado", color: "bg-green-100 text-green-800" },
  { value: "cancelado",  label: "Cancelado",  color: "bg-red-100 text-red-800"     },
];

function PedidoSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoConDireccion[]>([]);
  const [ticketPedido, setTicketPedido] = useState<PedidoConDireccion | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [loadingData, setLoadingData] = useState(true);
  const [networkError, setNetworkError] = useState("");

  useEffect(() => {
    // FIX: limit(100) para no cargar todo el historial
    const q = query(collection(db, "pedidos"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PedidoConDireccion[]);
        setLoadingData(false);
      },
      (error) => {
        console.error("Error cargando pedidos:", error);
        setNetworkError("Error de conexión. Verifica tu red.");
        setLoadingData(false);
      }
    );
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, "pedidos", id), { status });
  };

  const getStatusColor = (status: string) =>
    STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-slate-100 text-slate-800";

  const fmtDate = (ts: Timestamp) =>
    ts?.toDate().toLocaleDateString("es-MX", {
      day: "2-digit", month: "2-digit", year: "numeric",
    }) ?? "";

  const filtered =
    filterStatus === "todos" ? pedidos : pedidos.filter((p) => p.status === filterStatus);

  return (
    <div>
      {networkError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          ⚠️ {networkError}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Pedidos</h1>
          <p className="text-slate-600">
            {loadingData ? "Cargando..." : `${pedidos.length} pedidos recientes`}
          </p>
        </div>
        <Link
          href="/dashboard/nuevo-pedido"
          className="flex items-center gap-2 rounded-lg bg-[#facc15] px-4 py-2 font-medium text-slate-900 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Nuevo Pedido
        </Link>
      </div>

      {/* Filtros */}
      {!loadingData && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 shrink-0 text-slate-400" />
          {["todos", ...STATUS_OPTIONS.map((s) => s.value)].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors ${
                filterStatus === status
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {status === "todos"
                ? `Todos (${pedidos.length})`
                : `${STATUS_OPTIONS.find((s) => s.value === status)?.label} (${
                    pedidos.filter((p) => p.status === status).length
                  })`}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {loadingData
          ? Array.from({ length: 4 }).map((_, i) => <PedidoSkeleton key={i} />)
          : filtered.map((pedido) => (
            <div key={pedido.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{pedido.clienteNombre}</h3>
                    <select
                      value={pedido.status}
                      onChange={(e) => handleUpdateStatus(pedido.id, e.target.value)}
                      className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#facc15] ${getStatusColor(pedido.status)}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {pedido.clienteTelefono}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {fmtDate(pedido.fecha)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-lg font-semibold text-slate-800">
                    ${pedido.totalGeneral.toLocaleString("es-MX")}
                  </p>
                  <button
                    onClick={() => setTicketPedido(pedido)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-slate-900"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    Ver ticket
                  </button>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{pedido.items.map((i) => `${i.cantidad}x ${i.concepto}`).join(", ")}</p>
                </div>
                {pedido.notas && (
                  <p className="mt-1 italic text-slate-400">📝 {pedido.notas}</p>
                )}
              </div>
            </div>
          ))}

        {!loadingData && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-slate-500">No hay pedidos{filterStatus !== "todos" ? " con este filtro" : ""}.</p>
            {filterStatus !== "todos" && (
              <button onClick={() => setFilterStatus("todos")} className="mt-2 text-sm font-medium text-amber-600 hover:underline">
                Ver todos
              </button>
            )}
          </div>
        )}
      </div>

      {ticketPedido && (
        <TicketModal pedido={ticketPedido} onClose={() => setTicketPedido(null)} />
      )}
    </div>
  );
}
