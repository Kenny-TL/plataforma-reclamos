export async function senderStatus() {
  const apiKey = Deno.env.get("RESEND_API_KEY"); const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "";
  const match = from.match(/(?:<)?[^\s<>@]+@([^\s<>]+)>?$/); const domain = match?.[1]?.replace(/>$/, "").toLowerCase();
  if (!apiKey || !domain) return { configured: false, verified: false };
  try {
    const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: "Bearer " + apiKey }, signal: AbortSignal.timeout(8000) });
    const data = await response.json();
    return { configured: true, verified: response.ok && Array.isArray(data.data) && data.data.some((d: { name: string; status: string }) => d.name.toLowerCase() === domain && d.status === "verified") };
  } catch { return { configured: true, verified: false }; }
}
