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
  where,
  Timestamp,
  limit,
} from "firebase/firestore";

interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  createdAt: Timestamp;
}

interface PedidoItem {
  cantidad: number;
  concepto: string;
  total: number;
}

interface Pedido {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  fecha: Timestamp;
  notas: string;
  items: PedidoItem[];
  totalGeneral: number;
  status: string;
  createdAt: Timestamp;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isOwner = useMemo(() => user?.role === "owner", [user]);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [recentClientes, setRecentClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);

  // Fetch all clientes for stats
  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Cliente[];
      setClientes(clientesData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch recent clientes (last 5)
  useEffect(() => {
    const q = query(
      collection(db, "clientes"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Cliente[];
      setRecentClientes(clientesData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch all pedidos
  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pedidosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Pedido[];
      setPedidos(pedidosData);
    });

    return () => unsubscribe();
  }, []);

  // Calculate stats from real data
  const totalClientes = clientes.length;

  const nuevosClientes7Dias = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return clientes.filter((cliente) => {
      if (!cliente.createdAt) return false;
      const createdDate = cliente.createdAt.toDate();
      return createdDate >= sevenDaysAgo;
    }).length;
  }, [clientes]);

  const pedidosDelMes = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return pedidos.filter((pedido) => {
      if (!pedido.createdAt) return false;
      const createdDate = pedido.createdAt.toDate();
      return createdDate >= firstDayOfMonth;
    }).length;
  }, [pedidos]);

  const ticketPromedio = useMemo(() => {
    if (pedidos.length === 0) return 0;
    const total = pedidos.reduce(
      (sum, pedido) => sum + (pedido.totalGeneral || 0),
      0
    );
    return Math.round(total / pedidos.length);
  }, [pedidos]);

  // Search by phone
  useEffect(() => {
    if (searchPhone.length >= 3) {
      const results = clientes.filter((cliente) =>
        cliente.telefono.replace(/\s/g, "").includes(searchPhone.replace(/\s/g, ""))
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchPhone, clientes]);

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (nombre: string, apellidos: string) => {
    const firstInitial = nombre ? nombre.charAt(0).toUpperCase() : "";
    const lastInitial = apellidos ? apellidos.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Dashboard de Clientes
          </h1>
          <p className="text-sm text-slate-600">
            Resumen general de tu negocio
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

      {isOwner && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Total Clientes
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {totalClientes}
            </p>
            <p className="text-xs text-slate-500">Clientes registrados</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Nuevos (7 dias)
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {nuevosClientes7Dias}
            </p>
            <p className="text-xs text-slate-500">Ultimos 7 dias</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Pedidos del Mes
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {pedidosDelMes}
            </p>
            <p className="text-xs text-slate-500">Mes actual</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Ticket Promedio
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              ${ticketPromedio.toLocaleString("es-MX")}
            </p>
            <p className="text-xs text-slate-500">Promedio por pedido</p>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label
                htmlFor="phone-search"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Buscar por telefono
              </label>
              <input
                id="phone-search"
                type="tel"
                maxLength={10}
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                placeholder="Ingresa 10 digitos"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="mb-2 text-sm font-medium text-slate-700">
                Resultados de busqueda
              </h3>
              <ul className="divide-y divide-slate-100">
                {searchResults.map((cliente) => (
                  <li
                    key={cliente.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {getInitials(cliente.nombre, cliente.apellidos)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {cliente.nombre} {cliente.apellidos}
                        </p>
                        <p className="text-xs text-slate-500">
                          {cliente.telefono}
                        </p>
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

          {searchPhone.length >= 3 && searchResults.length === 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">
                No se encontraron clientes con ese telefono
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Clientes Recientes
            </h2>
            <Link
              href="/dashboard/clientes"
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Ver todos
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentClientes.map((cliente) => (
              <li
                key={cliente.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {getInitials(cliente.nombre, cliente.apellidos)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {cliente.nombre} {cliente.apellidos}
                    </p>
                    <p className="text-xs text-slate-500">{cliente.telefono}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {formatDate(cliente.createdAt)}
                </p>
              </li>
            ))}
            {recentClientes.length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">
                No hay clientes registrados
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
