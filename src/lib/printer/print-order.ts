

import { buildTicketBlocks, type PedidoTicket } from "./ticket";

function strToHex(text: string): string {
  return Array.from(text)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

const INIT = "1B40";
const CENTER = "1B6101";
const CUT = "1B64011D564100";
const ESP32_URL = "http://192.168.100.103/print";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendHexToEsp32(hex: string): Promise<void> {
  const res = await fetch(ESP32_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: hex,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `ESP32 respondió con ${res.status}`);
  }
}

export async function printOrderTicket(order: PedidoTicket): Promise<void> {
  const textBlocks = buildTicketBlocks(order);

  const hexBlocks = textBlocks.map((block) => {
    let hex = INIT;
    hex += CENTER;
    hex += strToHex(block);
    return hex;
  });

  for (const block of hexBlocks) {
    await sendHexToEsp32(block);
    await sleep(400);
  }

  await sleep(800);
  await sendHexToEsp32(CUT);
}