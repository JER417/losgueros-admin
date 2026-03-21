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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOutUser } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Cargando...</p>
      </div>
    );
  }

  if (!user) return null;

  async function handleSignOut() {
    setConfirmLogout(false);
    await signOutUser();
    router.replace("/login");
  }

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/clientes", label: "Clientes", icon: Users },
    { href: "/dashboard/pedidos", label: "Pedidos", icon: FileText },
    ...(user.role === "owner"
      ? [{ href: "/dashboard/productos", label: "Productos", icon: Package }]
      : []),
  ];

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-slate-800 text-white">
        <div className="border-b border-slate-700 p-4">
          <p className="font-semibold">🥩 Los Güeros</p>
          <p className="text-xs text-slate-400">
            {user.role === "owner" ? "Propietario" : "Empleado"}
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isActive(href)
                  ? "bg-[#facc15] font-medium text-slate-900"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}

          <Link
            href="/dashboard/nuevo-pedido"
            className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === "/dashboard/nuevo-pedido"
                ? "bg-amber-400 text-slate-900"
                : "bg-[#facc15] text-slate-900 hover:bg-amber-400"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Nuevo Pedido
          </Link>
        </nav>

        <div className="border-t border-slate-700 p-3">
          <p className="truncate text-xs text-slate-400">{user.email}</p>
        </div>

        {/* FIX: botón de logout pide confirmación */}
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="flex items-center gap-2 px-5 py-3 text-sm text-slate-400 hover:bg-slate-700 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 overflow-auto p-6">{children}</main>

      {/* Modal confirmar logout */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 font-semibold text-slate-800">¿Cerrar sesión?</h3>
            <p className="mb-5 text-sm text-slate-500">
              Tendrás que volver a iniciar sesión para entrar al panel.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700"
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
