// src/app/dashboard/clientes/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, where, getDocs, Timestamp,
} from "firebase/firestore";
import {
  Plus, X, Phone, MapPin, Search, Pencil,
  Trash2, AlertCircle, User, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Direccion {
  calle: string; noExt: string; noInt: string; colonia: string;
  ciudad: string; estado: string; cp: string; referencias: string;
}
interface Cliente {
  id: string; nombre: string; apellidos: string; telefono: string;
  correo: string; direccion: Direccion; createdAt: Timestamp;
}

const emptyForm = {
  nombre: "", apellidos: "", telefono: "", correo: "",
  calle: "", noExt: "", noInt: "", colonia: "",
  ciudad: "", estado: "", cp: "", referencias: "",
};

type ModalMode = "crear" | "editar";

/* ── helpers ───────────────────────────────────── */
const initials = (n: string, a: string) => `${n?.[0] ?? ""}${a?.[0] ?? ""}`.toUpperCase();

/* ── Label / Input wrappers ────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </label>
  );
}

/* ── Card skeleton ──────────────────────────────── */
function CardSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #f3f4f6", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
      <div style={{ height: 14, width: "60%", background: "#f3f4f6", borderRadius: 4, marginBottom: 12 }} />
      <div style={{ height: 12, width: "40%", background: "#f3f4f6", borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 12, width: "70%", background: "#f3f4f6", borderRadius: 4 }} />
    </div>
  );
}

