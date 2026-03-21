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
    return role;
  }

  const data = snapshot.data() as { role?: Role };
  return data.role ?? "employee";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        // Limpiar cookie
        document.cookie = "authToken=; path=/; max-age=0; samesite=strict";
        setLoading(false);
        return;
      }

      const role = await ensureUserDocument(firebaseUser);
      const token = await firebaseUser.getIdToken();

      // CORREGIDO: secure=true en producción
      const isProduction = process.env.NODE_ENV === "production";
      document.cookie = `authToken=${token}; path=/; max-age=86400; samesite=strict${
        isProduction ? "; secure" : ""
      }`;

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    document.cookie = "authToken=; path=/; max-age=0; samesite=strict";
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
