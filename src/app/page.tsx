
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Search, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Municipalidad Distrital de Pillco Marca
            </h1>
            <p className="text-sm text-slate-500">
              Plataforma de Atención de Reclamos Ciudadanos
            </p>
          </div>

          <Button>Iniciar sesión</Button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <p className="mb-4 font-semibold text-blue-700">
          ATENCIÓN CIUDADANA
        </p>

        <h2 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900">
          Tu voz es importante para construir un mejor distrito
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-slate-600">
          Presenta tus reclamos, consulta su estado y realiza
          el seguimiento de tu solicitud de manera digital.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button size="lg">
            <FileText className="mr-2 h-5 w-5" />
            Presentar reclamo
          </Button>

          <Button size="lg" variant="outline">
            <Search className="mr-2 h-5 w-5" />
            Consultar reclamo
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-3">
        <Card>
          <CardHeader>
            <FileText className="mb-2 h-8 w-8 text-blue-700" />
            <CardTitle>Presenta tu reclamo</CardTitle>
            <CardDescription>
              Registra una incidencia o reclamo ciudadano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Describe el problema y adjunta evidencias.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Search className="mb-2 h-8 w-8 text-blue-700" />
            <CardTitle>Realiza seguimiento</CardTitle>
            <CardDescription>
              Consulta el avance de tu solicitud.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Conoce el estado y las actualizaciones de tu reclamo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="mb-2 h-8 w-8 text-blue-700" />
            <CardTitle>Atención transparente</CardTitle>
            <CardDescription>
              Información organizada y accesible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Consulta la información de atención de tus solicitudes.
            </p>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t bg-white py-6 text-center text-sm text-slate-500">
        Municipalidad Distrital de Pillco Marca © 2026
      </footer>
    </main>
  );
}
