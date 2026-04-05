

import { buildTicketBlocks, type PedidoTicket } from "./ticket";

function strToHex(text: string): string {
  return Array.from(text)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

const INIT = "1B40";
const CENTER = "1B6101";

export async function printOrderTicket(order: PedidoTicket): Promise<void> {
  const textBlocks = buildTicketBlocks(order);

  const hexBlocks = textBlocks.map((block) => {
    let hex = INIT;

    // 🔥 centrado global
    hex += CENTER;

    hex += strToHex(block);
    return hex;
  });

  const res = await fetch("/api/print-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ blocks: hexBlocks }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || "No se pudo imprimir el ticket");
  }
}