/* ── main ───────────────────────────────────────── */
export default function ClientesPage() {
  const { user } = useAuth();
  const isOwner  = user?.role === "owner";

  const [clientes,       setClientes]       = useState<Cliente[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [loadingData,    setLoadingData]    = useState(true);
  const [networkError,   setNetworkError]   = useState("");
  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [modalMode,      setModalMode]      = useState<ModalMode>("crear");
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [formData,       setFormData]       = useState(emptyForm);
  const [formError,      setFormError]      = useState("");
  const [searchTerm,     setSearchTerm]     = useState("");
  const [deleteConfirmId,setDeleteConfirmId]= useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"));
    return onSnapshot(q,
      snap => { setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Cliente[]); setLoadingData(false); },
      err  => { console.error(err); setNetworkError("Error de conexión."); setLoadingData(false); }
    );
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().replace(/\s/g, "");
    if (!term) return clientes;
    return clientes.filter(c =>
      `${c.nombre} ${c.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefono.replace(/\s/g, "").includes(term) ||
      c.direccion?.colonia?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm]);

  const openCrear = () => { setFormData(emptyForm); setFormError(""); setEditingId(null); setModalMode("crear"); setIsModalOpen(true); };
  const openEditar = (c: Cliente) => {
    setFormData({
      nombre: c.nombre, apellidos: c.apellidos, telefono: c.telefono, correo: c.correo ?? "",
      calle: c.direccion?.calle ?? "", noExt: c.direccion?.noExt ?? "", noInt: c.direccion?.noInt ?? "",
      colonia: c.direccion?.colonia ?? "", ciudad: c.direccion?.ciudad ?? "",
      estado: c.direccion?.estado ?? "", cp: c.direccion?.cp ?? "", referencias: c.direccion?.referencias ?? "",
    });
    setFormError(""); setEditingId(c.id); setModalMode("editar"); setIsModalOpen(true);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setFormError("");
    try {
      const editingCliente = editingId ? clientes.find(c => c.id === editingId) : null;
      if (!editingCliente || editingCliente.telefono !== formData.telefono) {
        const existing = await getDocs(query(collection(db, "clientes"), where("telefono", "==", formData.telefono)));
        if (existing.docs.some(d => d.id !== editingId)) {
          setFormError("Ya existe un cliente con ese número de teléfono."); return;
        }
      }
      const payload = {
        nombre: formData.nombre.trim(), apellidos: formData.apellidos.trim(),
        telefono: formData.telefono.trim(), correo: formData.correo.trim(),
        direccion: {
          calle: formData.calle.trim(), noExt: formData.noExt.trim(), noInt: formData.noInt.trim(),
          colonia: formData.colonia.trim(), ciudad: formData.ciudad.trim(),
          estado: formData.estado.trim(), cp: formData.cp.trim(), referencias: formData.referencias.trim(),
        },
      };
      if (modalMode === "crear") {
        await addDoc(collection(db, "clientes"), { ...payload, createdAt: Timestamp.now() });
      } else if (editingId) {
        await updateDoc(doc(db, "clientes", editingId), payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err); setFormError("Ocurrió un error. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDoc(doc(db, "clientes", id)); setDeleteConfirmId(null); }
    catch { alert("Error al eliminar el cliente."); }
  };

  /* ── styles ── */
  const card: React.CSSProperties = {
    background: "#fff", border: "1.5px solid #f3f4f6",
    borderRadius: 14, padding: "18px 20px",
    boxShadow: "0 1px 4px rgba(0,0,0,.04)",
  };
  const sectionTitle: React.CSSProperties = {
    margin: "0 0 10px", fontSize: 11, fontWeight: 700,
    color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em",
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
            Clientes
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af" }}>
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} registrado{clientes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openCrear}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 18px", background: "#dc2626",
            border: "none", borderRadius: 9, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          <Plus size={14} /> Nuevo Cliente
        </button>
      </div>

      {networkError && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, marginBottom: 18, fontSize: 13, color: "#b91c1c" }}>
          <AlertCircle size={14} /> {networkError}
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20, maxWidth: 400 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, teléfono o colonia..."
          className="field"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
        {loadingData
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
          : filtered.map(c => (
              <div key={c.id} style={card}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div
                      style={{
                        width: 38, height: 38, borderRadius: "50%",
                        background: "#fef2f2", color: "#dc2626",
                        fontSize: 13, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                    >
                      {initials(c.nombre, c.apellidos)}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>
                        {c.nombre} {c.apellidos}
                      </p>
                    </div>
                  </div>
                  {isOwner && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => openEditar(c)}
                        style={{ padding: 6, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", borderRadius: 6, display: "flex" }}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(c.id)}
                        style={{ padding: 6, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", borderRadius: 6, display: "flex" }}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#6b7280" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Phone size={13} style={{ flexShrink: 0, color: "#dc2626" }} />
                    {c.telefono}
                  </div>
                  {c.direccion?.calle ? (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: "#dc2626" }} />
                      <span style={{ lineHeight: 1.4 }}>
                        {c.direccion.calle} {c.direccion.noExt}
                        {c.direccion.noInt ? ` Int. ${c.direccion.noInt}` : ""}, Col. {c.direccion.colonia}
                        {c.direccion.referencias && (
                          <span style={{ display: "block", fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginTop: 2 }}>
                            Ref: {c.direccion.referencias}
                          </span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <MapPin size={13} style={{ flexShrink: 0, color: "#facc15" }} />
                      <span style={{ color: "#ca8a04", fontSize: 12, fontWeight: 500 }}>Sin dirección registrada</span>
                    </div>
                  )}
                </div>
              </div>
            ))
        }
      </div>

      {!loadingData && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <User size={32} style={{ color: "#d1d5db", margin: "0 auto 12px" }} />
          <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>
            {searchTerm ? "No se encontraron clientes." : "No hay clientes registrados."}
          </p>
        </div>
      )}

      {/* ── Modal crear / editar ─────────────────────── */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 660, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 56px rgba(0,0,0,.2)" }}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1.5px solid #f3f4f6" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111827" }}>
                {modalMode === "crear" ? "Nuevo Cliente" : "Editar Cliente"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: 6, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", borderRadius: 6, display: "flex" }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Nombre / Apellidos */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><Label>Nombre *</Label><input name="nombre" type="text" value={formData.nombre} onChange={handleInput} required placeholder="Nombre" className="field" /></div>
                  <div><Label>Apellidos *</Label><input name="apellidos" type="text" value={formData.apellidos} onChange={handleInput} required placeholder="Apellidos" className="field" /></div>
                </div>

                {/* Teléfono / Correo */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <Label>Teléfono * (10 dígitos)</Label>
                    <input name="telefono" type="tel" value={formData.telefono} onChange={handleInput} required maxLength={10} pattern="\d{10}" placeholder="5512345678" className="field" />
                  </div>
                  <div><Label>Correo</Label><input name="correo" type="email" value={formData.correo} onChange={handleInput} placeholder="correo@ejemplo.com" className="field" /></div>
                </div>

                {/* Dirección section */}
                <div style={{ background: "#f9fafb", border: "1.5px solid #f3f4f6", borderRadius: 12, padding: 18 }}>
                  <p style={sectionTitle}>Dirección de entrega</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                      <div><Label>Calle</Label><input name="calle" type="text" value={formData.calle} onChange={handleInput} placeholder="Calle" className="field" /></div>
                      <div><Label>No. Ext</Label><input name="noExt" type="text" value={formData.noExt} onChange={handleInput} placeholder="#" className="field" /></div>
                      <div><Label>No. Int</Label><input name="noInt" type="text" value={formData.noInt} onChange={handleInput} placeholder="Opcional" className="field" /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div><Label>Colonia</Label><input name="colonia" type="text" value={formData.colonia} onChange={handleInput} placeholder="Colonia" className="field" /></div>
                      <div><Label>Ciudad</Label><input name="ciudad" type="text" value={formData.ciudad} onChange={handleInput} placeholder="Ciudad" className="field" /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div><Label>Estado</Label><input name="estado" type="text" value={formData.estado} onChange={handleInput} placeholder="Estado" className="field" /></div>
                      <div><Label>CP</Label><input name="cp" type="text" value={formData.cp} onChange={handleInput} maxLength={5} placeholder="00000" className="field" /></div>
                    </div>
                    <div><Label>Referencias</Label><input name="referencias" type="text" value={formData.referencias} onChange={handleInput} placeholder="Ej: Frente al parque, portón azul" className="field" /></div>
                  </div>
                </div>

                {formError && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
                    <AlertCircle size={14} /> {formError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "9px 20px", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading} style={{ padding: "9px 20px", border: "none", borderRadius: 9, background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", opacity: loading ? .7 : 1 }}>
                    {loading ? "Guardando..." : modalMode === "crear" ? "Crear Cliente" : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete modal ─────────────────────── */}
      {deleteConfirmId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 360, boxShadow: "0 24px 48px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertCircle size={18} style={{ color: "#dc2626" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111827" }}>Eliminar cliente</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>Esta acción no se puede deshacer. Sus pedidos anteriores se conservarán.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: "9px 0", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 9, background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
