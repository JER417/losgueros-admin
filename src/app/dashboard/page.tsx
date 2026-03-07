"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const isOwner = useMemo(() => user?.role === "owner", [user]);

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
          <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
            Nuevo Cliente
          </button>
          <button className="rounded-full bg-[#facc15] px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400">
            Nuevo Pedido
          </button>
        </div>
      </header>

      {isOwner && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Total Clientes
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">8</p>
            <p className="text-xs text-slate-500">Clientes registrados</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Nuevos (7 días)
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">0</p>
            <p className="text-xs text-slate-500">Últimos 7 días</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Pedidos del Mes
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">0</p>
            <p className="text-xs text-slate-500">Mes actual</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Ticket Promedio
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              $1,776
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
                Buscar por teléfono
              </label>
              <input
                id="phone-search"
                type="tel"
                maxLength={10}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                placeholder="Ingresa 10 dígitos"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Clientes Recientes
            </h2>
            <button className="text-xs font-medium text-slate-500 hover:text-slate-700">
              Ver todos
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            <li className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                  PS
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Patricia Sanchez Mora
                  </p>
                  <p className="text-xs text-slate-500">55 8765 4321</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">24/2/2025</p>
            </li>
            <li className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                  MT
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Miguel Torres Fuentes
                  </p>
                  <p className="text-xs text-slate-500">55 2345 6789</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">19/2/2025</p>
            </li>
            <li className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                  LM
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Lucía Morales Ríos
                  </p>
                  <p className="text-xs text-slate-500">55 3456 7890</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">13/2/2025</p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
