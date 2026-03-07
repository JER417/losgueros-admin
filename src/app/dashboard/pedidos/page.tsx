"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Plus, Calendar, User, FileText } from "lucide-react";

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

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

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

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "bg-amber-100 text-amber-800";
      case "completado":
        return "bg-green-100 text-green-800";
      case "cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Pedidos</h1>
          <p className="text-slate-600">Historial de pedidos</p>
        </div>
        <Link
          href="/dashboard/nuevo-pedido"
          className="flex items-center gap-2 rounded-lg bg-[#facc15] px-4 py-2 font-medium text-slate-900 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Nuevo Pedido
        </Link>
      </div>

      {/* Pedidos List */}
      <div className="space-y-4">
        {pedidos.map((pedido) => (
          <div
            key={pedido.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-800">
                    {pedido.clienteNombre}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(
                      pedido.status
                    )}`}
                  >
                    {pedido.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {pedido.clienteTelefono}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(pedido.fecha)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-slate-800">
                  ${pedido.totalGeneral.toLocaleString("es-MX")}
                </p>
                <p className="text-sm text-slate-500">
                  {pedido.items.length} item{pedido.items.length !== 1 && "s"}
                </p>
              </div>
            </div>

            {/* Items Preview */}
            <div className="mt-3 border-t border-slate-100 pt-3">
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {pedido.items
                    .map((item) => `${item.cantidad}x ${item.concepto}`)
                    .join(", ")}
                </p>
              </div>
              {pedido.notas && (
                <p className="mt-1 text-sm italic text-slate-500">
                  Notas: {pedido.notas}
                </p>
              )}
            </div>
          </div>
        ))}

        {pedidos.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-slate-500">No hay pedidos registrados</p>
            <Link
              href="/dashboard/nuevo-pedido"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#d4a500] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Crear primer pedido
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
