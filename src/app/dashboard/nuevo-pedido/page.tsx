// src/app/dashboard/nuevo-pedido/page.tsx
"use client";

import { v4 as uuidv4 } from "uuid";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addDoc, collection, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { ArrowLeft, ArrowLeftRight, ChevronDown, MapPin, Plus, Printer, Search, Trash2 } from "lucide-react";

import { db } from "@/lib/firebase";
import { buildPrintJobDocument } from "@/lib/printer/printjobs";
import { mapPedidoToTicket, type PedidoForPrint } from "@/lib/printer/order-print-mapper";
import type { Producto } from "@/types";

interface DireccionCliente {
  calle: string;
  noExt: string;
  noInt?: string;
  colonia: string;
  ciudad: string;
  estado?: string;
  cp?: string;
  referencias: string;
}

interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  direccion?: DireccionCliente;
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

// Cambia esta IP si cambia la IP local de tu ESP32.
const ESP32_WAKE_URL = "http://192.168.100.103/wake";

const TIPOS: { value: TipoPedido; label: string }[] = [
  { value: "llevar", label: "Para llevar" },
  { value: "recoger", label: "Para recoger" },
  { value: "envio", label: "Envío a domicilio" },
  { value: "mesa", label: "Mesa" },
];

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "pendiente", label: "Pendiente" },
  { value: "otro", label: "Otro" },
];

const newItem = (): PedidoItem => ({
  id: uuidv4(),
  cantidad: 1,
  concepto: "",
  precioUnitario: 0,
  total: 0,
  inputMode: "qty",
  montoRaw: "",
});

