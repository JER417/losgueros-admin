

import { NextRequest, NextResponse } from "next/server";
import http from "node:http";

const PRINTER_HOST = "192.168.0.191";
const PRINTER_PORT = 80;
const PRINTER_PATH = "/write.html";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendHex(hex: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = "data_hex=" + hex;

    const req = http.request(
      {
        host: PRINTER_HOST,
        port: PRINTER_PORT,
        path: PRINTER_PATH,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          "Connection": "close",
        },
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk.toString();
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(
              new Error(
                `La impresora respondió con ${res.statusCode ?? "sin status"}: ${data}`
              )
            );
          }
        });
      }
    );

    req.on("error", (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy(new Error("Timeout al conectar con la impresora"));
    });

    req.write(body);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blocks = Array.isArray(body?.blocks) ? body.blocks : [];

    if (!blocks.length) {
      return NextResponse.json(
        { ok: false, error: "No se recibieron bloques para imprimir" },
        { status: 400 }
      );
    }

    for (const block of blocks) {
      await sendHex(block);
      await sleep(400);
    }

    await sleep(800);
    await sendHex("1B64011D564100");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en /api/print-order:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}