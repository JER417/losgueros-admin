// src/types/index.ts
import { Timestamp } from "firebase/firestore";

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  unidad: string;
  activo: boolean;
  createdAt: Timestamp;
}