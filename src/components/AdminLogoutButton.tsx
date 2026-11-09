"use client";

export function AdminLogoutButton() {
  async function salir() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/propietario/login";
  }

  return (
    <button type="button" onClick={salir} className="text-sm font-medium text-stone-500 hover:text-[#2c5e50]">
      Cerrar sesión
    </button>
  );
}
