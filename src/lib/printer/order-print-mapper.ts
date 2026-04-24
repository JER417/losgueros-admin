import type { PedidoTicket } from "./ticket";

export type PedidoForPrint = PedidoTicket & {
  pedidoId: string;
};

type PedidoDataForPrint = {
  clienteNombre?: string;
  clienteTelefono?: string;
  direccionEntrega?: PedidoTicket["direccionEntrega"];
  createdAt?: Date | string | null;
  tipoPedido: string;
  metodoPago: string;
  notas?: string;
  items: PedidoTicket["items"];
  totalGeneral: number;
};

export function mapPedidoToTicket(params: {
  pedidoId: string;
  pedidoData: PedidoDataForPrint;
  createdAt?: Date;
}): PedidoForPrint {
  const { pedidoId, pedidoData, createdAt = new Date() } = params;

  return {
    pedidoId,
    clienteNombre: pedidoData.clienteNombre ?? "",
    clienteTelefono: pedidoData.clienteTelefono ?? "",
    direccionEntrega: pedidoData.direccionEntrega,
    createdAt,
    tipoPedido: pedidoData.tipoPedido,
    metodoPago: pedidoData.metodoPago,
    notas: pedidoData.notas,
    items: pedidoData.items,
    totalGeneral: pedidoData.totalGeneral,
  };
}
