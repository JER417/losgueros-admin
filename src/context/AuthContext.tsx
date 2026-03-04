\"use client\";

import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
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

type Role = "owner" | "employee";

type AppUser = {
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

async function ensureUserDocument(user: FirebaseUser) {
  const usuariosRef = collection(db, "usuarios");
  const userDocRef = doc(usuariosRef, user.uid);
  const snapshot = await getDoc(userDocRef);

  if (!snapshot.exists()) {
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ?? "",
      role: "owner",
      createdAt: serverTimestamp(),
    });
    return "owner" as Role;
  }

  const data = snapshot.data() as { role?: Role };
  return (data.role ?? "employee") as Role;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        document.cookie =
          "authToken=; path=/; max-age=0; samesite=lax; secure=false";
        setLoading(false);
        return;
      }

      const role = await ensureUserDocument(firebaseUser);

      const token = await firebaseUser.getIdToken();
      document.cookie = `authToken=${token}; path=/; max-age=86400; samesite=lax; secure=false`;

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
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

