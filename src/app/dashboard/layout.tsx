// src/app/dashboard/layout.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  PlusCircle,
  LogOut,
  Package,
  X,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard",           label: "Dashboard",      icon: LayoutDashboard },
  { href: "/dashboard/clientes",  label: "Clientes",       icon: Users           },
  { href: "/dashboard/pedidos",   label: "Pedidos",        icon: FileText        },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname            = usePathname();
  const router              = useRouter();
  const { user, loading, signOutUser } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) return <LoadingScreen />;
  if (!user)   return null;

  const isOwner = user.role === "owner";

  const nav = [
    ...NAV_ITEMS,
    ...(isOwner ? [{ href: "/dashboard/productos", label: "Productos", icon: Package }] : []),
  ];

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  async function handleSignOut() {
    setConfirmLogout(false);
    await signOutUser();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ──────────────────────────────────── */}
      <aside
        style={{
          width: 224,
          flexShrink: 0,
          background: "#1e3a8a",
          display: "flex",
          flexDirection: "column",
          boxShadow: "2px 0 12px rgba(0,0,0,.18)",
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: "28px 20px 22px",
            borderBottom: "1px solid rgba(255,255,255,.1)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "#facc15",
              borderRadius: 6,
              padding: "3px 8px",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: "0.12em",
                color: "#1e3a8a",
                textTransform: "uppercase",
              }}
            >
              Admin
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: 20,
              color: "#fff",
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}
          >
            Los Güeros
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "rgba(255,255,255,.45)",
              fontWeight: 500,
            }}
          >
            {isOwner ? "Propietario" : "Empleado"}
          </p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#1e3a8a" : "rgba(255,255,255,.7)",
                  background: active ? "#facc15" : "transparent",
                  textDecoration: "none",
                  transition: "all .15s",
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,.1)";
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}

          {/* Nuevo Pedido CTA */}
          <div style={{ marginTop: 8 }}>
            <Link
              href="/dashboard/nuevo-pedido"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                color: pathname === "/dashboard/nuevo-pedido" ? "#1e3a8a" : "#fff",
                background: pathname === "/dashboard/nuevo-pedido"
                  ? "#facc15"
                  : "rgba(37,99,235,.55)",
                border: "1.5px solid rgba(37,99,235,.6)",
                textDecoration: "none",
                transition: "all .15s",
              }}
            >
              <PlusCircle size={16} />
              Nuevo Pedido
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", padding: "12px 10px 4px" }}>
          <p
            style={{
              margin: "0 0 6px 12px",
              fontSize: 11,
              color: "rgba(255,255,255,.35)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.email}
          </p>
          <button
            onClick={() => setConfirmLogout(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,.5)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              transition: "all .15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "#fff";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.5)";
            }}
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {children}
      </main>

      {/* ── Logout Confirm Modal ──────────────────────── */}
      {confirmLogout && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff", borderRadius: 16, padding: 28,
              width: "100%", maxWidth: 360, boxShadow: "0 24px 48px rgba(0,0,0,.2)",
            }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "#eff6ff", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <AlertTriangle size={18} style={{ color: "#2563eb" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111827" }}>
                  ¿Cerrar sesión?
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  Tendrás que volver a iniciar sesión para entrar al panel.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmLogout(false)}
                style={{
                  flex: 1, padding: "9px 0", border: "1.5px solid #e5e7eb",
                  borderRadius: 9, background: "#fff", fontSize: 13,
                  fontWeight: 600, color: "#374151", cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  flex: 1, padding: "9px 0", border: "none",
                  borderRadius: 9, background: "#2563eb", fontSize: 13,
                  fontWeight: 700, color: "#fff", cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex", minHeight: "100vh",
        alignItems: "center", justifyContent: "center",
        background: "#f9fafb",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 36, height: 36, border: "3px solid #bfdbfe",
            borderTopColor: "#2563eb", borderRadius: "50%",
            animation: "spin 0.7s linear infinite", margin: "0 auto 12px",
          }}
        />
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Cargando...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
