import test from "node:test";
import assert from "node:assert/strict";
import { limaDate, formatDate } from "../src/lib/dates.ts";
import { validateFiles } from "../src/lib/validation/files.ts";
import { csvCell, csvDocument } from "../src/lib/csv.ts";
const limits = { max_anexos: 5, max_anexo_bytes: 5242880, formatos: ["pdf","jpg","jpeg","png"] };
test("la fecha institucional conserva el día de Lima antes de medianoche", () => {
  assert.equal(limaDate(new Date("2026-11-06T04:59:59Z")), "2026-11-05");
  assert.equal(limaDate(new Date("2026-11-06T05:00:00Z")), "2026-11-06");
  assert.equal(formatDate("2026-11-05"), "05/11/2026");
  assert.equal(formatDate("2026-11-05 23:59"), "05/11/2026 · 23:59");
  assert.equal(formatDate("invalid"), "—");
});
test("archivos: límites exactos, vacíos, exceso y MIME discordante", () => {
  assert.equal(validateFiles([{name:"prueba.PDF",type:"application/pdf",size:5242880}],limits),null);
  for (const file of [{name:"a.pdf",type:"application/pdf",size:0},{name:"a.pdf",type:"application/pdf",size:5242881},{name:"a.jpg",type:"application/pdf",size:100},{name:"a.exe",type:"image/png",size:100}]) assert.ok(validateFiles([file],limits));
  assert.ok(validateFiles(Array.from({length:6},()=>({name:"a.png",type:"image/png",size:100})),limits));
});
test("CSV neutraliza fórmulas y preserva comillas, separadores y valores numéricos", () => {
  assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell(-5),'"-5"'); assert.equal(csvCell("+SUM(A1)"),'"\' +SUM(A1)"'.replace("' ","'"));
  assert.equal(csvCell('a;"b"'),'"a;""b"""');
  assert.ok(csvDocument(["Nombre"],[["á"]]).startsWith("\uFEFF"));
  assert.equal(csvCell(null),'""');
});
