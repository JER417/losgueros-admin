// src/app/dashboard/nuevo-pedido/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
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
  where,
} from "firebase/firestore";
import { ArrowLeft, Plus, Trash2, MapPin, ChevronDown } from "lucide-react";
import type { Producto } from "@/types";

interface DireccionCliente {
  calle: string; noExt: string; noInt?: string; colonia: string;
  ciudad: string; estado?: string; cp?: string; referencias: string;
}

interface Cliente {
  id: string; nombre: string; apellidos: string;
  telefono: string; direccion?: DireccionCliente;
}

interface PedidoItem {
  id: string; productoId?: string;
  cantidad: number; concepto: string;
  precioUnitario: number; total: number;
}

const newItem = (): PedidoItem => ({
  id: crypto.randomUUID(), cantidad: 1,
  concepto: "", precioUnitario: 0, total: 0,
});

export default function NuevoPedidoPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<PedidoItem[]>([newItem()]);
  const [loading, setLoading] = useState(false);

  // FIX: ref para cerrar dropdown al hacer click fuera
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Cliente[]);
    });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "productos"),
      where("activo", "==", true),
      orderBy("nombre", "asc")
    );
    return onSnapshot(q, (snap) => {
      setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Producto[]);
    });
  }, []);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const term = searchTerm.toLowerCase();
      setFilteredClientes(
        clientes.filter(
          (c) =>
            `${c.nombre} ${c.apellidos}`.toLowerCase().includes(term) ||
            c.telefono.replace(/\s/g, "").includes(term.replace(/\s/g, ""))
        )
      );
      setShowDropdown(true);
    } else {
      setFilteredClientes([]);
      setShowDropdown(false);
    }
  }, [searchTerm, clientes]);

  const handleSelectCliente = (c: Cliente) => {
    setSelectedCliente(c);
    setSearchTerm(`${c.nombre} ${c.apellidos}`);
    setShowDropdown(false);
  };

  const handleSelectProducto = (itemId: string, productoId: string) => {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id !== itemId ? item : {
          ...item, productoId,
          concepto: producto.nombre,
          precioUnitario: producto.precio,
          total: item.cantidad * producto.precio,
        }
      )
    );
  };

  const handleItemChange = (
    id: string,
    field: "cantidad" | "concepto" | "precioUnitario",
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Recalcular total cuando cambia cantidad o precio unitario
        if (field === "cantidad" || field === "precioUnitario") {
          const cant = field === "cantidad" ? Number(value) : updated.cantidad;
          const precio = field === "precioUnitario" ? Number(value) : updated.precioUnitario;
          updated.total = cant * precio;
        }
        return updated;
      })
    );
  };

  const totalGeneral = items.reduce((s, i) => s + (i.total || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return alert("Selecciona un cliente");
    if (items.some((i) => !i.concepto)) return alert("Completa todos los conceptos");
    if (items.some((i) => i.total <= 0)) return alert("Todos los productos deben tener un precio mayor a $0");

    setLoading(true);
    try {
      await addDoc(collection(db, "pedidos"), {
        clienteId: selectedCliente.id,
        clienteNombre: `${selectedCliente.nombre} ${selectedCliente.apellidos}`,
        clienteTelefono: selectedCliente.telefono,
        direccionEntrega: selectedCliente.direccion ?? null,
        fecha: Timestamp.fromDate(new Date(fecha)),
        notas,
        items: items.map(({ cantidad, concepto, precioUnitario, total }) => ({
          cantidad, concepto, precioUnitario, total,
        })),
        totalGeneral,
        status: "pendiente",
        createdAt: Timestamp.now(),
      });
      router.push("/dashboard/pedidos");
    } catch (err) {
      console.error(err);
      alert("Error al guardar el pedido");
    } finally {
      setLoading(false);
    }
  };

  const dir = selectedCliente?.direccion;
  const hasAddress = !!dir?.calle;
  const ic = "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]";

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
        <Link href="/dashboard/pedidos" className="flex items-center gap-1 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Pedidos
        </Link>
        <span>/</span>
        <span>Nuevo Pedido</span>
      </div>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Nuevo Pedido</h1>

      <form onSubmit={handleSubmit}>
        {/* Cliente */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Cliente</h2>

          <div className="grid gap-4 md:grid-cols-2">
            {/* FIX: ref en el wrapper para detectar click fuera */}
            <div className="relative" ref={dropdownRef}>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Buscar cliente *
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedCliente(null); }}
                placeholder="Nombre o teléfono..."
                className={ic}
              />
              {showDropdown && filteredClientes.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filteredClientes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCliente(c)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-800">{c.nombre} {c.apellidos}</span>
                      <span className="ml-2 text-slate-500">{c.telefono}</span>
                      {c.direccion?.colonia && (
                        <span className="ml-1 text-xs text-slate-400">— {c.direccion.colonia}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && searchTerm && filteredClientes.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg">
                  No se encontró el cliente.{" "}
                  <Link href="/dashboard/clientes" className="font-medium text-amber-600 hover:underline">
                    Registrarlo
                  </Link>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={ic} />
            </div>
          </div>

          {/* Dirección del cliente seleccionado */}
          {selectedCliente && (
            <div className={`mt-4 rounded-lg border p-3 text-sm ${hasAddress ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-start gap-2">
                <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${hasAddress ? "text-amber-600" : "text-red-500"}`} />
                <div>
                  {hasAddress ? (
                    <>
                      <p className="font-medium text-slate-700">Dirección de entrega</p>
                      <p className="mt-0.5 text-slate-600">
                        {dir!.calle} {dir!.noExt}{dir!.noInt ? ` Int. ${dir!.noInt}` : ""}, Col. {dir!.colonia}, {dir!.ciudad}
                      </p>
                      {dir!.referencias && (
                        <p className="mt-0.5 italic text-slate-500">Ref: {dir!.referencias}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-red-700">Sin dirección registrada</p>
                      <p className="text-red-600">
                        El ticket no tendrá dirección.{" "}
                        <Link href="/dashboard/clientes" className="underline hover:text-red-800">
                          Editar cliente
                        </Link>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Notas (opcional)</label>
            <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Sin chile, tortillas de más..." className={ic} />
          </div>
        </div>

        {/* Productos */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Productos</h2>
            <button type="button" onClick={() => setItems((p) => [...p, newItem()])} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <Plus className="h-4 w-4" />
              Agregar fila
            </button>
          </div>

          {/* FIX: columnas siempre claras — Cant / Concepto / Catálogo / P.Unit / Total / X */}
          <div className="mb-2 hidden grid-cols-12 gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid">
            <div className="col-span-1">Cant.</div>
            <div className="col-span-4">Concepto</div>
            <div className="col-span-3">Catálogo</div>
            <div className="col-span-2 text-right">P. Unit.</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1" />
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 items-center gap-2">
                {/* Cantidad */}
                <div className="col-span-1">
                  <input
                    type="number" min="1" value={item.cantidad}
                    onChange={(e) => handleItemChange(item.id, "cantidad", parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-center text-slate-800 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>

                {/* Concepto */}
                <div className="col-span-4">
                  <input
                    type="text" value={item.concepto}
                    onChange={(e) => handleItemChange(item.id, "concepto", e.target.value)}
                    placeholder="Concepto..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>

                {/* Catálogo */}
                <div className="relative col-span-3">
                  <select
                    value={item.productoId ?? ""}
                    onChange={(e) =>
                      e.target.value
                        ? handleSelectProducto(item.id, e.target.value)
                        : setItems((prev) =>
                            prev.map((i) =>
                              i.id === item.id
                                ? { ...i, productoId: undefined, precioUnitario: 0, total: 0 }
                                : i
                            )
                          )
                    }
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  >
                    <option value="">— manual —</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} ${p.precio}/{p.unidad}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {/* FIX: P. Unitario — siempre editable, siempre visible */}
                <div className="col-span-2">
                  <input
                    type="number" min="0" step="0.50"
                    value={item.precioUnitario}
                    onChange={(e) =>
                      handleItemChange(item.id, "precioUnitario", parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-right text-slate-800 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>

                {/* Total — siempre calculado, readonly */}
                <div className="col-span-1 text-right text-sm font-semibold text-slate-800">
                  ${item.total.toLocaleString("es-MX")}
                </div>

                {/* Eliminar */}
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => { if (items.length > 1) setItems((p) => p.filter((i) => i.id !== item.id)); }}
                    disabled={items.length === 1}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
            <div className="text-lg font-semibold text-slate-800">
              Total: <span className="text-xl">${totalGeneral.toLocaleString("es-MX")}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/pedidos" className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
            Cancelar
          </Link>
          <button type="submit" disabled={loading} className="rounded-lg bg-[#facc15] px-4 py-2 font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50">
            {loading ? "Guardando..." : "Guardar Pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
