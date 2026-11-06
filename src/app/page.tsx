import { ArrowDown, FileCheck2, Landmark, Search, ShieldCheck } from "lucide-react";
import { ClaimForm } from "@/components/claim-form";
import { ClaimTracking } from "@/components/claim-tracking";
import { TurnstileLoader } from "@/components/turnstile-loader";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <TurnstileLoader />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4 sm:px-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white"><Landmark className="h-6 w-6" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-950 sm:text-base">Municipalidad Distrital de Pillco Marca</p>
            <p className="text-xs text-slate-500 sm:text-sm">Atención de reclamos ciudadanos</p>
          </div>
          <nav aria-label="Secciones de atención" className="hidden items-center gap-5 text-sm font-semibold text-slate-700 sm:flex">
            <a href="#registro" className="hover:text-blue-800">Registrar reclamo</a>
            <a href="#seguimiento" className="hover:text-blue-800">Consultar reclamo</a>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">Atención ciudadana</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">Tu voz ayuda a construir un mejor distrito</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">Registra una situación que requiere atención municipal. Recibirás un código para consultar el estado de tu reclamo.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#registro" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-blue-950 transition hover:bg-blue-50">Registrar reclamo <ArrowDown className="h-4 w-4" /></a>
            <a href="#seguimiento" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 font-semibold text-white transition hover:bg-white/10"><Search className="h-4 w-4" />Consultar reclamo</a>
          </div>
          <div className="mt-12 grid gap-4 text-sm text-blue-50 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-4"><FileCheck2 className="h-5 w-5 shrink-0" /><span>Registro digital de tu solicitud</span></div>
            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-4"><ShieldCheck className="h-5 w-5 shrink-0" /><span>Protección contra envíos automatizados</span></div>
            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-4"><Landmark className="h-5 w-5 shrink-0" /><span>Atención por la municipalidad</span></div>
          </div>
        </div>
      </section>

      <section id="registro" className="mx-auto max-w-4xl scroll-mt-6 px-4 py-12 sm:px-8 sm:py-16">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-800">Formulario ciudadano</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Presenta tu reclamo</h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">Completa los datos solicitados. La información se enviará de forma segura para su registro y atención.</p>
        </div>
        <ClaimForm />
      </section>

      <section id="seguimiento" className="scroll-mt-6 border-t border-slate-200 bg-white px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-800">Consulta ciudadana</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Consulta el estado de tu reclamo</h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">Ingresa el código de seguimiento y el DNI utilizado al registrar la solicitud.</p>
          </div>
          <ClaimTracking />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">Municipalidad Distrital de Pillco Marca · 2026</footer>
    </main>
  );
}
