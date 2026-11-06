import fs from "node:fs";
import { backendSession, publicEnvironment, cli } from "./backend-session.mjs";
const env = publicEnvironment();
const checks = [];
const cases = [
  ["portal-ciudadano",{accion:"catalogos"},200],
  ["portal-ciudadano",{accion:"registrar"},403],
  ["portal-ciudadano",{accion:"consultar"},403],
  ["portal-ciudadano",{accion:"subsanar"},403],
  ["anexos",{accion:"descargar-personal"},401],
  ["enviar-notificaciones",{},401],
  ["crear-personal",{},401],
];
for (const [name,body,expected] of cases) {
  const response = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/" + name,{method:"POST",headers:{apikey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const data = await response.json();
  checks.push({ endpoint:name, action:body.accion ?? "empty",status:response.status,expected,pass:response.status === expected,catalogsValid:name==="portal-ciudadano" && body.accion==="catalogos" ? Array.isArray(data.data?.areas) && Array.isArray(data.data?.categorias) : undefined });
}
const wrong = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/portal-ciudadano",{method:"OPTIONS",headers:{Origin:"https://invalid.example"},signal:AbortSignal.timeout(15000)});
checks.push({check:"CORS rejects foreign origin",status:wrong.status,pass:wrong.status===403});
const session = backendSession();
const response = await fetch(session.url + "/functions/v1/enviar-notificaciones",{method:"POST",headers:{apikey:session.key,"Content-Type":"application/json"},body:JSON.stringify({accion:"verificar-configuracion"}),signal:AbortSignal.timeout(15000)});
const worker = await response.json();
const metadata = cli(["db","query","--remote","--read-only","--output","json","select jsonb_build_object('persistent_test_profiles',(select count(*) from public.perfiles where email like 'rollback-%@example.invalid'),'active_admins',(select count(*) from public.perfiles where activo and rol='administrador'),'public_bucket',(select public from storage.buckets where id='anexos-reclamos'),'sms_enabled',(select valor from public.parametros where clave='sms_habilitado')) as verification"]);
const result = {checks,notificationConfiguration:{status:response.status,configured:worker.configured,verified:worker.verified},database:metadata.rows[0].verification};
fs.mkdirSync(".verification",{recursive:true});fs.writeFileSync(".verification/check-backend.json",JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
if(checks.some((c)=>!c.pass) || result.database.persistent_test_profiles!==0 || result.database.public_bucket || result.database.sms_enabled) process.exitCode=1;
