"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
}

interface PedidoItem {
  id: string;
  cantidad: number;
  concepto: string;
  total: number;
}

export default function NuevoPedidoPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fecha, setFecha] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<PedidoItem[]>([
    { id: crypto.randomUUID(), cantidad: 1, concepto: "", total: 0 },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        nombre: doc.data().nombre,
        apellidos: doc.data().apellidos,
        telefono: doc.data().telefono,
      })) as Cliente[];
      setClientes(clientesData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = clientes.filter(
        (c) =>
          `${c.nombre} ${c.apellidos}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          c.telefono.includes(searchTerm)
      );
      setFilteredClientes(filtered);
      setShowDropdown(true);
    } else {
      setFilteredClientes([]);
      setShowDropdown(false);
    }
  }, [searchTerm, clientes]);

  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setSearchTerm(`${cliente.nombre} ${cliente.apellidos}`);
    setShowDropdown(false);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), cantidad: 1, concepto: "", total: 0 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (
    id: string,
    field: keyof PedidoItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const totalGeneral = items.reduce((sum, item) => sum + (item.total || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCliente) {
      alert("Por favor selecciona un cliente");
      return;
    }

    if (items.some((item) => !item.concepto)) {
      alert("Por favor completa todos los conceptos");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "pedidos"), {
        clienteId: selectedCliente.id,
        clienteNombre: `${selectedCliente.nombre} ${selectedCliente.apellidos}`,
        clienteTelefono: selectedCliente.telefono,
        fecha: Timestamp.fromDate(new Date(fecha)),
        notas,
        items: items.map(({ cantidad, concepto, total }) => ({
          cantidad,
          concepto,
          total,
        })),
        totalGeneral,
        status: "pendiente",
        createdAt: Timestamp.now(),
      });

      router.push("/dashboard/pedidos");
    } catch (error) {
      console.error("Error creating pedido:", error);
      alert("Error al crear el pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
        <Link
          href="/dashboard/pedidos"
          className="flex items-center gap-1 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Pedidos
        </Link>
        <span>/</span>
        <span>Nuevo Pedido</span>
      </div>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">
        Nuevo Pedido
      </h1>

      <form onSubmit={handleSubmit}>
        {/* Cliente Section */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Cliente</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Buscar cliente *
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedCliente(null);
                }}
                placeholder="Nombre o telefono..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
              />
              {showDropdown && filteredClientes.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filteredClientes.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => handleSelectCliente(cliente)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-800">
                        {cliente.nombre} {cliente.apellidos}
                      </span>
                      <span className="ml-2 text-slate-500">
                        {cliente.telefono}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && searchTerm && filteredClientes.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg">
                  No se encontraron clientes
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notas (opcional)
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas adicionales del pedido..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
            />
          </div>
        </div>

        {/* Items Section */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Items del Pedido
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Agregar fila
            </button>
          </div>

          {/* Table Header */}
          <div className="mb-2 grid grid-cols-12 gap-4 text-sm font-medium text-slate-600">
            <div className="col-span-2">Cantidad</div>
            <div className="col-span-7">Concepto</div>
            <div className="col-span-2 text-right">Total ($)</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Rows */}
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 items-center gap-4"
              >
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) =>
                      handleItemChange(
                        item.id,
                        "cantidad",
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>
                <div className="col-span-7">
                  <input
                    type="text"
                    value={item.concepto}
                    onChange={(e) =>
                      handleItemChange(item.id, "concepto", e.target.value)
                    }
                    placeholder="Ej: Kg Barbacoa"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    value={item.total}
                    onChange={(e) =>
                      handleItemChange(
                        item.id,
                        "total",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-slate-800 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:opacity-30"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
            <div className="text-lg font-semibold text-slate-800">
              Total General:{" "}
              <span className="text-xl">
                ${totalGeneral.toLocaleString("es-MX")}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/pedidos"
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#facc15] px-4 py-2 font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar Pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
