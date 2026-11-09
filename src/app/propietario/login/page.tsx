"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const configParam = params.get("config");
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [creandoAcceso, setCreandoAcceso] = useState(false);
  const [usuarioNuevo, setUsuarioNuevo] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [avisoAlta, setAvisoAlta] = useState("");
  const [faltaConfig, setFaltaConfig] = useState(configParam === "faltante");
  const [reconfigurando, setReconfigurando] = useState(false);

  useEffect(() => {
    if (configParam === "faltante") return;
    let activo = true;
    fetch("/api/admin/auth/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { needsSetup?: boolean }) => { if (activo) setFaltaConfig(Boolean(data.needsSetup)); })
      .catch(() => undefined);
    return () => { activo = false; };
  }, [configParam]);

  async function ingresar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, clave }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo iniciar sesión");
      const destino = params.get("next");
      window.location.href = destino?.startsWith("/admin") ? destino : "/admin";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión");
      setEnviando(false);
    }
  }

  async function crearAcceso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreandoAcceso(true);
    setError("");
    setAvisoAlta("");
    try {
      const response = await fetch("/api/admin/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuarioNuevo, clave: claveNueva }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo configurar el acceso");
      setAvisoAlta("Acceso creado. Ya puedes ingresar al panel con tu usuario y contraseña.");
      setClaveNueva("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo configurar el acceso");
    } finally {
      setCreandoAcceso(false);
    }
  }

  async function reconfigurarAcceso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreandoAcceso(true);
    setError("");
    setAvisoAlta("");
    try {
      const response = await fetch("/api/admin/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuarioNuevo, clave: claveNueva }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo reconfigurar el acceso");

      const login = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuarioNuevo, clave: claveNueva }),
      });
      if (login.ok) {
        window.location.href = "/admin";
        return;
      }
      setUsuario(usuarioNuevo);
      setAvisoAlta("Acceso reconfigurado. Ingresa con tu usuario y contraseña nuevos.");
      setReconfigurando(false);
      setClave("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo reconfigurar el acceso");
    } finally {
      setCreandoAcceso(false);
    }
  }

  return (
    <section className="grid min-h-[70vh] place-items-center bg-[#fbf8f1] px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#203128]/10 bg-white p-8 shadow-xl shadow-[#203128]/10">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#3f806e]">Glasskin propietario</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[#203128]">Iniciar sesión</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Acceso exclusivo para administrar productos, categorías y pedidos.
        </p>
        {faltaConfig && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Es la primera vez que configuras el panel. Crea aquí tu usuario y una contraseña de al menos 12 caracteres. Esta configuración solo se acepta desde esta computadora.
          </div>
        )}
        {error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {avisoAlta && <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{avisoAlta}<button type="button" onClick={() => { window.location.href = "/propietario/login"; }} className="ml-2 font-bold underline">Continuar</button></div>}
        {reconfigurando && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Esto reemplaza el usuario y la contraseña anteriores. Solo puedes hacerlo desde esta computadora.
          </div>
        )}
        {faltaConfig && (
          <form className="mt-6 space-y-4 border-b border-stone-200 pb-6" onSubmit={crearAcceso}>
            <div>
              <label htmlFor="usuario-nuevo" className="mb-1.5 block text-sm font-semibold text-stone-700">Tu usuario</label>
              <input id="usuario-nuevo" autoComplete="username" required minLength={3} maxLength={40} value={usuarioNuevo} onChange={(event) => setUsuarioNuevo(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#3f806e]" />
            </div>
            <div>
              <label htmlFor="clave-nueva" className="mb-1.5 block text-sm font-semibold text-stone-700">Contraseña nueva</label>
              <input id="clave-nueva" type="password" autoComplete="new-password" required minLength={12} maxLength={200} value={claveNueva} onChange={(event) => setClaveNueva(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#3f806e]" />
              <p className="mt-1 text-xs text-stone-500">Mínimo 12 caracteres. Se guarda en la configuración local del servidor y no se publica en la tienda.</p>
            </div>
            <button type="submit" disabled={creandoAcceso} className="w-full rounded-full bg-[#3f806e] py-3.5 text-sm font-bold text-white disabled:opacity-50">{creandoAcceso ? "Configurando…" : "Crear acceso de propietario"}</button>
          </form>
        )}
        {reconfigurando ? (
          <form className="mt-6 space-y-4" onSubmit={reconfigurarAcceso}>
            <div>
              <label htmlFor="usuario-reset" className="mb-1.5 block text-sm font-semibold text-stone-700">Usuario nuevo</label>
              <input id="usuario-reset" autoComplete="username" required minLength={3} maxLength={40} value={usuarioNuevo} onChange={(event) => setUsuarioNuevo(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#3f806e]" />
            </div>
            <div>
              <label htmlFor="clave-reset" className="mb-1.5 block text-sm font-semibold text-stone-700">Contraseña nueva</label>
              <input id="clave-reset" type="password" autoComplete="new-password" required minLength={12} maxLength={200} value={claveNueva} onChange={(event) => setClaveNueva(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#3f806e]" />
              <p className="mt-1 text-xs text-stone-500">Mínimo 12 caracteres.</p>
            </div>
            <div className="flex gap-2"><button type="submit" disabled={creandoAcceso} className="flex-1 rounded-full bg-[#3f806e] py-3 text-sm font-bold text-white disabled:opacity-50">{creandoAcceso ? "Reconfigurando…" : "Guardar nuevo acceso"}</button><button type="button" onClick={() => { setReconfigurando(false); setError(""); }} className="rounded-full border border-stone-300 px-4 py-3 text-sm font-semibold">Cancelar</button></div>
          </form>
        ) : (
        <form className="mt-6 space-y-4" onSubmit={ingresar}>
          <div>
            <label htmlFor="usuario" className="mb-1.5 block text-sm font-semibold text-stone-700">Usuario</label>
            <input id="usuario" autoComplete="username" required value={usuario} onChange={(event) => setUsuario(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#3f806e]" />
          </div>
          <div>
            <label htmlFor="clave" className="mb-1.5 block text-sm font-semibold text-stone-700">Contraseña</label>
            <input id="clave" type="password" autoComplete="current-password" required value={clave} onChange={(event) => setClave(event.target.value)} className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#3f806e]" />
          </div>
          <button type="submit" disabled={enviando || faltaConfig} className="w-full rounded-full bg-[#203128] py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {enviando ? "Ingresando…" : "Ingresar al panel"}
          </button>
        </form>
        )}
        {!faltaConfig && !reconfigurando && <button type="button" onClick={() => { setReconfigurando(true); setUsuarioNuevo(""); setClaveNueva(""); setError(""); setAvisoAlta(""); }} className="mt-4 w-full text-center text-xs font-semibold text-[#3f806e] underline underline-offset-4">¿Necesitas volver a crear el acceso de propietario?</button>}
      </div>
    </section>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-[#fbf8f1]" />}>
      <LoginForm />
    </Suspense>
  );
}
