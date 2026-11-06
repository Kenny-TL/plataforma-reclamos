import { adminClient } from "../_shared/supabase.ts";
import { corsHeaders, json, serve, requiredEnv } from "../_shared/http.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) return json({ error: "Sesión requerida" }, 401);

    const admin = adminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !authData.user) return json({ error: "Sesión no válida" }, 401);
    const { data: profile, error: profileError } = await admin.from("perfiles")
      .select("rol,activo").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile || profile.rol !== "administrador" || profile.activo !== true) {
      return json({ error: "Solo un administrador activo puede dar de alta personal" }, 403);
    }

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (body.accion && !["invitar", "recuperar"].includes(body.accion)) return json({ error: "Acción no válida." }, 400);
    const redirectTo = requiredEnv("CORS_ALLOWED_ORIGIN").split(",")[0].trim() + "/auth/establecer-clave";
    if (body.accion === "recuperar") {
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Correo no válido." }, 400);
      const { data: target } = await admin.from("perfiles").select("id").eq("email", email).maybeSingle();
      if (!target) return json({ error: "Perfil no encontrado." }, 404);
      const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return json({ error: "No se pudo enviar el enlace de recuperación." }, 400);
      await admin.from("auditoria").insert({ tabla: "perfiles", registro_id: target.id, operacion: "RECOVERY", accion: "solicitar_recuperacion", usuario_id: authData.user.id, rol: "administrador" });
      return json({ ok: true, mensaje: "Recuperación solicitada. No modifica permisos ni activa la cuenta." });
    }
    const nombres = String(body.nombres ?? "").trim();
    const apellidos = String(body.apellidos ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || !nombres || !apellidos) {
      return json({ error: "Correo, nombres y apellidos son obligatorios" }, 400);
    }
    // El trigger on_auth_user_created crea el perfil inactivo, rol mesa_partes y sin área.
    // Nunca se acepta rol/área desde el navegador en este endpoint.
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nombres, apellidos },
      redirectTo,
    });
    if (error) {
      const authCode = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
      const message = String(error.message ?? "");
      if (authCode === "over_email_send_rate_limit" || /email rate limit exceeded/i.test(message)) {
        return json({
          error: "Supabase Auth alcanzó el límite de correos. Espera y vuelve a intentarlo, o configura SMTP personalizado en Authentication > SMTP.",
          code: "over_email_send_rate_limit",
        }, 429);
      }
      if (authCode === "email_address_not_authorized") {
        return json({ error: "El proveedor de correo de Supabase no permite enviar a esta dirección. Configura SMTP personalizado para producción.", code: authCode }, 400);
      }
      return json({ error: message }, 400);
    }
    if (data.user?.id) await admin.from("auditoria").insert({ tabla: "perfiles", registro_id: data.user.id, operacion: "INVITE", accion: "invitar_personal", usuario_id: authData.user.id, rol: "administrador" });
    return json({
      ok: true,
      mensaje: "Invitación enviada. El perfil nace inactivo; el administrador debe asignar rol/área y activarlo.",
      user_id: data.user?.id,
      email: data.user?.email,
      perfil_inicial: { rol: "mesa_partes", activo: false, area_id: null },
    }, 201);
  } catch (error) {
    console.error("crear-personal:", error instanceof Error ? error.name : "Error");
    return json({ error: "No se pudo enviar la invitación." }, 500);
  }
});
