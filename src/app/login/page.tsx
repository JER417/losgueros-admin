// src/app/login/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, AlertCircle, LogIn } from "lucide-react";

function LoginForm() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [show,     setShow]     = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const from = searchParams.get("from") ?? "/dashboard";

  useEffect(() => {
    if (!authLoading && user) router.replace(from);
  }, [authLoading, user, router, from]);

  if (authLoading) return <Splash />;
  if (user)        return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace(from);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("auth/") ? "Correo o contraseña incorrectos." : "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #7f1d1d 100%)",
      }}
    >
      {/* Left — branding panel */}
      <div
        style={{
          flex: 1,
          display: "none",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 56px",
          color: "#fff",
        }}
        className="md-brand-panel"
      >
        <div
          style={{
            display: "inline-block",
            background: "#facc15",
            borderRadius: 6,
            padding: "4px 12px",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "#7f1d1d",
              textTransform: "uppercase",
            }}
          >
            Sistema Administrativo
          </span>
        </div>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          Los Güeros
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,.6)", marginTop: 12, fontWeight: 400 }}>
          Gestión de pedidos, clientes y catálogo de productos.
        </p>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 14 }}>
          {["Pedidos en tiempo real", "Registro de clientes con domicilio", "Tickets de entrega imprimibles"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#facc15", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="#7f1d1d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,.8)", fontWeight: 500 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form panel */}
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 32,
          background: "#fff",
          boxShadow: "-8px 0 40px rgba(0,0,0,.25)",
        }}
      >
        {/* Mobile header */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "6px 14px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#dc2626",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", letterSpacing: "0.08em" }}>
              LOS GÜEROS
            </span>
          </div>
          <h2
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#111827",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Iniciar sesión
          </h2>
          <p style={{ color: "#9ca3af", fontSize: 14, margin: "6px 0 0", fontWeight: 400 }}>
            Accede al panel de administración
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block", marginBottom: 6, fontSize: 13,
                fontWeight: 600, color: "#374151",
              }}
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@correo.com"
              className="field"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              style={{
                display: "block", marginBottom: 6, fontSize: 13,
                fontWeight: 600, color: "#374151",
              }}
            >
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={show ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="field"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                tabIndex={-1}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  border: "none", background: "none", cursor: "pointer",
                  color: "#9ca3af", padding: 0, display: "flex",
                }}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                display: "flex", gap: 8, alignItems: "center",
                padding: "10px 14px", background: "#fef2f2",
                border: "1px solid #fecaca", borderRadius: 8,
                fontSize: 13, color: "#b91c1c", fontWeight: 500,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, width: "100%", padding: "11px 0",
              background: loading ? "#fca5a5" : "#dc2626",
              border: "none", borderRadius: 9, color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)", transition: "background .15s",
              marginTop: 4,
            }}
          >
            {loading ? (
              <>
                <SpinIcon /> Entrando...
              </>
            ) : (
              <>
                <LogIn size={15} /> Entrar al panel
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .md-brand-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function SpinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin .6s linear infinite" }}>
      <circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,.4)" strokeWidth="2" />
      <path d="M13 7a6 6 0 0 0-6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

function Splash() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
      <div style={{ width: 32, height: 32, border: "2.5px solid #fecaca", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Splash />}>
      <LoginForm />
    </Suspense>
  );
}
