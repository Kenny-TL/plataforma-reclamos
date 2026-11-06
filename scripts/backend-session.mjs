import fs from "node:fs";
import path from "node:path";
import cp from "node:child_process";
import { createClient } from "@supabase/supabase-js";
export function publicEnvironment() {
  return Object.fromEntries(fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter((x) => /^\w+=/.test(x)).map((x) => { const i=x.indexOf("=");return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]; }));
}
export function cli(args) {
  const env = publicEnvironment(); const ref = fs.readFileSync("supabase/.temp/project-ref","utf8").trim();
  if (new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0] !== ref) throw Error("Proyecto enlazado incompatible.");
  const executable = path.resolve("../supabase_reclamos_implementation/node_modules/@supabase/cli-windows-x64/bin/supabase.exe");
  const result = cp.spawnSync(executable,args,{encoding:"utf8",timeout:60000,windowsHide:true});
  if (result.status !== 0) throw Error("La operación CLI no pudo completarse.");
  return JSON.parse(result.stdout);
}
export function backendSession() {
  const env = publicEnvironment(); const parsed = cli(["projects","api-keys","--reveal","--output","json"]); const keys = Array.isArray(parsed) ? parsed : parsed.api_keys;
  const key = (keys.find((k) => k.type === "secret") ?? keys.find((k) => k.name === "service_role"))?.api_key;
  if (!key) throw Error("Credencial de servicio no disponible.");
  return { url:env.NEXT_PUBLIC_SUPABASE_URL, key, client:createClient(env.NEXT_PUBLIC_SUPABASE_URL,key,{auth:{autoRefreshToken:false,persistSession:false}}) };
}
