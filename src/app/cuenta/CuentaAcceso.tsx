"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Perfil = { nombre: string; email: string; telefono: string | null };

export function CuentaAcceso() {
  const router = useRouter();
  const [modo, setModo] = useState<"ingresar" | "crear">("ingresar");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCargando(true);
    setMensaje("");
    const form = new FormData(event.currentTarget);
    const datos = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/cuenta/auth/${modo === "crear" ? "registro" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo acceder a tu cuenta");
      router.refresh();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo acceder a tu cuenta");
    } finally {
      setCargando(false);
    }
  }

  const claseInput = "mt-1.5 w-full rounded-xl border border-[#203128]/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#3f806e] focus:ring-4 focus:ring-[#3f806e]/10";
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-5xl items-center gap-8 px-5 py-12 lg:grid-cols-[1fr_.9fr]">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#3f806e]">Tu espacio Glasskin</p><h1 className="mt-3 max-w-lg font-display text-4xl font-semibold leading-tight text-[#203128] sm:text-5xl">Tus pedidos, siempre a mano.</h1><p className="mt-4 max-w-lg leading-7 text-[#577565]">Crea tu perfil para guardar tus compras y consultar cada actualización desde un solo lugar.</p><div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-[#405b4d]"><span className="rounded-full bg-[#e8f0e8] px-4 py-2">Historial privado</span><span className="rounded-full bg-[#eee7d8] px-4 py-2">Seguimiento de pedidos</span></div></div>
      <section className="rounded-[28px] border border-[#203128]/10 bg-white p-6 shadow-xl shadow-[#203128]/[.06] sm:p-8">
        <div className="flex rounded-full bg-[#fbf8f1] p-1"><button type="button" onClick={() => { setModo("ingresar"); setMensaje(""); }} className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold ${modo === "ingresar" ? "bg-white text-[#203128] shadow-sm" : "text-stone-500"}`}>Iniciar sesión</button><button type="button" onClick={() => { setModo("crear"); setMensaje(""); }} className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold ${modo === "crear" ? "bg-white text-[#203128] shadow-sm" : "text-stone-500"}`}>Crear cuenta</button></div>
        <form onSubmit={enviar} className="mt-6 space-y-4">
          {modo === "crear" && <label className="block text-sm font-semibold text-[#203128]">Nombre completo<input name="nombre" autoComplete="name" required minLength={2} maxLength={100} className={claseInput} /></label>}
          <label className="block text-sm font-semibold text-[#203128]">Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={254} className={claseInput} /></label>
          {modo === "crear" && <label className="block text-sm font-semibold text-[#203128]">Teléfono <span className="font-normal text-stone-400">(opcional)</span><input name="telefono" type="tel" autoComplete="tel" maxLength={40} className={claseInput} /></label>}
          <label className="block text-sm font-semibold text-[#203128]">Contraseña<input name="password" type="password" autoComplete={modo === "crear" ? "new-password" : "current-password"} required minLength={modo === "crear" ? 12 : 1} maxLength={200} className={claseInput} />{modo === "crear" && <span className="mt-1 block text-xs font-normal text-stone-500">Usa al menos 12 caracteres.</span>}</label>
          {mensaje && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{mensaje}</p>}
          <button disabled={cargando} className="w-full rounded-full bg-[#203128] py-3.5 text-sm font-bold text-white transition hover:bg-[#3f806e] disabled:opacity-60">{cargando ? "Un momento…" : modo === "crear" ? "Crear mi cuenta" : "Entrar a mi perfil"}</button>
        </form>
      </section>
    </div>
  );
}

export function CuentaPerfil({ perfil }: { perfil: Perfil }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [nombre, setNombre] = useState(perfil.nombre);
  const [telefono, setTelefono] = useState(perfil.telefono ?? "");

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCargando(true); setMensaje("");
    try {
      const response = await fetch("/api/cuenta/perfil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre, telefono }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el perfil");
      setEditando(false); setMensaje("Perfil actualizado"); router.refresh();
    } catch (error) { setMensaje(error instanceof Error ? error.message : "No se pudo guardar el perfil"); }
    finally { setCargando(false); }
  }

  async function salir() {
    await fetch("/api/cuenta/auth/logout", { method: "POST" });
    router.refresh();
  }

  const input = "mt-1 w-full rounded-xl border border-[#203128]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3f806e]";
  const iniciales = perfil.nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join("");
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#203128]/10 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-5 bg-gradient-to-r from-[#edf3ef] via-[#f7f7f0] to-[#fbf8f1] p-5 sm:p-7">
        <div className="flex min-w-0 items-center gap-4"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#203128] font-display text-xl font-bold text-white shadow-sm">{iniciales}</span><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#3f806e]">Tu cuenta Glasskin</p><p className="mt-1 truncate font-display text-xl font-semibold text-[#203128] sm:text-2xl">{perfil.nombre}</p><p className="truncate text-sm text-stone-600">{perfil.email}</p></div></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setEditando(!editando); setMensaje(""); }} className="rounded-full border border-[#203128]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#203128] transition hover:border-[#3f806e]">{editando ? "Cerrar edición" : "Editar perfil"}</button><button type="button" onClick={salir} className="rounded-full px-4 py-2.5 text-xs font-bold text-stone-600 transition hover:bg-white/70">Cerrar sesión</button></div>
      </div>
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 border-t border-[#203128]/10 px-5 py-3 text-xs text-stone-500 sm:px-7"><span><strong className="text-stone-700">Correo</strong> · {perfil.email}</span><span><strong className="text-stone-700">Teléfono</strong> · {perfil.telefono || "Sin agregar"}</span><span className="rounded-full bg-[#edf3ef] px-2.5 py-1 font-semibold text-[#315141]">Cuenta privada</span></div>
      {editando && <form onSubmit={guardar} className="grid gap-3 border-t border-[#203128]/10 p-5 sm:grid-cols-2 sm:p-7"><label className="text-xs font-bold text-stone-600">Nombre<input required minLength={2} maxLength={100} value={nombre} onChange={(event) => setNombre(event.target.value)} className={input} /></label><label className="text-xs font-bold text-stone-600">Teléfono<input maxLength={40} value={telefono} onChange={(event) => setTelefono(event.target.value)} className={input} /></label><button disabled={cargando} className="rounded-full bg-[#203128] px-5 py-2.5 text-sm font-bold text-white sm:col-span-2 sm:justify-self-start">{cargando ? "Guardando…" : "Guardar cambios"}</button></form>}
      {mensaje && <p role="status" className="px-5 pb-4 text-xs font-semibold text-[#3f806e] sm:px-7">{mensaje}</p>}
    </section>
  );
}
