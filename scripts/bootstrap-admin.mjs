/* Uso explícito de una sola cuenta real; nunca escribe claves o contraseñas. */
import fs from "node:fs";
import path from "node:path";
import cp from "node:child_process";
import { createClient } from "@supabase/supabase-js";
const arg = (key) => process.argv[process.argv.indexOf(key) + 1];
async function main() {
  const email = arg("--email"), nombres = arg("--nombres"), apellidos = arg("--apellidos");
  if (!process.argv.includes("--email") || !/^\S+@\S+\.\S+$/.test(email) || !nombres || !apellidos) throw Error("Faltan email, nombres y apellidos explícitos.");
  const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((x) => /^\w+=/.test(x)).map((x) => { const i=x.indexOf("="); return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]; }));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const ref = fs.readFileSync("supabase/.temp/project-ref", "utf8").trim();
  if (new URL(url).hostname.split(".")[0] !== ref) throw Error("El proyecto enlazado no coincide con el frontend.");
  const cli = path.resolve("../supabase_reclamos_implementation/node_modules/@supabase/cli-windows-x64/bin/supabase.exe");
  const result = cp.spawnSync(cli, ["projects","api-keys","--reveal","--output","json"], { encoding:"utf8", timeout:30000, windowsHide:true });
  if (result.status !== 0) throw Error("No se pudieron recuperar credenciales de administración de la sesión CLI.");
  const parsed = JSON.parse(result.stdout); const keys = Array.isArray(parsed) ? parsed : parsed.api_keys;
  const service = keys.find((k) => k.name === "service_role") ?? keys.find((k) => k.type === "secret");
  if (!service?.api_key) throw Error("No hay clave de servicio disponible.");
  const client = createClient(url, service.api_key, { auth: { autoRefreshToken:false, persistSession:false } });
  const { count, error: countError } = await client.from("perfiles").select("id", { count:"exact",head:true }).eq("rol","administrador").eq("activo",true);
  if (countError) throw Error("No se pudo comprobar el estado del personal.");
  if (count > 0) { console.log(JSON.stringify({ status:"already_bootstrapped",invitationSent:false })); return; }
  const { data, error } = await client.auth.admin.inviteUserByEmail(email, { data:{ nombres,apellidos }, redirectTo:"http://localhost:3000/auth/establecer-clave" });
  if (error || !data.user) { console.log(JSON.stringify({ status:"invitation_failed",code:error?.code,httpStatus:error?.status })); process.exitCode=1; return; }
  const { error: updateError } = await client.from("perfiles").update({ nombres,apellidos,rol:"administrador",activo:true }).eq("id",data.user.id).eq("activo",false);
  if (updateError) throw Error("Invitación enviada; falta activar el perfil administrador.");
  console.log(JSON.stringify({ status:"administrator_invited",invitationSent:true,profileActive:true,passwordStored:false }));
}
main().catch(() => { console.error("No se pudo completar el alta inicial. No se mostraron credenciales."); process.exitCode=1; });
