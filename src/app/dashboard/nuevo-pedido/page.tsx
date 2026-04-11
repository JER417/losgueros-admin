// src/app/dashboard/nuevo-pedido/page.tsx
"use client";

import { v4 as uuidv4 } from "uuid";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { printOrderTicket } from "@/lib/printer/print-order";
import {
  collection, addDoc, onSnapshot, query,
  orderBy, Timestamp, where,
} from "firebase/firestore";
import {
  ArrowLeft, Plus, Trash2, MapPin, ChevronDown,
  Printer, CheckCircle, Search, ArrowLeftRight,
} from "lucide-react";
import type { Producto } from "@/types";

interface DireccionCliente {
  calle: string; noExt: string; noInt?: string; colonia: string;
  ciudad: string; estado?: string; cp?: string; referencias: string;
}
interface Cliente {
  id: string; nombre: string; apellidos: string; telefono: string; direccion?: DireccionCliente;
}
interface PedidoItem {
  id: string;
  productoId?: string;
  cantidad: number;
  concepto: string;
  precioUnitario: number;
  total: number;
  inputMode: "qty" | "money";
  montoRaw: string;
}
type TipoPedido = "llevar" | "recoger" | "envio" | "mesa";
type MetodoPago = "efectivo" | "transferencia" | "tarjeta" | "pendiente" | "otro";

const CLIENTE_EXPRESS_NOMBRE = "Cliente Express";
const TIPOS: { value: TipoPedido; label: string }[] = [
  { value: "llevar",  label: "Para llevar"       },
  { value: "recoger", label: "Para recoger"      },
  { value: "envio",   label: "Envío a domicilio" },
  { value: "mesa",    label: "Mesa"              },
];
const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "efectivo",      label: "Efectivo"      },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta",       label: "Tarjeta"       },
  { value: "pendiente",     label: "Pendiente"     },
  { value: "otro",          label: "Otro"          },
];

const newItem = (): PedidoItem => ({
  id: uuidv4(), cantidad: 1, concepto: "",
  precioUnitario: 0, total: 0, inputMode: "qty", montoRaw: "",
});

