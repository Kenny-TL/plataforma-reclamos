"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section role="alert" className="rounded-2xl border bg-white p-8"><h1 className="text-xl font-bold">No se pudo cargar esta sección</h1><p className="mt-2">Comprueba tu conexión y vuelve a intentarlo.</p><button onClick={reset} className="btn mt-4">Reintentar</button></section>; }
