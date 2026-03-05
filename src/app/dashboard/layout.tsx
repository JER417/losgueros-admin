"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, FileText, PlusCircle, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOutUser } = useAuth();

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

  if (!user) {
    return null;
  }

  async function handleSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/clientes", label: "Clientes", icon: Users },
    { href: "/dashboard/pedidos", label: "Pedidos", icon: FileText },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-56 flex-col bg-slate-800 text-white">
        <div className="border-b border-slate-700 p-4">
          <p className="font-semibold">Los Güeros</p>
          <p className="text-xs text-slate-400">Admin Panel</p>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                pathname === href ? "bg-[#facc15] text-slate-900" : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <Link
            href="/dashboard/nuevo-pedido"
            className="flex items-center gap-2 rounded-lg bg-[#facc15] px-3 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400"
          >
            <PlusCircle className="h-4 w-4" />
            Nuevo Pedido
          </Link>
        </nav>
        <div className="border-t border-slate-700 p-3 text-xs text-slate-400">
          <p>Barbacoa Los Güeros</p>
          <p>Desde 1994</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