const fmtMoney = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const moneyToQty = (monto: number, precioUnitario: number): number => {
  if (!precioUnitario) return 0;
  return Math.round((monto / precioUnitario) * 1000) / 1000;
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}{required && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #f3f4f6", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
      <div style={{ padding: "14px 20px 12px", borderBottom: "1.5px solid #f3f4f6", background: "#fafafa" }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#374151" }}>{title}</p>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

export default function NuevoPedidoPage() {
  const [clientes,            setClientes]            = useState<Cliente[]>([]);
  const [productos,           setProductos]           = useState<Producto[]>([]);
  const [filteredClientes,    setFilteredClientes]    = useState<Cliente[]>([]);
  const [searchTerm,          setSearchTerm]          = useState("");
  const [selectedCliente,     setSelectedCliente]     = useState<Cliente | undefined>();
  const [showDropdown,        setShowDropdown]        = useState(false);
  const [fecha,               setFecha]               = useState(() => new Date().toISOString().split("T")[0]);
  const [tipoPedido,          setTipoPedido]          = useState<TipoPedido>("llevar");
  const [metodoPago,          setMetodoPago]          = useState<MetodoPago>("efectivo");
  const [express,             setExpress]             = useState(false);
  const [nombreClienteManual, setNombreClienteManual] = useState("");
  const [mesa,                setMesa]                = useState("");
  const [notas,               setNotas]               = useState("");
  const [items,               setItems]               = useState<PedidoItem[]>([newItem()]);
  const [loading,             setLoading]             = useState(false);
  const [savedOrder,          setSavedOrder]          = useState<any>(null);
  const [printing,            setPrinting]            = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const expressCliente = clientes.find(c =>
    `${c.nombre} ${c.apellidos}`.trim().toLowerCase() === CLIENTE_EXPRESS_NOMBRE.toLowerCase()
  );

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Cliente[]));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "productos"), where("activo", "==", true), orderBy("nombre", "asc"));
    return onSnapshot(q, snap => setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Producto[]));
  }, []);

  useEffect(() => {
    if (express && tipoPedido === "envio") { setExpress(false); setNombreClienteManual(""); }
  }, [express, tipoPedido]);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const term = searchTerm.toLowerCase();
      setFilteredClientes(clientes.filter(c =>
        `${c.nombre} ${c.apellidos}`.toLowerCase().includes(term) ||
        c.telefono.replace(/\s/g, "").includes(term.replace(/\s/g, ""))
      ));
      if (!express) setShowDropdown(true);
    } else { setFilteredClientes([]); setShowDropdown(false); }
  }, [searchTerm, clientes, express]);

  const selectCliente = (c: Cliente) => {
    setSelectedCliente(c); setSearchTerm(`${c.nombre} ${c.apellidos}`); setShowDropdown(false);
  };
  const handleTipo = (v: TipoPedido) => {
    setTipoPedido(v);
    if (v !== "mesa") setMesa("");
    if (v === "envio") { setExpress(false); setNombreClienteManual(""); }
  };
  const handleExpress = (checked: boolean) => {
    if (tipoPedido === "envio") return;
    setExpress(checked);
    if (checked) { setSelectedCliente(undefined); setSearchTerm(""); setShowDropdown(false); }
    else setNombreClienteManual("");
  };

  const selectProducto = (itemId: string, productoId: string) => {
    const p = productos.find(p => p.id === productoId);
    if (!p) return;
    setItems(prev => prev.map(item => item.id !== itemId ? item : {
      ...item, productoId, concepto: p.nombre, precioUnitario: p.precio,
      total: item.inputMode === "money"
        ? parseFloat(item.montoRaw) || 0
        : item.cantidad * p.precio,
      cantidad: item.inputMode === "money"
        ? moneyToQty(parseFloat(item.montoRaw) || 0, p.precio)
        : item.cantidad,
    }));
  };

  const clearProducto = (itemId: string) => {
    setItems(prev => prev.map(item => item.id !== itemId ? item : {
      ...item, productoId: undefined, precioUnitario: 0,
      total: 0, cantidad: 1, inputMode: "qty", montoRaw: "",
    }));
  };

  const toggleInputMode = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId || !item.productoId) return item;
      if (item.inputMode === "qty") {
        return { ...item, inputMode: "money", montoRaw: item.total > 0 ? String(item.total) : "" };
      }
      return { ...item, inputMode: "qty", montoRaw: "" };
    }));
  };

  const handleMontoChange = (itemId: string, raw: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const monto = parseFloat(raw) || 0;
      return { ...item, montoRaw: raw, cantidad: moneyToQty(monto, item.precioUnitario), total: monto };
    }));
  };

  const handleQtyChange = (itemId: string, val: number) => {
    setItems(prev => prev.map(item => item.id !== itemId ? item : { ...item, cantidad: val, total: val * item.precioUnitario }));
  };

  const handleConceptoChange = (itemId: string, val: string) => {
    setItems(prev => prev.map(item => item.id !== itemId ? item : { ...item, concepto: val }));
  };

  const handlePrecioChange = (itemId: string, val: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      if (item.inputMode === "money") {
        const monto = parseFloat(item.montoRaw) || 0;
        return { ...item, precioUnitario: val, cantidad: moneyToQty(monto, val), total: monto };
      }
      return { ...item, precioUnitario: val, total: item.cantidad * val };
    }));
  };

  const totalGeneral = items.reduce((s, i) => s + (i.total || 0), 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (tipoPedido === "envio") {
      if (!selectedCliente) return alert("Selecciona un cliente para pedidos de envío");
      if (!selectedCliente.direccion?.calle) return alert("El cliente debe tener dirección para pedidos de envío");
    }
    if (express) {
      if (!expressCliente) return alert('No existe el cliente "Cliente Express" en la base de datos');
      if (!nombreClienteManual.trim()) return alert("Escribe el nombre del cliente para pedido express");
    }
    if (tipoPedido === "mesa" && !mesa.trim()) return alert("Captura el número o nombre de mesa");
    if (items.some(i => !i.concepto.trim())) return alert("Completa todos los conceptos");
    if (items.some(i => i.total <= 0)) return alert("Todos los productos deben tener un precio mayor a $0");

    const clienteFinal = express && expressCliente ? expressCliente : selectedCliente;
    setLoading(true);
    try {
      const pedidoData: any = {
        clienteId: clienteFinal?.id ?? "",
        clienteNombre: clienteFinal ? `${clienteFinal.nombre} ${clienteFinal.apellidos}`.trim() : "",
        clienteTelefono: clienteFinal?.telefono ?? "",
        tipoPedido, metodoPago, express,
        fecha: Timestamp.fromDate(new Date(fecha)),
        notas,
        items: items.map(({ cantidad, concepto, precioUnitario, total }) => ({ cantidad, concepto, precioUnitario, total })),
        totalGeneral, status: "pendiente", createdAt: Timestamp.now(),
      };
      if (tipoPedido === "envio" && selectedCliente?.direccion) pedidoData.direccionEntrega = selectedCliente.direccion;
      if (tipoPedido === "mesa" && mesa.trim()) pedidoData.mesa = mesa.trim();
      if (express && nombreClienteManual.trim()) pedidoData.nombreClienteManual = nombreClienteManual.trim();

      await addDoc(collection(db, "pedidos"), pedidoData);
      setSavedOrder({
        clienteNombre: pedidoData.clienteNombre, clienteTelefono: pedidoData.clienteTelefono,
        direccionEntrega: tipoPedido === "envio" && selectedCliente?.direccion ? selectedCliente.direccion : undefined,
        createdAt: new Date(), tipoPedido: pedidoData.tipoPedido, metodoPago: pedidoData.metodoPago,
        notas: pedidoData.notas, items: pedidoData.items, totalGeneral: pedidoData.totalGeneral,
      });
    } catch (err) { console.error(err); alert("Error al guardar el pedido"); }
    finally { setLoading(false); }
  };

  const handlePrint = async () => {
    if (!savedOrder) return;
    setPrinting(true);
    try { await printOrderTicket(savedOrder); }
    catch { alert("No se pudo imprimir el ticket"); }
    finally { setPrinting(false); }
  };

  const dir = selectedCliente?.direccion;
  const hasAddress       = !!dir?.calle;
  const showClienteSearch = !express || tipoPedido === "envio";
  const showDireccion     = tipoPedido === "envio" && !!selectedCliente;
  const showMesa          = tipoPedido === "mesa";
  const showNombreManual  = express && tipoPedido !== "envio";

  if (savedOrder) {
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: "0 24px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <CheckCircle size={32} style={{ color: "#16a34a" }} />
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#111827" }}>¡Pedido guardado!</h2>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: "#9ca3af" }}>
          {savedOrder.clienteNombre || "Pedido express"} — {fmtMoney(savedOrder.totalGeneral)}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={handlePrint} disabled={printing}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: printing ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)" }}>
            <Printer size={14} /> {printing ? "Imprimiendo..." : "Imprimir ticket"}
          </button>
          <Link href="/dashboard/pedidos"
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", border: "none", borderRadius: 9, background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none" }}>
            Ver pedidos
          </Link>
        </div>
        <button
          onClick={() => { setSavedOrder(null); setItems([newItem()]); setSearchTerm(""); setSelectedCliente(undefined); setMesa(""); setNotas(""); }}
          style={{ marginTop: 14, color: "#dc2626", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          + Crear otro pedido
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13, color: "#9ca3af" }}>
        <Link href="/dashboard/pedidos" style={{ display: "flex", alignItems: "center", gap: 4, color: "#6b7280", textDecoration: "none", fontWeight: 500 }}>
          <ArrowLeft size={14} /> Pedidos
        </Link>
        <span>/</span>
        <span style={{ color: "#111827", fontWeight: 600 }}>Nuevo Pedido</span>
      </div>

      <h1 style={{ margin: "0 0 24px", fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
        Nuevo Pedido
      </h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Configuración ── */}
        <SectionCard title="Configuración del pedido">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
            <div>
              <Label>Tipo de pedido</Label>
              <div style={{ position: "relative" }}>
                <select value={tipoPedido} onChange={e => handleTipo(e.target.value as TipoPedido)} className="field" style={{ paddingRight: 32 }}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }} />
              </div>
            </div>
            <div>
              <Label>Método de pago</Label>
              <div style={{ position: "relative" }}>
                <select value={metodoPago} onChange={e => setMetodoPago(e.target.value as MetodoPago)} className="field" style={{ paddingRight: 32 }}>
                  {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }} />
              </div>
            </div>
            <div>
              <Label>Fecha</Label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="field" />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "1.5px solid", borderColor: express ? "#fde68a" : "#e5e7eb", borderRadius: 8, cursor: tipoPedido === "envio" ? "not-allowed" : "pointer", background: express ? "#fefce8" : "#fff", opacity: tipoPedido === "envio" ? .5 : 1, width: "100%" }}>
                <input type="checkbox" checked={express} onChange={e => handleExpress(e.target.checked)} disabled={tipoPedido === "envio"} style={{ accentColor: "#dc2626", width: 14, height: 14 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: express ? "#a16207" : "#6b7280" }}>Pedido express</span>
              </label>
            </div>
          </div>

          <div style={{ borderTop: "1.5px solid #f3f4f6", paddingTop: 18 }}>
            <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#374151" }}>Cliente y entrega</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {showClienteSearch && (
                <div style={{ position: "relative" }} ref={dropdownRef}>
                  <Label required={tipoPedido === "envio"}>Buscar cliente</Label>
                  <div style={{ position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                    <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setSelectedCliente(undefined); }} placeholder="Nombre o teléfono..." className="field" style={{ paddingLeft: 32 }} />
                  </div>
                  {showDropdown && filteredClientes.length > 0 && (
                    <div style={{ position: "absolute", zIndex: 10, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.1)", maxHeight: 200, overflowY: "auto" }}>
                      {filteredClientes.map(c => (
                        <button key={c.id} type="button" onClick={() => selectCliente(c)}
                          style={{ width: "100%", padding: "9px 12px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #f9fafb", fontFamily: "var(--font-sans)" }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fef2f2", color: "#dc2626", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {`${c.nombre?.[0] ?? ""}${c.apellidos?.[0] ?? ""}`.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: "#111827" }}>{c.nombre} {c.apellidos}</span>
                          <span style={{ color: "#9ca3af", fontSize: 12 }}>{c.telefono}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && searchTerm && filteredClientes.length === 0 && (
                    <div style={{ position: "absolute", zIndex: 10, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.1)", padding: "12px 14px", fontSize: 13, color: "#6b7280" }}>
                      No se encontró el cliente.{" "}
                      <Link href="/dashboard/clientes" style={{ color: "#dc2626", fontWeight: 600, textDecoration: "none" }}>Registrarlo</Link>
                    </div>
                  )}
                </div>
              )}
              {showMesa && (
                <div>
                  <Label required>Mesa</Label>
                  <input type="text" value={mesa} onChange={e => setMesa(e.target.value)} placeholder="Ej: 4, Terraza, Barra..." className="field" />
                </div>
              )}
              {showNombreManual && (
                <div>
                  <Label required>Nombre del cliente</Label>
                  <input type="text" value={nombreClienteManual} onChange={e => setNombreClienteManual(e.target.value)} placeholder="Ej: Juan, Sra. López..." className="field" />
                </div>
              )}
            </div>

            {showDireccion && (
              <div style={{ marginTop: 14, padding: "12px 14px", background: hasAddress ? "#fefce8" : "#fef2f2", border: `1.5px solid ${hasAddress ? "#fde68a" : "#fecaca"}`, borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13 }}>
                <MapPin size={15} style={{ color: hasAddress ? "#ca8a04" : "#dc2626", flexShrink: 0, marginTop: 1 }} />
                {hasAddress && dir ? (
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: "#374151" }}>Dirección de entrega</p>
                    <p style={{ margin: "3px 0 0", color: "#6b7280", lineHeight: 1.5 }}>{dir.calle} {dir.noExt}{dir.noInt ? ` Int. ${dir.noInt}` : ""}, Col. {dir.colonia}, {dir.ciudad}</p>
                    {dir.referencias && <p style={{ margin: "3px 0 0", color: "#9ca3af", fontStyle: "italic" }}>Ref: {dir.referencias}</p>}
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: "#b91c1c" }}>Sin dirección registrada</p>
                    <p style={{ margin: "3px 0 0", color: "#dc2626" }}><Link href="/dashboard/clientes" style={{ color: "#dc2626", textDecoration: "underline" }}>Editar cliente</Link> para agregar domicilio.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <Label>Notas (opcional)</Label>
            <input type="text" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej: Sin chile, tortillas de más..." className="field" />
          </div>
        </SectionCard>

        {/* ── Productos ── */}
        <SectionCard title="Productos">

          {/* Hint conversión */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 16, padding: "9px 13px", background: "#fefce8", border: "1.5px solid #fde68a", borderRadius: 9, fontSize: 12, color: "#a16207" }}>
            <ArrowLeftRight size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Al seleccionar un producto del catálogo, presiona el botón <strong>⇄</strong> para cambiar a{" "}
              <strong>modo pesos</strong>: escribe cuánto dinero quieres y se calcula la cantidad automáticamente.
            </span>
          </div>

          {/* Headers */}
          <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 195px 130px 90px 80px 32px", gap: 8, marginBottom: 8, padding: "0 6px" }}>
            {["Cant.", "Concepto", "Catálogo", "Entrada ($  o  cant.)", "P/unidad", "Total", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map(item => {
              const hasCatalog  = !!item.productoId;
              const isMoneyMode = hasCatalog && item.inputMode === "money";
              const producto    = productos.find(p => p.id === item.productoId);
              const qtyDisplay  = item.cantidad % 1 === 0
                ? String(item.cantidad)
                : item.cantidad.toFixed(3).replace(/\.?0+$/, "");

              return (
                <div key={item.id} style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr 195px 130px 90px 80px 32px",
                  gap: 8, alignItems: "center",
                  padding: "10px 10px",
                  background: hasCatalog ? "#fafafa" : "#fff",
                  border: `1.5px solid ${hasCatalog ? "#f0f0f0" : "transparent"}`,
                  borderRadius: 10,
                }}>

                  {/* Cantidad — read-only en modo dinero */}
                  <div style={{ position: "relative" }}>
                    <input
                      type="number" min="0.001" step="0.001"
                      value={isMoneyMode ? item.cantidad : item.cantidad}
                      onChange={e => !isMoneyMode && handleQtyChange(item.id, parseFloat(e.target.value) || 0)}
                      readOnly={isMoneyMode}
                      className="field"
                      style={{
                        textAlign: "center", padding: "8px 3px", fontSize: 13,
                        background: isMoneyMode ? "#f3f4f6" : "#fff",
                        color: isMoneyMode ? "#9ca3af" : "#111827",
                        cursor: isMoneyMode ? "default" : "text",
                      }}
                      title={isMoneyMode ? `${qtyDisplay} ${producto?.unidad ?? ""} (calculado)` : "Cantidad"}
                    />
                    {isMoneyMode && (
                      <div style={{
                        position: "absolute", inset: 0, display: "flex",
                        flexDirection: "column", alignItems: "center", justifyContent: "center",
                        pointerEvents: "none",
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#374151", lineHeight: 1 }}>{qtyDisplay}</span>
                        <span style={{ fontSize: 9, color: "#9ca3af", marginTop: 1 }}>{producto?.unidad ?? ""}</span>
                      </div>
                    )}
                  </div>

                  {/* Concepto */}
                  <input
                    type="text" value={item.concepto}
                    onChange={e => handleConceptoChange(item.id, e.target.value)}
                    placeholder="Concepto..."
                    className="field" style={{ fontSize: 13 }}
                  />

                  {/* Catálogo select */}
                  <div style={{ position: "relative" }}>
                    <select
                      value={item.productoId ?? ""}
                      onChange={e => e.target.value ? selectProducto(item.id, e.target.value) : clearProducto(item.id)}
                      className="field" style={{ paddingRight: 26, fontSize: 12 }}
                    >
                      <option value="">— manual —</option>
                      {productos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} • {fmtMoney(p.precio)}/{p.unidad}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }} />
                  </div>

                  {/* Entrada: toggle + input */}
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {hasCatalog ? (
                      <>
                        {/* Toggle button */}
                        <button
                          type="button"
                          onClick={() => toggleInputMode(item.id)}
                          title={isMoneyMode ? "Cambiar a modo cantidad" : "Ingresar monto en pesos"}
                          style={{
                            flexShrink: 0, width: 30, height: 34,
                            border: "1.5px solid",
                            borderColor: isMoneyMode ? "#dc2626" : "#d1d5db",
                            borderRadius: 7,
                            background: isMoneyMode ? "#dc2626" : "#fff",
                            color: isMoneyMode ? "#fff" : "#6b7280",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800,
                            fontFamily: "var(--font-sans)",
                            transition: "all .15s",
                          }}
                        >
                          {isMoneyMode ? "$" : "⇄"}
                        </button>

                        {isMoneyMode ? (
                          /* Monto en pesos */
                          <input
                            type="number" min="0" step="0.50"
                            value={item.montoRaw}
                            onChange={e => handleMontoChange(item.id, e.target.value)}
                            placeholder="$0.00"
                            className="field"
                            style={{ textAlign: "right", fontSize: 13, flex: 1 }}
                            autoFocus
                          />
                        ) : (
                          /* Hint modo cantidad */
                          <span style={{ fontSize: 11, color: "#d1d5db", fontStyle: "italic", flex: 1 }}>
                            modo cantidad
                          </span>
                        )}
                      </>
                    ) : (
                      /* Sin catálogo: precio unitario manual */
                      <input
                        type="number" min="0" step="0.50"
                        value={item.precioUnitario || ""}
                        onChange={e => handlePrecioChange(item.id, parseFloat(e.target.value) || 0)}
                        className="field" style={{ textAlign: "right", fontSize: 13 }}
                        placeholder="P/U"
                      />
                    )}
                  </div>

                  {/* Precio unitario */}
                  <div style={{ textAlign: "right" }}>
                    {hasCatalog ? (
                      <>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block" }}>
                          {fmtMoney(item.precioUnitario)}
                        </span>
                        <span style={{ fontSize: 9, color: "#9ca3af" }}>/{producto?.unidad ?? "u"}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>
                    )}
                  </div>

                  {/* Total */}
                  <span style={{
                    fontSize: 13, fontWeight: 800, textAlign: "right",
                    color: item.total > 0 ? "#111827" : "#d1d5db",
                  }}>
                    {item.total > 0 ? fmtMoney(item.total) : "—"}
                  </span>

                  {/* Eliminar */}
                  <button type="button"
                    onClick={() => { if (items.length > 1) setItems(prev => prev.filter(i => i.id !== item.id)); }}
                    disabled={items.length === 1}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", background: "none", cursor: items.length === 1 ? "not-allowed" : "pointer", color: "#d1d5db", borderRadius: 6 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1.5px solid #f3f4f6" }}>
            <button type="button" onClick={() => setItems(prev => [...prev, newItem()])}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              <Plus size={13} /> Agregar fila
            </button>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Total:</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                {fmtMoney(totalGeneral)}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* ── Acciones ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingBottom: 16 }}>
          <Link href="/dashboard/pedidos"
            style={{ padding: "10px 20px", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", textDecoration: "none" }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 24px", border: "none", borderRadius: 9, background: loading ? "#fca5a5" : "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)" }}>
            {loading ? "Guardando..." : "Guardar Pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
