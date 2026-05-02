import { Timestamp } from "firebase/firestore";
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

export type PrintJobStatus = "pending" | "printing" | "printed" | "error";

export type PrintJobPayloadType = "escpos_hex_blocks";

export type PrintJobDocument = {
  pedidoId: string;
  status: PrintJobStatus;
  payloadType: PrintJobPayloadType;
  blocks: string[];
  cutCommand: string;
  copies: number;
  attempts: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  printedAt: Timestamp | null;
  error: string | null;
};

export function buildPrintJobDocument(params: {
  pedidoId: string;
  order: PedidoTicket;
  copies?: number;
}): PrintJobDocument {
  const { pedidoId, order, copies = 2 } = params;

  const textBlocks = buildTicketBlocks(order);

  const hexBlocks = textBlocks.map((block) => {
    let hex = INIT;
    hex += CENTER;
    hex += strToHex(block);
    return hex;
  });

  return {
    pedidoId,
    status: "pending",
    payloadType: "escpos_hex_blocks",
    blocks: hexBlocks,
    cutCommand: CUT,
    copies,
    attempts: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    printedAt: null,
    error: null,
  };
} 