const fmtMoney = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const moneyToQty = (monto: number, precioUnitario: number): number => {
  if (!precioUnitario) return 0;
  return Math.round((monto / precioUnitario) * 1000) / 1000;
};

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: "#6b7280",
        marginBottom: 5,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
      {required && <span style={{ color: "#2563eb" }}> *</span>}
    </label>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #f3f4f6",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,.04)",
      }}
    >
      <div
        style={{
          padding: "14px 20px 12px",
          borderBottom: "1.5px solid #f3f4f6",
          background: "#fafafa",
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#374151" }}>
          {title}
        </p>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

export default function NuevoPedidoPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | undefined>();
  const [showDropdown, setShowDropdown] = useState(false);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [tipoPedido, setTipoPedido] = useState<TipoPedido>("llevar");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [express, setExpress] = useState(false);
  const [nombreClienteManual, setNombreClienteManual] = useState("");
  const [mesa, setMesa] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<PedidoItem[]>([newItem()]);
  const [loading, setLoading] = useState(false);
  const [savedOrder, setSavedOrder] = useState<PedidoForPrint | null>(null);
  const [printing, setPrinting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const expressCliente = clientes.find(
    (c) =>
      `${c.nombre} ${c.apellidos}`.trim().toLowerCase() ===
      CLIENTE_EXPRESS_NOMBRE.toLowerCase()
  );

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) =>
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Cliente[])
    );
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "productos"),
      where("activo", "==", true),
      orderBy("nombre", "asc")
    );
    return onSnapshot(q, (snap) =>
      setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Producto[])
    );
  }, []);

  useEffect(() => {
    if (express && tipoPedido === "envio") {
      setExpress(false);
      setNombreClienteManual("");
    }
  }, [express, tipoPedido]);

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

      if (!express) setShowDropdown(true);
    } else {
      setFilteredClientes([]);
      setShowDropdown(false);
    }
  }, [searchTerm, clientes, express]);

  const selectCliente = (c: Cliente) => {
    setSelectedCliente(c);
    setSearchTerm(`${c.nombre} ${c.apellidos}`);
    setShowDropdown(false);
  };

  const handleTipo = (v: TipoPedido) => {
    setTipoPedido(v);
    if (v !== "mesa") setMesa("");
    if (v === "envio") {
      setExpress(false);
      setNombreClienteManual("");
    }
  };

  const handleExpress = (checked: boolean) => {
    if (tipoPedido === "envio") return;

    setExpress(checked);

    if (checked) {
      setSelectedCliente(undefined);
      setSearchTerm("");
      setShowDropdown(false);
    } else {
      setNombreClienteManual("");
    }
  };

  const selectProducto = (itemId: string, productoId: string) => {
    const p = productos.find((producto) => producto.id === productoId);
    if (!p) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              productoId,
              concepto: p.nombre,
              precioUnitario: p.precio,
              total:
                item.inputMode === "money"
                  ? parseFloat(item.montoRaw) || 0
                  : item.cantidad * p.precio,
              cantidad:
                item.inputMode === "money"
                  ? moneyToQty(parseFloat(item.montoRaw) || 0, p.precio)
                  : item.cantidad,
            }
      )
    );
  };

  const clearProducto = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              productoId: undefined,
              precioUnitario: 0,
              total: 0,
              cantidad: 1,
              inputMode: "qty",
              montoRaw: "",
            }
      )
    );
  };

  const toggleInputMode = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId || !item.productoId) return item;

        if (item.inputMode === "qty") {
          return {
            ...item,
            inputMode: "money",
            montoRaw: item.total > 0 ? String(item.total) : "",
          };
        }

        return { ...item, inputMode: "qty", montoRaw: "" };
      })
    );
  };

  const handleMontoChange = (itemId: string, raw: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const monto = parseFloat(raw) || 0;
        return {
          ...item,
          montoRaw: raw,
          cantidad: moneyToQty(monto, item.precioUnitario),
          total: monto,
        };
      })
    );
  };

  const handleQtyChange = (itemId: string, val: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id !== itemId
          ? item
          : { ...item, cantidad: val, total: val * item.precioUnitario }
      )
    );
  };

  const handleConceptoChange = (itemId: string, val: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id !== itemId ? item : { ...item, concepto: val }))
    );
  };

  const handlePrecioChange = (itemId: string, val: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        if (item.inputMode === "money") {
          const monto = parseFloat(item.montoRaw) || 0;
          return {
            ...item,
            precioUnitario: val,
            cantidad: moneyToQty(monto, val),
            total: monto,
          };
        }

        return { ...item, precioUnitario: val, total: item.cantidad * val };
      })
    );
  };

  const totalGeneral = items.reduce((s, i) => s + (i.total || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tipoPedido === "envio") {
      if (!selectedCliente) return alert("Selecciona un cliente para pedidos de envío");
      if (!selectedCliente.direccion?.calle) {
        return alert("El cliente debe tener dirección para pedidos de envío");
      }
    }

    if (express) {
      if (!expressCliente) {
        return alert('No existe el cliente "Cliente Express" en la base de datos');
      }
      if (!nombreClienteManual.trim()) {
        return alert("Escribe el nombre del cliente para pedido express");
      }
    }

    if (tipoPedido === "mesa" && !mesa.trim()) {
      return alert("Captura el número o nombre de mesa");
    }

    if (items.some((i) => !i.concepto.trim())) {
      return alert("Completa todos los conceptos");
    }

    if (items.some((i) => i.total <= 0)) {
      return alert("Todos los productos deben tener un precio mayor a $0");
    }

    const clienteFinal = express && expressCliente ? expressCliente : selectedCliente;

    setLoading(true);

    try {
      const pedidoData: any = {
        clienteId: clienteFinal?.id ?? "",
        clienteNombre: clienteFinal
          ? `${clienteFinal.nombre} ${clienteFinal.apellidos}`.trim()
          : "",
        clienteTelefono: clienteFinal?.telefono ?? "",
        tipoPedido,
        metodoPago,
        express,
        fecha: Timestamp.fromDate(new Date(fecha)),
        notas,
        items: items.map(({ cantidad, concepto, precioUnitario, total }) => ({
          cantidad,
          concepto,
          precioUnitario,
          total,
        })),
        totalGeneral,
        status: "pendiente",
        createdAt: Timestamp.now(),
      };

      if (tipoPedido === "envio" && selectedCliente?.direccion) {
        pedidoData.direccionEntrega = selectedCliente.direccion;
      }

      if (tipoPedido === "mesa" && mesa.trim()) {
        pedidoData.mesa = mesa.trim();
      }

      if (express && nombreClienteManual.trim()) {
        pedidoData.nombreClienteManual = nombreClienteManual.trim();
      }

      const pedidoRef = await addDoc(collection(db, "pedidos"), pedidoData);

      setSavedOrder(
        mapPedidoToTicket({
          pedidoId: pedidoRef.id,
          pedidoData,
        })
      );
    } catch (err) {
      console.error(err);
      alert("Error al guardar el pedido");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!savedOrder?.pedidoId) return;

    setPrinting(true);

    // Se abre inmediatamente por el click del usuario para que Safari/iOS no lo trate como popup automático.
    const printWindow = window.open("about:blank", "_blank");

    try {
      const printJob = buildPrintJobDocument({
        pedidoId: savedOrder.pedidoId,
        order: savedOrder,
      });

      const docRef = await addDoc(collection(db, "printjobs"), printJob);
      const wakeUrl = `${ESP32_WAKE_URL}?jobId=${encodeURIComponent(docRef.id)}`;

      if (printWindow) {
        printWindow.location.href = wakeUrl;
      } else {
        window.location.href = wakeUrl;
      }

      alert("Ticket enviado a impresión");
    } catch (err) {
      console.error(err);

      if (printWindow) {
        printWindow.close();
      }

      alert("No se pudo enviar el ticket a impresión");
    } finally {
      setPrinting(false);
    }
  };

  const dir = selectedCliente?.direccion;
  const hasAddress = !!dir?.calle;
  const showClienteSearch = !express || tipoPedido === "envio";
  const showDireccion = tipoPedido === "envio" && !!selectedCliente;
  const showMesa = tipoPedido === "mesa";
  const showNombreManual = express && tipoPedido !== "envio";

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13, color: "#9ca3af" }}>
        <Link
          href="/dashboard/pedidos"
          style={{ display: "flex", alignItems: "center", gap: 4, color: "#6b7280", textDecoration: "none", fontWeight: 500 }}
        >
          <ArrowLeft size={14} /> Pedidos
        </Link>
        <span>/</span>
        <span style={{ color: "#111827", fontWeight: 600 }}>Nuevo Pedido</span>
      </div>

      <h1 style={{ margin: "0 0 24px", fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
        Nuevo Pedido
      </h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionCard title="Configuración">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <Label required>Tipo de pedido</Label>
              <div style={{ position: "relative" }}>
                <select
                  value={tipoPedido}
                  onChange={(e) => handleTipo(e.target.value as TipoPedido)}
                  className="field"
                  style={{ paddingRight: 32 }}
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: 10, top: 11, color: "#9ca3af", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <Label required>Método de pago</Label>
              <div style={{ position: "relative" }}>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                  className="field"
                  style={{ paddingRight: 32 }}
                >
                  {METODOS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: 10, top: 11, color: "#9ca3af", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <Label required>Fecha</Label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="field"
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 23, fontSize: 13, color: tipoPedido === "envio" ? "#9ca3af" : "#374151", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={express}
                onChange={(e) => handleExpress(e.target.checked)}
                disabled={tipoPedido === "envio"}
                style={{ accentColor: "#2563eb", width: 14, height: 14 }}
              />
              Pedido express
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Cliente y entrega">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {showClienteSearch && (
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <Label required={tipoPedido === "envio"}>Buscar cliente</Label>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "#9ca3af" }} />
                  <input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedCliente(undefined);
                    }}
                    placeholder="Nombre o teléfono..."
                    className="field"
                    style={{ paddingLeft: 32 }}
                  />
                </div>

                {showDropdown && filteredClientes.length > 0 && (
                  <div style={{ position: "absolute", zIndex: 10, top: 62, left: 0, right: 0, background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.08)", overflow: "hidden" }}>
                    {filteredClientes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCliente(c)}
                        style={{ width: "100%", padding: "9px 12px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #f9fafb", fontFamily: "var(--font-sans)" }}
                      >
                        <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                          {`${c.nombre?.[0] ?? ""}${c.apellidos?.[0] ?? ""}`.toUpperCase()}
                        </span>
                        <span>
                          <strong>{c.nombre} {c.apellidos}</strong>
                          <br />
                          <span style={{ color: "#9ca3af" }}>{c.telefono}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && searchTerm && filteredClientes.length === 0 && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
                    No se encontró el cliente. <Link href="/dashboard/clientes/nuevo">Registrarlo</Link>
                  </p>
                )}
              </div>
            )}

            {showMesa && (
              <div>
                <Label required>Mesa</Label>
                <input
                  value={mesa}
                  onChange={(e) => setMesa(e.target.value)}
                  placeholder="Ej: 4, Terraza, Barra..."
                  className="field"
                />
              </div>
            )}

            {showNombreManual && (
              <div>
                <Label required>Nombre del cliente</Label>
                <input
                  value={nombreClienteManual}
                  onChange={(e) => setNombreClienteManual(e.target.value)}
                  placeholder="Ej: Juan, Sra. López..."
                  className="field"
                />
              </div>
            )}

            {showDireccion && (
              <div>
                {hasAddress && dir ? (
                  <div style={{ display: "flex", gap: 10, padding: 12, border: "1.5px solid #e0f2fe", borderRadius: 10, background: "#f0f9ff" }}>
                    <MapPin size={17} style={{ color: "#0284c7", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: "#075985" }}>Dirección de entrega</p>
                      <p style={{ margin: 0, fontSize: 13, color: "#0369a1", lineHeight: 1.45 }}>
                        {dir.calle} {dir.noExt}{dir.noInt ? ` Int. ${dir.noInt}` : ""}, Col. {dir.colonia}, {dir.ciudad}
                      </p>
                      {dir.referencias && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#0284c7" }}>Ref: {dir.referencias}</p>}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 12, border: "1.5px solid #fee2e2", borderRadius: 10, background: "#fef2f2", fontSize: 13, color: "#991b1b" }}>
                    <strong>Sin dirección registrada</strong>
                    <br />
                    Editar cliente para agregar domicilio.
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Notas (opcional)</Label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Sin chile, tortillas de más..."
                className="field"
                rows={3}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Productos">
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, lineHeight: 1.5 }}>
            Al seleccionar un producto del catálogo, presiona el botón <strong>⇄</strong> para cambiar a modo pesos: escribe cuánto dinero quieres y se calcula la cantidad automáticamente.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "72px 1.2fr 1.2fr 1fr 92px 92px 36px", gap: 8, alignItems: "center", fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 8 }}>
            {["Cant.", "Concepto", "Catálogo", "Entrada ($ o cant.)", "P/unidad", "Total", ""].map((h) => (
              <div key={h}>{h}</div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item) => {
              const hasCatalog = !!item.productoId;
              const isMoneyMode = hasCatalog && item.inputMode === "money";
              const producto = productos.find((p) => p.id === item.productoId);
              const qtyDisplay = item.cantidad % 1 === 0
                ? String(item.cantidad)
                : item.cantidad.toFixed(3).replace(/\.?0+$/, "");

              return (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "72px 1.2fr 1.2fr 1fr 92px 92px 36px", gap: 8, alignItems: "center" }}>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={isMoneyMode ? qtyDisplay : item.cantidad}
                      onChange={(e) => !isMoneyMode && handleQtyChange(item.id, parseFloat(e.target.value) || 0)}
                      readOnly={isMoneyMode}
                      className="field"
                      style={{ textAlign: "center", padding: "8px 3px", fontSize: 13, background: isMoneyMode ? "#f3f4f6" : "#fff", color: isMoneyMode ? "#9ca3af" : "#111827", cursor: isMoneyMode ? "default" : "text" }}
                      title={isMoneyMode ? `${qtyDisplay} ${producto?.unidad ?? ""} (calculado)` : "Cantidad"}
                    />
                  </div>

                  <input
                    value={item.concepto}
                    onChange={(e) => handleConceptoChange(item.id, e.target.value)}
                    placeholder="Concepto..."
                    className="field"
                    style={{ fontSize: 13 }}
                  />

                  <select
                    value={item.productoId ?? ""}
                    onChange={(e) => e.target.value ? selectProducto(item.id, e.target.value) : clearProducto(item.id)}
                    className="field"
                    style={{ paddingRight: 26, fontSize: 12 }}
                  >
                    <option value="">— manual —</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} • {fmtMoney(p.precio)}/{p.unidad}
                      </option>
                    ))}
                  </select>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {hasCatalog ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleInputMode(item.id)}
                          title={isMoneyMode ? "Cambiar a modo cantidad" : "Ingresar monto en pesos"}
                          style={{ flexShrink: 0, width: 30, height: 34, border: "1.5px solid", borderColor: isMoneyMode ? "#2563eb" : "#d1d5db", borderRadius: 7, background: isMoneyMode ? "#2563eb" : "#fff", color: isMoneyMode ? "#fff" : "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, fontFamily: "var(--font-sans)", transition: "all .15s" }}
                        >
                          {isMoneyMode ? "$" : <ArrowLeftRight size={14} />}
                        </button>

                        {isMoneyMode ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.montoRaw}
                            onChange={(e) => handleMontoChange(item.id, e.target.value)}
                            placeholder="$0.00"
                            className="field"
                            style={{ textAlign: "right", fontSize: 13, flex: 1 }}
                            autoFocus
                          />
                        ) : (
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>modo cantidad</span>
                        )}
                      </>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precioUnitario || ""}
                        onChange={(e) => handlePrecioChange(item.id, parseFloat(e.target.value) || 0)}
                        className="field"
                        style={{ textAlign: "right", fontSize: 13 }}
                        placeholder="P/U"
                      />
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {hasCatalog ? (
                      <>
                        {fmtMoney(item.precioUnitario)}
                        <br />
                        <span style={{ color: "#9ca3af" }}>/{producto?.unidad ?? "u"}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right", color: item.total > 0 ? "#111827" : "#d1d5db" }}>
                    {item.total > 0 ? fmtMoney(item.total) : "—"}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (items.length > 1) {
                        setItems((prev) => prev.filter((i) => i.id !== item.id));
                      }
                    }}
                    disabled={items.length === 1}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", background: "none", cursor: items.length === 1 ? "not-allowed" : "pointer", color: "#d1d5db", borderRadius: 6 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 14, borderTop: "1.5px solid #f3f4f6" }}>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, newItem()])}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              <Plus size={14} /> Agregar fila
            </button>

            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>
              Total: {fmtMoney(totalGeneral)}
            </div>
          </div>
        </SectionCard>

        {savedOrder && (
          <div style={{ padding: "12px 14px", border: "1.5px solid #bbf7d0", borderRadius: 10, background: "#f0fdf4", color: "#166534", fontSize: 13, fontWeight: 600 }}>
            Pedido guardado: {savedOrder.clienteNombre || "Pedido express"} — {fmtMoney(savedOrder.totalGeneral)}. Ya puedes imprimir el ticket.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link
            href="/dashboard/pedidos"
            style={{ padding: "11px 20px", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "#fff", color: "#6b7280", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
          >
            Cancelar
          </Link>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!savedOrder || printing}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 20px", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "#fff", color: savedOrder ? "#374151" : "#9ca3af", fontSize: 13, fontWeight: 700, cursor: !savedOrder || printing ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", opacity: !savedOrder || printing ? 0.65 : 1 }}
          >
            <Printer size={14} /> {printing ? "Imprimiendo..." : "Imprimir ticket"}
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: "11px 22px", border: "none", borderRadius: 9, background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Guardando..." : savedOrder ? "Guardar cambios" : "Guardar Pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}