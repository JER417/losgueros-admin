// src/app/dashboard/productos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Plus, X, Pencil, Trash2, AlertCircle, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import type { Producto } from "@/types";

const UNIDADES = ["kg", "pieza", "litro", "vaso", "orden", "docena", "paquete"];

const emptyForm = { nombre: "", precio: "", unidad: "kg" };

export default function ProductosPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Solo owner puede acceder
  useEffect(() => {
    if (user && user.role !== "owner") router.replace("/dashboard");
  }, [user, router]);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "productos"), orderBy("nombre", "asc"));
    return onSnapshot(q, (snap) => {
      setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Producto[]);
    });
  }, []);

  const openCrear = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditar = (p: Producto) => {
    setFormData({ nombre: p.nombre, precio: String(p.precio), unidad: p.unidad });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        precio: parseFloat(formData.precio) || 0,
        unidad: formData.unidad,
        activo: true,
      };

      if (editingId) {
        await updateDoc(doc(db, "productos", editingId), payload);
      } else {
        await addDoc(collection(db, "productos"), {
          ...payload,
          createdAt: Timestamp.now(),
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el producto.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (p: Producto) => {
    await updateDoc(doc(db, "productos", p.id), { activo: !p.activo });
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "productos", id));
    setDeleteConfirmId(null);
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]";

  if (user?.role !== "owner") return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Catálogo de Productos</h1>
          <p className="text-slate-600">Gestiona los productos disponibles para los pedidos</p>
        </div>
        <button
          onClick={openCrear}
          className="flex items-center gap-2 rounded-lg bg-[#facc15] px-4 py-2 font-medium text-slate-900 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      {productos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-500">No hay productos en el catálogo</p>
          <p className="mt-1 text-sm text-slate-400">
            Agrega los productos que ofrece el negocio para agilizar la captura de pedidos.
          </p>
          <button
            onClick={openCrear}
            className="mt-4 rounded-lg bg-[#facc15] px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400"
          >
            Agregar primer producto
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Producto</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Unidad</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Precio</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Estado</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.map((p) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${!p.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{p.unidad}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    ${p.precio.toLocaleString("es-MX")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActivo(p)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.activo
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEditar(p)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear / editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData((f) => ({ ...f, nombre: e.target.value }))}
                  required
                  placeholder="Ej: Kg Barbacoa"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Precio ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={formData.precio}
                    onChange={(e) => setFormData((f) => ({ ...f, precio: e.target.value }))}
                    required
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Unidad *</label>
                  <select
                    value={formData.unidad}
                    onChange={(e) => setFormData((f) => ({ ...f, unidad: e.target.value }))}
                    className={inputClass}
                  >
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-[#facc15] px-4 py-2 font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                >
                  {loading ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Eliminar producto</h3>
                <p className="text-sm text-slate-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
