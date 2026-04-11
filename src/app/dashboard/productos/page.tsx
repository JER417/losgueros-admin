// src/app/dashboard/productos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, Timestamp,
} from "firebase/firestore";
import {
  Plus, X, Pencil, Trash2, AlertCircle,
  Package, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import type { Producto } from "@/types";

const UNIDADES = ["kg", "pieza", "litro", "vaso", "orden", "docena", "paquete"];
const emptyForm = { nombre: "", precio: "", unidad: "kg" };

const fmtMoney = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}{required && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
  );
}

export default function ProductosPage() {
  const { user } = useAuth();
  const router   = useRouter();

  useEffect(() => {
    if (user && user.role !== "owner") router.replace("/dashboard");
  }, [user, router]);

  const [productos,        setProductos]       = useState<Producto[]>([]);
  const [isModalOpen,      setIsModalOpen]     = useState(false);
  const [editingId,        setEditingId]       = useState<string | null>(null);
  const [formData,         setFormData]        = useState(emptyForm);
  const [formError,        setFormError]       = useState("");
  const [loading,          setLoading]         = useState(false);
  const [loadingData,      setLoadingData]     = useState(true);
  const [deleteConfirmId,  setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "productos"), orderBy("nombre", "asc"));
    return onSnapshot(q,
      snap => { setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Producto[]); setLoadingData(false); },
      err  => { console.error(err); setLoadingData(false); }
    );
  }, []);

  const openCrear = () => { setFormData(emptyForm); setFormError(""); setEditingId(null); setIsModalOpen(true); };
  const openEditar = (p: Producto) => {
    setFormData({ nombre: p.nombre, precio: String(p.precio), unidad: p.unidad });
    setFormError(""); setEditingId(p.id); setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError("");
    const precio = parseFloat(formData.precio);
    if (!precio || precio <= 0) { setFormError("El precio debe ser mayor a $0."); return; }
    setLoading(true);
    try {
      const payload = { nombre: formData.nombre.trim(), precio, unidad: formData.unidad, activo: true };
      if (editingId) {
        await updateDoc(doc(db, "productos", editingId), payload);
      } else {
        await addDoc(collection(db, "productos"), { ...payload, createdAt: Timestamp.now() });
      }
      setIsModalOpen(false);
    } catch (err) { console.error(err); setFormError("Error al guardar. Inténtalo de nuevo."); }
    finally { setLoading(false); }
  };

  const handleToggle = async (p: Producto) => {
    await updateDoc(doc(db, "productos", p.id), { activo: !p.activo });
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "productos", id));
    setDeleteConfirmId(null);
  };

  if (user?.role !== "owner") return null;

  return (
    <div style={{ maxWidth: 840, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
            Catálogo de Productos
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af" }}>
            Productos disponibles al crear pedidos
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
          <Plus size={14} /> Nuevo Producto
        </button>
      </div>

      {/* Empty state */}
      {!loadingData && productos.length === 0 && (
        <div
          style={{
            background: "#fff", border: "1.5px dashed #e5e7eb",
            borderRadius: 16, padding: "64px 24px", textAlign: "center",
          }}
        >
          <Package size={36} style={{ color: "#d1d5db", margin: "0 auto 14px" }} />
          <p style={{ fontWeight: 700, color: "#6b7280", margin: "0 0 6px", fontSize: 15 }}>
            No hay productos en el catálogo
          </p>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 20px" }}>
            Agrega los productos para agilizar la captura de pedidos.
          </p>
          <button
            onClick={openCrear}
            style={{
              padding: "9px 20px", background: "#dc2626", border: "none",
              borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "var(--font-sans)",
            }}
          >
            Agregar primer producto
          </button>
        </div>
      )}

      {/* Skeleton */}
      {loadingData && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 52, background: "#fff", border: "1.5px solid #f3f4f6", borderRadius: 12, animation: "pulse 1.5s infinite" }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
        </div>
      )}

      {/* Table */}
      {!loadingData && productos.length > 0 && (
        <div style={{ background: "#fff", border: "1.5px solid #f3f4f6", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
          {/* Table header */}
          <div
            style={{
              display: "grid", gridTemplateColumns: "1fr 100px 110px 90px 100px",
              padding: "10px 20px", background: "#fafafa",
              borderBottom: "1.5px solid #f3f4f6",
            }}
          >
            {["Producto", "Unidad", "Precio", "Estado", "Acciones"].map((h, i) => (
              <span
                key={h}
                style={{
                  fontSize: 10, fontWeight: 700, color: "#9ca3af",
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  textAlign: i >= 2 ? "center" : "left",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {productos.map((p, idx) => (
            <div
              key={p.id}
              style={{
                display: "grid", gridTemplateColumns: "1fr 100px 110px 90px 100px",
                padding: "13px 20px", alignItems: "center",
                borderBottom: idx < productos.length - 1 ? "1px solid #f9fafb" : "none",
                opacity: p.activo ? 1 : 0.45,
                background: p.activo ? "#fff" : "#fafafa",
                transition: "background .15s",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{p.nombre}</span>
              <span style={{ fontSize: 13, color: "#6b7280", textTransform: "capitalize" }}>{p.unidad}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", textAlign: "center" }}>
                {fmtMoney(p.precio)}
              </span>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => handleToggle(p)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", border: "none",
                    borderRadius: 20, cursor: "pointer",
                    fontSize: 11, fontWeight: 700,
                    background: p.activo ? "#f0fdf4" : "#f3f4f6",
                    color: p.activo ? "#16a34a" : "#9ca3af",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {p.activo
                    ? <ToggleRight size={14} style={{ color: "#16a34a" }} />
                    : <ToggleLeft  size={14} />
                  }
                  {p.activo ? "Activo" : "Inactivo"}
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                <button
                  onClick={() => openEditar(p)}
                  style={{ padding: 7, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", borderRadius: 7, display: "flex" }}
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(p.id)}
                  style={{ padding: 7, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", borderRadius: 7, display: "flex" }}
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal crear / editar ─────────────────────── */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, boxShadow: "0 24px 56px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1.5px solid #f3f4f6" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111827" }}>
                {editingId ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: 6, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", borderRadius: 6, display: "flex" }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <Label required>Nombre</Label>
                <input
                  type="text" value={formData.nombre}
                  onChange={e => setFormData(f => ({ ...f, nombre: e.target.value }))}
                  required placeholder="Ej: Kg Barbacoa"
                  className="field" autoFocus
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <Label required>Precio ($)</Label>
                  <input
                    type="number" min="0.50" step="0.50"
                    value={formData.precio}
                    onChange={e => { setFormData(f => ({ ...f, precio: e.target.value })); setFormError(""); }}
                    required placeholder="0.00"
                    className="field"
                  />
                </div>
                <div>
                  <Label required>Unidad</Label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={formData.unidad}
                      onChange={e => setFormData(f => ({ ...f, unidad: e.target.value }))}
                      className="field" style={{ paddingRight: 28 }}
                    >
                      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <X size={0} />
                  </div>
                </div>
              </div>

              {formError && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
                  <AlertCircle size={14} /> {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "9px 18px", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} style={{ padding: "9px 20px", border: "none", borderRadius: 9, background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", opacity: loading ? .7 : 1 }}>
                  {loading ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm delete ───────────────────────────── */}
      {deleteConfirmId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 360, boxShadow: "0 24px 48px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertCircle size={18} style={{ color: "#dc2626" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111827" }}>Eliminar producto</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: "9px 0", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 9, background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
