// src/context/AuthContext.tsx
"use client";

import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth, db } from "@/lib/firebase";

export type Role = "owner" | "employee";

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role | null;
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function ensureUserDocument(firebaseUser: FirebaseUser): Promise<Role> {
  const userDocRef = doc(db, "usuarios", firebaseUser.uid);
  const snapshot = await getDoc(userDocRef);

  if (!snapshot.exists()) {
    const role: Role = "employee";
    await setDoc(userDocRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName ?? "",
      role,
      createdAt: serverTimestamp(),
    });
    // FIX #2: esperar a que Firestore propague el documento antes de
    // que los listeners de las reglas intenten leerlo (evita permission-denied)
    await new Promise((resolve) => setTimeout(resolve, 300));
    return role;
  }

  const data = snapshot.data() as { role?: Role };
  return data.role ?? "employee";
}

function setCookie(token: string) {
  const isProduction = process.env.NODE_ENV === "production";
  document.cookie = `authToken=${token}; path=/; max-age=86400; samesite=strict${
    isProduction ? "; secure" : ""
  }`;
}

function clearCookie() {
  document.cookie = "authToken=; path=/; max-age=0; samesite=strict";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Limpiar interval anterior si existía
      if (refreshInterval) clearInterval(refreshInterval);

      if (!firebaseUser) {
        setUser(null);
        clearCookie();
        setLoading(false);
        return;
      }

      const role = await ensureUserDocument(firebaseUser);
      const token = await firebaseUser.getIdToken();
      setCookie(token);

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role,
      });
      setLoading(false);

      // FIX #1: refrescar el token JWT cada 50 minutos
      // (Firebase expira los tokens a los 60min; 50min da margen de seguridad)
      refreshInterval = setInterval(async () => {
        try {
          const freshToken = await firebaseUser.getIdToken(true);
          setCookie(freshToken);
        } catch {
          // Si falla el refresh, forzar logout para evitar estado inconsistente
          await signOut(auth);
        }
      }, 50 * 60 * 1000);
    });

    return () => {
      unsubscribe();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    clearCookie();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
