// lib/exportDocx.ts

export async function exportToDocx(htmlContent: string, documentName: string): Promise<void> {
  const filename = documentName.replace(/[^a-z0-9_\-\s]/gi, '').replace(/\s+/g, '_').toLowerCase() || 'document';

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(documentName)}</title>
<style>
  body{font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.6;margin:1in;color:#000}
  h1{font-size:18pt;font-weight:bold;margin:16pt 0 8pt}h2{font-size:16pt;font-weight:bold;margin:14pt 0 6pt}
  h3{font-size:14pt;font-weight:bold;margin:12pt 0 4pt}h4{font-size:12pt;font-weight:bold;margin:10pt 0 4pt}
  p{margin:0 0 10pt}table{border-collapse:collapse;width:100%;margin:10pt 0}
  td,th{border:1px solid #000;padding:5pt 7pt}ul,ol{margin:0 0 10pt;padding-left:20pt}
</style></head><body>${htmlContent}</body></html>`;

  try {
    // Try html-docx-js (must be installed: npm install html-docx-js)
    const htmlDocx = await import('html-docx-js/dist/html-docx').catch(() => null);
    if (htmlDocx?.default?.asBlob) {
      const blob: Blob = htmlDocx.default.asBlob(fullHtml);
      triggerDownload(blob, `${filename}.docx`);
      return;
    }
  } catch {
    // fall through
  }

  // Fallback: Word-compatible HTML blob
  const blob = new Blob([fullHtml], { type: 'application/msword' });
  triggerDownload(blob, `${filename}.doc`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
