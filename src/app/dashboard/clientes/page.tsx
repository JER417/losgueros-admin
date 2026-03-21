"use client";

import { useState, useEffect, useMemo } from "react";
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
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { Plus, X, Phone, MapPin, Search, Pencil, Trash2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Direccion {
  calle: string;
  noExt: string;
  noInt: string;
  colonia: string;
  ciudad: string;
  estado: string;
  cp: string;
  referencias: string;
}

interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  direccion: Direccion;
  createdAt: Timestamp;
}

const emptyForm = {
  nombre: "",
  apellidos: "",
  telefono: "",
  correo: "",
  calle: "",
  noExt: "",
  noInt: "",
  colonia: "",
  ciudad: "",
  estado: "",
  cp: "",
  referencias: "",
};

type ModalMode = "crear" | "editar";

export default function ClientesPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("crear");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Cliente[]);
    });
  }, []);

  // Filtrado en memoria (sin queries extra)
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().replace(/\s/g, "");
    if (!term) return clientes;
    return clientes.filter(
      (c) =>
        `${c.nombre} ${c.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telefono.replace(/\s/g, "").includes(term) ||
        c.direccion?.colonia?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm]);

  const openCrear = () => {
    setFormData(emptyForm);
    setFormError("");
    setEditingId(null);
    setModalMode("crear");
    setIsModalOpen(true);
  };

  const openEditar = (cliente: Cliente) => {
    setFormData({
      nombre: cliente.nombre,
      apellidos: cliente.apellidos,
      telefono: cliente.telefono,
      correo: cliente.correo ?? "",
      calle: cliente.direccion?.calle ?? "",
      noExt: cliente.direccion?.noExt ?? "",
      noInt: cliente.direccion?.noInt ?? "",
      colonia: cliente.direccion?.colonia ?? "",
      ciudad: cliente.direccion?.ciudad ?? "",
      estado: cliente.direccion?.estado ?? "",
      cp: cliente.direccion?.cp ?? "",
      referencias: cliente.direccion?.referencias ?? "",
    });
    setFormError("");
    setEditingId(cliente.id);
    setModalMode("editar");
    setIsModalOpen(true);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    try {
      // Validar teléfono único (al crear o si cambió)
      const editingCliente = editingId ? clientes.find((c) => c.id === editingId) : null;
      const phoneChanged = !editingCliente || editingCliente.telefono !== formData.telefono;

      if (phoneChanged) {
        const q = query(
          collection(db, "clientes"),
          where("telefono", "==", formData.telefono)
        );
        const existing = await getDocs(q);
        const conflict = existing.docs.find((d) => d.id !== editingId);
        if (conflict) {
          setFormError("Ya existe un cliente con ese número de teléfono.");
          setLoading(false);
          return;
        }
      }

      const payload = {
        nombre: formData.nombre.trim(),
        apellidos: formData.apellidos.trim(),
        telefono: formData.telefono.trim(),
        correo: formData.correo.trim(),
        direccion: {
          calle: formData.calle.trim(),
          noExt: formData.noExt.trim(),
          noInt: formData.noInt.trim(),
          colonia: formData.colonia.trim(),
          ciudad: formData.ciudad.trim(),
          estado: formData.estado.trim(),
          cp: formData.cp.trim(),
          referencias: formData.referencias.trim(),
        },
      };

      if (modalMode === "crear") {
        await addDoc(collection(db, "clientes"), {
          ...payload,
          createdAt: Timestamp.now(),
        });
      } else if (editingId) {
        await updateDoc(doc(db, "clientes", editingId), payload);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError("Ocurrió un error. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "clientes", id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el cliente.");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Clientes</h1>
          <p className="text-slate-600">{clientes.length} clientes registrados</p>
        </div>
        <button
          onClick={openCrear}
          className="flex items-center gap-2 rounded-lg bg-[#facc15] px-4 py-2 font-medium text-slate-900 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, teléfono o colonia..."
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((cliente) => (
          <div
            key={cliente.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800">
                {cliente.nombre} {cliente.apellidos}
              </h3>
              {isOwner && (
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEditar(cliente)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(cliente.id)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                {cliente.telefono}
              </p>
              {cliente.direccion?.calle ? (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {cliente.direccion.calle} {cliente.direccion.noExt}
                    {cliente.direccion.noInt ? ` Int. ${cliente.direccion.noInt}` : ""},
                    Col. {cliente.direccion.colonia}
                    {cliente.direccion.referencias && (
                      <span className="block text-xs text-slate-400 italic">
                        Ref: {cliente.direccion.referencias}
                      </span>
                    )}
                  </span>
                </p>
              ) : (
                <p className="flex items-center gap-2 text-amber-600">
                  <MapPin className="h-4 w-4 shrink-0" />
                  Sin dirección registrada
                </p>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-slate-500">
            {searchTerm ? "No se encontraron clientes con ese criterio." : "No hay clientes registrados."}
          </p>
        )}
      </div>

      {/* ── Modal crear / editar ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-800">
                {modalMode === "crear" ? "Nuevo Cliente" : "Editar Cliente"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Datos básicos */}
              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input name="nombre" type="text" value={formData.nombre} onChange={handleInput} required placeholder="Nombre" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Apellidos *</label>
                  <input name="apellidos" type="text" value={formData.apellidos} onChange={handleInput} required placeholder="Apellidos" className={inputClass} />
                </div>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Teléfono * (10 dígitos)</label>
                  <input
                    name="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={handleInput}
                    required
                    maxLength={10}
                    pattern="\d{10}"
                    placeholder="5512345678"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Correo</label>
                  <input name="correo" type="email" value={formData.correo} onChange={handleInput} placeholder="correo@ejemplo.com" className={inputClass} />
                </div>
              </div>

              {/* Dirección */}
              <div className="mb-4 rounded-lg bg-slate-50 p-4">
                <h3 className="mb-3 font-medium text-slate-700">Dirección de entrega</h3>

                <div className="mb-3 grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <label className={labelClass}>Calle</label>
                    <input name="calle" type="text" value={formData.calle} onChange={handleInput} placeholder="Calle" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>No. Ext</label>
                    <input name="noExt" type="text" value={formData.noExt} onChange={handleInput} placeholder="#" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>No. Int</label>
                    <input name="noInt" type="text" value={formData.noInt} onChange={handleInput} placeholder="Opcional" className={inputClass} />
                  </div>
                </div>

                <div className="mb-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Colonia</label>
                    <input name="colonia" type="text" value={formData.colonia} onChange={handleInput} placeholder="Colonia" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Ciudad</label>
                    <input name="ciudad" type="text" value={formData.ciudad} onChange={handleInput} placeholder="Ciudad" className={inputClass} />
                  </div>
                </div>

                <div className="mb-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Estado</label>
                    <input name="estado" type="text" value={formData.estado} onChange={handleInput} placeholder="Estado" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>CP</label>
                    <input name="cp" type="text" value={formData.cp} onChange={handleInput} maxLength={5} placeholder="00000" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Referencias</label>
                  <input name="referencias" type="text" value={formData.referencias} onChange={handleInput} placeholder="Ej: Frente al parque, portón azul" className={inputClass} />
                </div>
              </div>

              {formError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3">
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
                  {loading ? "Guardando..." : modalMode === "crear" ? "Crear Cliente" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Eliminar cliente</h3>
                <p className="text-sm text-slate-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <p className="mb-5 text-sm text-slate-600">
              ¿Estás seguro de que quieres eliminar este cliente? Sus pedidos anteriores se conservarán.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
