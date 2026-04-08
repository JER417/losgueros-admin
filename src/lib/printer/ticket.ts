

export type PedidoItem = {
  cantidad: number;
  concepto: string;
  precioUnitario: number;
  total: number;
};

export type PedidoTicket = {
  clienteNombre: string;
  clienteTelefono?: string;
  direccionEntrega?: {
    calle?: string;
    noExt?: string;
    noInt?: string;
    colonia?: string;
    ciudad?: string;
    estado?: string;
    cp?: string;
    referencias?: string;
  };
  createdAt?: Date | string | null;
  tipoPedido: string;
  metodoPago: string;
  notas?: string;
  items: PedidoItem[];
  totalGeneral: number;
};

const TICKET_WIDTH = 32;

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");
}

function money(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function fitText(text: string, width = TICKET_WIDTH): string {
  const t = normalizeText(String(text ?? ""));
  return t.length > width ? t.slice(0, width) : t;
}

function line(left: string, right: string, width = TICKET_WIDTH): string {
  const l = normalizeText(String(left ?? ""));
  const r = normalizeText(String(right ?? ""));

  if (l.length + r.length >= width) {
    const maxLeft = Math.max(1, width - r.length - 1);
    return l.slice(0, maxLeft) + " " + r;
  }

  const spaces = Math.max(1, width - l.length - r.length);
  return l + " ".repeat(spaces) + r;
}

function centerText(text: string, width = TICKET_WIDTH): string {
  const t = fitText(text, width);
  if (t.length >= width) return t;
  const leftPad = Math.floor((width - t.length) / 2);
  return " ".repeat(leftPad) + t;
}

function formatDateTime(value?: Date | string | null): string {
  if (!value) return "-";

  if (value instanceof Date) {
    const dd = String(value.getDate()).padStart(2, "0");
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const yyyy = value.getFullYear();
    const hh = String(value.getHours()).padStart(2, "0");
    const mi = String(value.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }

  return fitText(String(value));
}

function labelTipoPedido(tipo: string): string {
  const map: Record<string, string> = {
    llevar: "Llevar",
    recoger: "Recoger",
    envio: "Envio",
    mesa: "Mesa",
  };

  return map[tipo] || tipo;
}

function labelMetodoPago(pago: string): string {
  const map: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
    pendiente: "Pendiente",
    otro: "Otro",
  };

  return map[pago] || pago;
}

function buildClienteTelefonoLine(nombre?: string, telefono?: string): string {
  const n = normalizeText(nombre?.trim() || "Publico general");
  const t = normalizeText(telefono?.trim() || "");

  if (!t) return fitText(n);

  return line(n, t);
}

function wrapText(text: string, width = TICKET_WIDTH): string[] {
  const clean = normalizeText(text).trim();
  if (!clean) return [];

  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= width) {
      current = candidate;
    } else {
      if (current) lines.push(current);

      if (word.length > width) {
        let rest = word;
        while (rest.length > width) {
          lines.push(rest.slice(0, width));
          rest = rest.slice(width);
        }
        current = rest;
      } else {
        current = word;
      }
    }
  }

  if (current) lines.push(current);
  return lines;
}

function buildDireccionLines(
  direccion?: PedidoTicket["direccionEntrega"]
): string[] {
  if (!direccion?.calle) return [];

  const rawLines = [
    [
      direccion.calle,
      direccion.noExt,
      direccion.noInt ? `Int ${direccion.noInt}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    [direccion.colonia, direccion.ciudad].filter(Boolean).join(", "),
    [direccion.estado, direccion.cp ? `CP ${direccion.cp}` : ""]
      .filter(Boolean)
      .join(" "),
    direccion.referencias ? `Ref: ${direccion.referencias}` : "",
  ].filter(Boolean);

  return rawLines.flatMap((part) => wrapText(part));
}

export function buildTicketBlocks(order: PedidoTicket): string[] {
  const blocks: string[] = [];
  const direccionLines = buildDireccionLines(order.direccionEntrega);

  //1) Header
  blocks.push(
    [
      "BARBACOA LOS GUEROS",
      "SAN NICOLAS, N.L. TEL.8183944771",
      "TICKET DE VENTA",
    ].join("\n") + "\n"
  );


  // 2) Cliente / fecha
  blocks.push(
    [
      buildClienteTelefonoLine(order.clienteNombre, order.clienteTelefono),
      line("Fecha", formatDateTime(order.createdAt)),
      "--------------------------------",
    ].join("\n") + "\n"
  );

  // 3) tipos
  blocks.push(
    [
      line("Pago", labelMetodoPago(order.metodoPago || "-")),
      line("Tipo", labelTipoPedido(order.tipoPedido || "-")),
    ].join("\n") + "\n"
  );

  // 4) direccion
  if (direccionLines.length === 0) {
    blocks.push(
      [
        line("", ""),
        line("", ""),
      ].join("\n") + "\n"
    );
  } else {
    for (let i = 0; i < direccionLines.length; i += 2) {
      blocks.push(
        [
          direccionLines[i] ?? line("", ""),
          direccionLines[i + 1] ?? line("", ""),
        ].join("\n") + "\n"
      );
    }
  }

  // 5) Encabezado productos
  blocks.push(
    [
      line("Producto", "Total"),
      "--------------------------------",
    ].join("\n") + "\n"
  );

  // 6+) Items en bloques de maximo 2 lineas
  const itemLines = order.items.map(
    (item) => line(`${item.cantidad} ${item.concepto}`, money(item.total)) + "\n"
  );

  for (let i = 0; i < itemLines.length; i += 2) {
    blocks.push(itemLines.slice(i, i + 2).join(""));
  }

  // Notas
  if (order.notas?.trim()) {
    const notaLines = wrapText(order.notas.trim());
    if (notaLines.length > 0) {
      blocks.push(
        [
          "--------------------------------",
          "Notas:",
          notaLines[0] ?? "",
        ].join("\n") + "\n"
      );

      for (let i = 1; i < notaLines.length; i += 2) {
        blocks.push(
          [
            notaLines[i] ?? "",
            notaLines[i + 1] ?? "",
          ].join("\n") + "\n"
        );
      }
    }
  }

  // Total
  blocks.push(
    [
      "--------------------------------",
      line("TOTAL", money(order.totalGeneral)),
      "--------------------------------",
    ].join("\n") + "\n"
  );

  // Footer
  blocks.push(
    [
      "Gracias por su compra",
      "Vuelva pronto",
    ].join("\n") + "\n"
  );

  return blocks.map(normalizeText);
}