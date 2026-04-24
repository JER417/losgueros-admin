import admin from "firebase-admin";

const DEVICE_ID = "los-gueros-caja-01";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "crmlg-220e4",
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

let lastEventVersion = -1;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("ESP32 Simulator iniciado");
  console.log(`Device ID: ${DEVICE_ID}`);

  while (true) {
    try {
      const deviceSnap = await db
        .collection("printerDevices")
        .doc(DEVICE_ID)
        .get();

      if (!deviceSnap.exists) {
        console.log("No existe config de printerDevices");
        await sleep(10000);
        continue;
      }

      const deviceConfig = deviceSnap.data();

      if (!deviceConfig?.enabled) {
        console.log("Dispositivo deshabilitado");
        await sleep(30000);
        continue;
      }

      const polling = deviceConfig.polling ?? {};
      const idleMs = polling.idleMs ?? 10000;
      const printScanMs = polling.printScanMs ?? 1500;

      const signalSnap = await db
        .collection("printSignals")
        .doc(DEVICE_ID)
        .get();

      if (!signalSnap.exists) {
        console.log("No existe printSignal");
        await sleep(idleMs);
        continue;
      }

      const signal = signalSnap.data();
      const currentVersion = signal?.eventVersion ?? 0;

      if (currentVersion !== lastEventVersion) {
        console.log(`Nueva señal detectada: ${lastEventVersion} → ${currentVersion}`);
        lastEventVersion = currentVersion;

       const jobsSnap = await db
        .collection("printjobs")
        .where("status", "==", "pending")
        .limit(5)
        .get();

        if (jobsSnap.empty) {
          console.log("No hay jobs pendientes");
        }

        for (const jobDoc of jobsSnap.docs) {
          const job = jobDoc.data();

          console.log("--------------------------------");
          console.log(`Imprimiendo job: ${jobDoc.id}`);
          console.log(`Pedido: ${job.pedidoId}`);
          console.log(`Copias: ${job.copies}`);
          console.log(`Bloques: ${job.blocks?.length ?? 0}`);

          await jobDoc.ref.update({
            status: "printing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: admin.firestore.FieldValue.increment(1),
          });

          await sleep(1000);

          console.log("Simulación de impresión:");
          console.log(job.blocks);

          await jobDoc.ref.update({
            status: "printed",
            printedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: null,
          });

          console.log(`Job marcado como printed: ${jobDoc.id}`);
        }

        await sleep(printScanMs);
      } else {
        await sleep(idleMs);
      }
    } catch (error) {
      console.error("Error en simulador:", error);
      await sleep(10000);
    }
  }
}

main();