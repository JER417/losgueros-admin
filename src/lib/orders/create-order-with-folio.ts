import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type CreateOrderResult = {
  pedidoId: string;
  folio: number;
};

export async function createOrderWithFolio(
  pedidoData: DocumentData
): Promise<CreateOrderResult> {
  const counterRef = doc(db, "counters", "pedidos");
  const pedidoRef = doc(collection(db, "pedidos"));

  const folio = await runTransaction(db, async (transaction) => {
    const counterSnapshot = await transaction.get(counterRef);

    const lastFolio = counterSnapshot.exists()
      ? Number(counterSnapshot.data().lastFolio ?? 0)
      : 0;

    const nextFolio = lastFolio + 1;

    transaction.set(
      counterRef,
      {
        lastFolio: nextFolio,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(pedidoRef, {
      ...pedidoData,
      folio: nextFolio,
    });

    return nextFolio;
  });

  return {
    pedidoId: pedidoRef.id,
    folio,
  };
}