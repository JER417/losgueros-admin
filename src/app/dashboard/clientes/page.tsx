"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Plus, X, Phone, Mail, MapPin } from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  direccion: {
    calle: string;
    noExt: string;
    noInt: string;
    colonia: string;
    ciudad: string;
    estado: string;
    cp: string;
    referencias: string;
  };
  createdAt: Timestamp;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
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
  });

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, "clientes"), {
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        telefono: formData.telefono,
        correo: formData.correo,
        direccion: {
          calle: formData.calle,
          noExt: formData.noExt,
          noInt: formData.noInt,
          colonia: formData.colonia,
          ciudad: formData.ciudad,
          estado: formData.estado,
          cp: formData.cp,
          referencias: formData.referencias,
        },
        createdAt: Timestamp.now(),
      });

      setFormData({
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
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating cliente:", error);
      alert("Error al crear el cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Clientes</h1>
          <p className="text-slate-600">Lista de clientes registrados</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#facc15] px-4 py-2 font-medium text-slate-900 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Clientes List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clientes.map((cliente) => (
          <div
            key={cliente.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="font-semibold text-slate-800">
              {cliente.nombre} {cliente.apellidos}
            </h3>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {cliente.telefono}
              </p>
              {cliente.correo && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {cliente.correo}
                </p>
              )}
              {cliente.direccion?.calle && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {cliente.direccion.calle} {cliente.direccion.noExt}
                  {cliente.direccion.noInt && ` Int. ${cliente.direccion.noInt}`}
                  , {cliente.direccion.colonia}
                </p>
              )}
            </div>
          </div>
        ))}
        {clientes.length === 0 && (
          <p className="col-span-full text-center text-slate-500">
            No hay clientes registrados
          </p>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">
                Nuevo Cliente
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Basic Info */}
              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    placeholder="Nombre"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleInputChange}
                    placeholder="Apellidos"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Telefono *
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="55 1234 5678"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Correo
                  </label>
                  <input
                    type="email"
                    name="correo"
                    value={formData.correo}
                    onChange={handleInputChange}
                    placeholder="correo@email.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="mb-4">
                <h3 className="mb-3 font-medium text-slate-700">Direccion</h3>

                <div className="mb-4 grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Calle
                    </label>
                    <input
                      type="text"
                      name="calle"
                      value={formData.calle}
                      onChange={handleInputChange}
                      placeholder="Calle"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      No. Ext
                    </label>
                    <input
                      type="text"
                      name="noExt"
                      value={formData.noExt}
                      onChange={handleInputChange}
                      placeholder="#"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      No. Int
                    </label>
                    <input
                      type="text"
                      name="noInt"
                      value={formData.noInt}
                      onChange={handleInputChange}
                      placeholder="Opcional"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                    />
                  </div>
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Colonia
                    </label>
                    <input
                      type="text"
                      name="colonia"
                      value={formData.colonia}
                      onChange={handleInputChange}
                      placeholder="Colonia"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      name="ciudad"
                      value={formData.ciudad}
                      onChange={handleInputChange}
                      placeholder="Ciudad"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                    />
                  </div>
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Estado
                    </label>
                    <input
                      type="text"
                      name="estado"
                      value={formData.estado}
                      onChange={handleInputChange}
                      placeholder="Estado"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      CP
                    </label>
                    <input
                      type="text"
                      name="cp"
                      value={formData.cp}
                      onChange={handleInputChange}
                      placeholder="00000"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Referencias
                  </label>
                  <input
                    type="text"
                    name="referencias"
                    value={formData.referencias}
                    onChange={handleInputChange}
                    placeholder="Referencias para llegar"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>
              </div>

              {/* Buttons */}
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
                  {loading ? "Guardando..." : "Crear Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
