// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  limit,
} from "firebase/firestore";

interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  createdAt: Timestamp;
}

interface Pedido {
  id: string;
  clienteNombre: string;
  totalGeneral: number;
  status: string;
  createdAt: Timestamp;
}

// Skeleton para listas
function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [networkError, setNetworkError] = useState("");

  // Un solo listener para clientes
  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Cliente[]);
        setLoadingClientes(false);
      },
      // FIX: manejar errores de red en onSnapshot
      (error) => {
        console.error("Error cargando clientes:", error);
        setNetworkError("Error de conexión. Verifica tu red.");
        setLoadingClientes(false);
      }
    );
  }, []);

  // Pedidos con límite para evitar cargar todo el historial
  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Pedido[]);
        setLoadingPedidos(false);
      },
      (error) => {
        console.error("Error cargando pedidos:", error);
        setNetworkError("Error de conexión. Verifica tu red.");
        setLoadingPedidos(false);
      }
    );
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const nuevos7dias = clientes.filter(
      (c) => c.createdAt?.toDate() >= sevenDaysAgo
    ).length;

    const pedidosMes = pedidos.filter(
      (p) => p.createdAt?.toDate() >= firstOfMonth
    ).length;

    const ticketPromedio =
      pedidos.length > 0
        ? Math.round(pedidos.reduce((s, p) => s + (p.totalGeneral ?? 0), 0) / pedidos.length)
        : 0;

    return { nuevos7dias, pedidosMes, ticketPromedio };
  }, [clientes, pedidos]);

  const recentClientes = useMemo(() => clientes.slice(0, 5), [clientes]);

  useEffect(() => {
    if (searchPhone.replace(/\s/g, "").length >= 3) {
      const term = searchPhone.replace(/\s/g, "");
      setSearchResults(
        clientes.filter((c) => c.telefono.replace(/\s/g, "").includes(term))
      );
    } else {
      setSearchResults([]);
    }
  }, [searchPhone, clientes]);

  const getInitials = (nombre: string, apellidos: string) =>
    `${nombre?.[0] ?? ""}${apellidos?.[0] ?? ""}`.toUpperCase();

  const fmtDate = (ts: Timestamp) =>
    ts?.toDate().toLocaleDateString("es-MX", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }) ?? "";

  return (
    <div className="space-y-6">
      {/* Error de red */}
      {networkError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          ⚠️ {networkError}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-600">
            Bienvenido, {user?.displayName || user?.email}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/clientes"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Nuevo Cliente
          </Link>
          <Link
            href="/dashboard/nuevo-pedido"
            className="rounded-full bg-[#facc15] px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400"
          >
            Nuevo Pedido
          </Link>
        </div>
      </header>

      {/* Stats — solo owner */}
      {isOwner && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total clientes", value: clientes.length, sub: "Registrados" },
            { label: "Nuevos (7 días)", value: stats.nuevos7dias, sub: "Últimos 7 días" },
            { label: "Pedidos del mes", value: stats.pedidosMes, sub: "Mes actual" },
            {
              label: "Ticket promedio",
              value: `$${stats.ticketPromedio.toLocaleString("es-MX")}`,
              sub: "Por pedido",
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {stat.label}
              </p>
              {loadingPedidos || loadingClientes ? (
                <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-200" />
              ) : (
                <p className="mt-3 text-2xl font-semibold text-slate-900">{stat.value}</p>
              )}
              <p className="text-xs text-slate-500">{stat.sub}</p>
            </div>
          ))}
        </section>
      )}

      {/* Búsqueda por teléfono */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Buscar cliente por teléfono
        </label>
        <input
          type="tel"
          maxLength={10}
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 sm:max-w-xs"
          placeholder="Ingresa el número..."
        />

        {searchResults.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              {searchResults.length} resultado{searchResults.length !== 1 && "s"}
            </p>
            <ul className="divide-y divide-slate-100">
              {searchResults.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {getInitials(c.nombre, c.apellidos)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {c.nombre} {c.apellidos}
                      </p>
                      <p className="text-xs text-slate-500">{c.telefono}</p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/nuevo-pedido"
                    className="rounded-lg bg-[#facc15] px-3 py-1 text-xs font-medium text-slate-900 hover:bg-amber-400"
                  >
                    Nuevo Pedido
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {searchPhone.replace(/\s/g, "").length >= 3 && searchResults.length === 0 && !loadingClientes && (
          <p className="mt-3 text-sm text-slate-500">
            No se encontró ningún cliente.{" "}
            <Link href="/dashboard/clientes" className="font-medium text-amber-600 hover:underline">
              Registrar cliente nuevo
            </Link>
          </p>
        )}
      </section>

      {/* Clientes recientes */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Clientes recientes</h2>
          <Link href="/dashboard/clientes" className="text-xs font-medium text-slate-500 hover:text-slate-700">
            Ver todos
          </Link>
        </div>

        {loadingClientes ? (
          <Skeleton rows={4} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentClientes.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {getInitials(c.nombre, c.apellidos)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {c.nombre} {c.apellidos}
                    </p>
                    <p className="text-xs text-slate-500">{c.telefono}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{fmtDate(c.createdAt)}</p>
              </li>
            ))}
            {recentClientes.length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">
                No hay clientes registrados
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
