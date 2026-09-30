/* ==========================================================================
   Exportação em CSV
   --------------------------------------------------------------------------
   Coordenação e diretoria pedem arquivo. CSV com BOM UTF-8 e separador `;`
   abre direto no Excel em português, com colunas separadas e acento intacto na
   primeira abertura. Copiado do `lib/exporters.ts` do Sucesso ao Aluno.
   ========================================================================== */

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: (string | number | boolean | null)[][]): string {
  const lines = [headers.map(csvCell).join(';'), ...rows.map((r) => r.map(csvCell).join(';'))];
  // UTF-8 BOM keeps acentuação intact when Excel opens the file directly.
  return `﻿${lines.join('\r\n')}`;
}

export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `20260929-1432` — sufixo de nome de arquivo, ordenável. */
export function fileStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
