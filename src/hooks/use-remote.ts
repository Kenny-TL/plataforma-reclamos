"use client";
import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";
export function useRemote<T>(loader: () => Promise<T>) {
  const [revision, setRevision] = useState(0); const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({ data: null, loading: true, error: "" });
  useEffect(() => { let active = true; const timer = setTimeout(async () => {
    setState({ data: null, loading: true, error: "" });
    try { const data = await loader(); if (active) setState({ data, loading: false, error: "" }); }
    catch (error) { if (active) setState({ data: null, loading: false, error: errorMessage(error) }); }
  }, 0); return () => { active = false; clearTimeout(timer); }; }, [loader, revision]);
  const reload = useCallback(() => setRevision((value) => value + 1), []); return { ...state, reload };
}
