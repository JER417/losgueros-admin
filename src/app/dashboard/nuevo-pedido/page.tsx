// src/app/dashboard/nuevo-pedido/page.tsx

"use client";
import { v4 as uuidv4 } from "uuid";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { printOrderTicket } from "@/lib/printer/print-order";
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
}

type TipoPedido = "llevar" | "recoger" | "envio" | "mesa";
type MetodoPago =
  | "efectivo"
  | "transferencia"
  | "tarjeta"
  | "pendiente"
  | "otro";

const CLIENTE_EXPRESS_NOMBRE = "Cliente Express";

const tiposPedido: Array<{ value: TipoPedido; label: string }> = [
  { value: "llevar", label: "Llevar" },
  { value: "recoger", label: "Recoger" },
  { value: "envio", label: "Envío" },
  { value: "mesa", label: "Mesa" },
];

const metodosPago: Array<{ value: MetodoPago; label: string }> = [
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
});

export default function NuevoPedidoPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | undefined>(
    undefined
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const [fecha, setFecha] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [tipoPedido, setTipoPedido] = useState<TipoPedido>("llevar");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [express, setExpress] = useState(false);
  const [nombreClienteManual, setNombreClienteManual] = useState("");
  const [mesa, setMesa] = useState("");
  const [notas, setNotas] = useState("");

  const [items, setItems] = useState<PedidoItem[]>([newItem()]);
  const [loading, setLoading] = useState(false);
  const [savedOrderForPrint, setSavedOrderForPrint] = useState<any>(null);
  const [printing, setPrinting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const expressCliente = clientes.find(
    (cliente) =>
      `${cliente.nombre} ${cliente.apellidos}`.trim().toLowerCase() ===
      CLIENTE_EXPRESS_NOMBRE.toLowerCase()
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"));

    return onSnapshot(q, (snap) => {
      setClientes(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Cliente[]
      );
    });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "productos"),
      where("activo", "==", true),
      orderBy("nombre", "asc")
    );

    return onSnapshot(q, (snap) => {
      setProductos(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Producto[]
      );
    });
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
        clientes.filter((c) => {
          const nombreCompleto = `${c.nombre} ${c.apellidos}`.toLowerCase();
          const telefono = c.telefono.replace(/\s/g, "");
          const termino = term.replace(/\s/g, "");

          return nombreCompleto.includes(term) || telefono.includes(termino);
        })
      );

      if (!express) {
        setShowDropdown(true);
      }
    } else {
      setFilteredClientes([]);
      setShowDropdown(false);
    }
  }, [searchTerm, clientes, express]);

  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setSearchTerm(`${cliente.nombre} ${cliente.apellidos}`);
    setShowDropdown(false);
  };

  const handleTipoPedidoChange = (value: TipoPedido) => {
    setTipoPedido(value);

    if (value !== "mesa") {
      setMesa("");
    }

    if (value === "envio") {
      setExpress(false);
      setNombreClienteManual("");
    }
  };

  const handleExpressChange = (checked: boolean) => {
    if (tipoPedido === "envio") {
      return;
    }

    setExpress(checked);

    if (checked) {
      setSelectedCliente(undefined);
      setSearchTerm("");
      setShowDropdown(false);
    } else {
      setNombreClienteManual("");
    }
  };

  const handleSelectProducto = (itemId: string, productoId: string) => {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              productoId,
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

        if (field === "cantidad") {
          const cantidad = Number(value);
          return {
            ...item,
            cantidad,
            total: cantidad * item.precioUnitario,
          };
        }

        if (field === "precioUnitario") {
          const precioUnitario = Number(value);
          return {
            ...item,
            precioUnitario,
            total: item.cantidad * precioUnitario,
          };
        }

        return {
          ...item,
          concepto: String(value),
        };
      })
    );
  };

  const totalGeneral = items.reduce((sum, item) => sum + (item.total || 0), 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (tipoPedido === "envio") {
      if (!selectedCliente) {
        return alert("Selecciona un cliente para pedidos de envío");
      }

      if (!selectedCliente.direccion?.calle) {
        return alert("El cliente debe tener dirección para pedidos de envío");
      }
    }

    if (express) {
      if (!expressCliente) {
        return alert(
          'No existe el cliente "Cliente Express" en la base de datos'
        );
      }

      if (!nombreClienteManual.trim()) {
        return alert("Escribe el nombre del cliente para pedido express");
      }
    }

    if (tipoPedido === "mesa" && !mesa.trim()) {
      return alert("Captura el número o nombre de mesa");
    }

    if (items.some((item) => !item.concepto.trim())) {
      return alert("Completa todos los conceptos");
    }

    if (items.some((item) => item.total <= 0)) {
      return alert("Todos los productos deben tener un precio mayor a $0");
    }

    const clienteFinal =
      express && expressCliente ? expressCliente : selectedCliente;

    if (!clienteFinal && !express && tipoPedido === "envio") {
      return alert("Selecciona un cliente válido");
    }

    setLoading(true);

    try {
      const pedidoData: {
        clienteId: string;
        clienteNombre: string;
        clienteTelefono: string;
        tipoPedido: TipoPedido;
        metodoPago: MetodoPago;
        express: boolean;
        fecha: Timestamp;
        notas: string;
        items: Array<{
          cantidad: number;
          concepto: string;
          precioUnitario: number;
          total: number;
        }>;
        totalGeneral: number;
        status: string;
        createdAt: Timestamp;
        direccionEntrega?: DireccionCliente;
        mesa?: string;
        nombreClienteManual?: string;
      } = {
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

      await addDoc(collection(db, "pedidos"), pedidoData);

      setSavedOrderForPrint({
        clienteNombre: pedidoData.clienteNombre,
        clienteTelefono: pedidoData.clienteTelefono,
        direccionEntrega:
          tipoPedido === "envio" && selectedCliente?.direccion
            ? selectedCliente.direccion
            : undefined,
        createdAt: new Date(),
        tipoPedido: pedidoData.tipoPedido,
        metodoPago: pedidoData.metodoPago,
        notas: pedidoData.notas,
        items: pedidoData.items,
        totalGeneral: pedidoData.totalGeneral,
      });

      //router.push("/dashboard/pedidos");
    } catch (error) {
      console.error(error);
      alert("Error al guardar el pedido");
    } finally {
      setLoading(false);
    }
  };

  async function handlePrintTicket() {
  if (!savedOrderForPrint) return;

  try {
    setPrinting(true);
    await printOrderTicket(savedOrderForPrint);
  } catch (error) {
    console.error("Error al imprimir:", error);
    alert("No se pudo imprimir el ticket");
  } finally {
    setPrinting(false);
  }
}

  const dir = selectedCliente?.direccion;
  const hasAddress = !!dir?.calle;
  const showClienteSearch = !express || tipoPedido === "envio";
  const showDireccion = tipoPedido === "envio" && !!selectedCliente;
  const showMesa = tipoPedido === "mesa";
  const showNombreManual = express && tipoPedido !== "envio";

  const ic =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]";

  return (
    <div>
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
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            Configuración del pedido
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tipo de pedido
              </label>
              <select
                value={tipoPedido}
                onChange={(e) =>
                  handleTipoPedidoChange(e.target.value as TipoPedido)
                }
                className={ic}
              >
                {tiposPedido.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Método de pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className={ic}
              >
                {metodosPago.map((metodo) => (
                  <option key={metodo.value} value={metodo.value}>
                    {metodo.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={ic}
              />
            </div>

            <div className="flex items-end">
              <label className="flex h-10.5 w-full items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={express}
                  onChange={(e) => handleExpressChange(e.target.checked)}
                  disabled={tipoPedido === "envio"}
                  className="h-4 w-4"
                />
                Pedido express
              </label>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-4 text-base font-semibold text-slate-800">
              Cliente y entrega
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              {showClienteSearch && (
                <div className="relative" ref={dropdownRef}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Buscar cliente
                    {tipoPedido === "envio" ? " *" : ""}
                  </label>

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedCliente(undefined);
                    }}
                    placeholder="Nombre o teléfono..."
                    className={ic}
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
                          {cliente.direccion?.colonia && (
                            <span className="ml-1 text-xs text-slate-400">
                              — {cliente.direccion.colonia}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {showDropdown &&
                    searchTerm &&
                    filteredClientes.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg">
                        No se encontró el cliente.{" "}
                        <Link
                          href="/dashboard/clientes"
                          className="font-medium text-amber-600 hover:underline"
                        >
                          Registrarlo
                        </Link>
                      </div>
                    )}
                </div>
              )}

              {showNombreManual && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nombre del cliente *
                  </label>
                  <input
                    type="text"
                    value={nombreClienteManual}
                    onChange={(e) => setNombreClienteManual(e.target.value)}
                    placeholder="Ej: Juan, Sra. López..."
                    className={ic}
                  />
                </div>
              )}

              {showMesa && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Mesa *
                  </label>
                  <input
                    type="text"
                    value={mesa}
                    onChange={(e) => setMesa(e.target.value)}
                    placeholder="Ej: 4, Terraza, Barra..."
                    className={ic}
                  />
                </div>
              )}
            </div>

            {showDireccion && (
              <div
                className={`mt-4 rounded-lg border p-3 text-sm ${
                  hasAddress
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <MapPin
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      hasAddress ? "text-amber-600" : "text-red-500"
                    }`}
                  />

                  <div>
                    {hasAddress && dir ? (
                      <>
                        <p className="font-medium text-slate-700">
                          Dirección de entrega
                        </p>
                        <p className="mt-0.5 text-slate-600">
                          {dir.calle} {dir.noExt}
                          {dir.noInt ? ` Int. ${dir.noInt}` : ""}, Col.{" "}
                          {dir.colonia}, {dir.ciudad}
                        </p>
                        {dir.referencias && (
                          <p className="mt-0.5 italic text-slate-500">
                            Ref: {dir.referencias}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-red-700">
                          Sin dirección registrada
                        </p>
                        <p className="text-red-600">
                          El pedido de envío no tendrá dirección.{" "}
                          <Link
                            href="/dashboard/clientes"
                            className="underline hover:text-red-800"
                          >
                            Editar cliente
                          </Link>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notas (opcional)
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Sin chile, tortillas de más..."
              className={ic}
            />
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Productos</h2>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, newItem()])}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Agregar fila
            </button>
          </div>

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
              <div
                key={item.id}
                className="grid grid-cols-12 items-center gap-2"
              >
                <div className="col-span-1">
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) =>
                      handleItemChange(
                        item.id,
                        "cantidad",
                        parseInt(e.target.value, 10) || 1
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-center text-slate-800 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>

                <div className="col-span-4">
                  <input
                    type="text"
                    value={item.concepto}
                    onChange={(e) =>
                      handleItemChange(item.id, "concepto", e.target.value)
                    }
                    placeholder="Concepto..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>

                <div className="relative col-span-3">
                  <select
                    value={item.productoId ?? ""}
                    onChange={(e) =>
                      e.target.value
                        ? handleSelectProducto(item.id, e.target.value)
                        : setItems((prev) =>
                            prev.map((currentItem) =>
                              currentItem.id === item.id
                                ? {
                                    ...currentItem,
                                    productoId: undefined,
                                    precioUnitario: 0,
                                    total: 0,
                                  }
                                : currentItem
                            )
                          )
                    }
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  >
                    <option value="">— manual —</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} ${producto.precio}/{producto.unidad}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={item.precioUnitario}
                    onChange={(e) =>
                      handleItemChange(
                        item.id,
                        "precioUnitario",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-right text-slate-800 focus:border-[#facc15] focus:outline-none focus:ring-1 focus:ring-[#facc15]"
                  />
                </div>

                <div className="col-span-1 text-right text-sm font-semibold text-slate-800">
                  ${item.total.toLocaleString("es-MX")}
                </div>

                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (items.length > 1) {
                        setItems((prev) =>
                          prev.filter((currentItem) => currentItem.id !== item.id)
                        );
                      }
                    }}
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
              Total:{" "}
              <span className="text-xl">
                ${totalGeneral.toLocaleString("es-MX")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/pedidos"
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Link>

          {savedOrderForPrint && (
            <button
              type="button"
              onClick={handlePrintTicket}
              disabled={printing}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              {printing ? "Imprimiendo..." : "Imprimir ticket"}
            </button>
          )}

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
