// lib/exportDocx.ts
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, PageBreak,
} from 'docx';

interface ExportPage {
  content: string;
  title: string;
}

function parseColor(colorStr: string): string | undefined {
  if (!colorStr) return undefined;
  if (colorStr.startsWith('#')) return colorStr.substring(1).replace(/;/g, '');
  const rgbMatch = colorStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `${r}${g}${b}`;
  }
  return undefined;
}

function parseSize(sizeStr: string): number | undefined {
  if (!sizeStr) return undefined;
  const match = sizeStr.match(/(\d+(?:\.\d+)?)pt/);
  if (match) return Math.round(parseFloat(match[1]) * 2); 
  const pxMatch = sizeStr.match(/(\d+(?:\.\d+)?)px/);
  if (pxMatch) return Math.round((parseFloat(pxMatch[1]) * 0.75) * 2); 
  return undefined; 
}

function getFontFamily(fontStr: string): string | undefined {
  if (!fontStr) return undefined;
  const parts = fontStr.split(',');
  let family = parts[0].replace(/['"]/g, '').trim();
  if (family.toLowerCase() === 'times new roman') return 'Times New Roman';
  if (family.toLowerCase() === 'arial') return 'Arial';
  if (family.toLowerCase() === 'courier new') return 'Courier New';
  if (family.toLowerCase() === 'georgia') return 'Georgia';
  if (family.toLowerCase() === 'verdana') return 'Verdana';
  return family;
}

function htmlToParagraphs(html: string, globalFont: string, globalSize: number): Paragraph[] {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  const paragraphs: Paragraph[] = [];

  const nodeToTextRuns = (node: Node, parentStyles: any): TextRun[] => {
    const runs: TextRun[] = [];

    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.replace(/\n/g, ' ') || '';
        if (text) {
          runs.push(new TextRun({
            text,
            bold: parentStyles.bold,
            italics: parentStyles.italics,
            underline: parentStyles.underline ? {} : undefined,
            strike: parentStyles.strike,
            font: parentStyles.font || globalFont,
            size: parentStyles.size || (globalSize * 2), // DOCX needs half-points
            color: parentStyles.color,
          }));
        }
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (tag === 'BR') {
        runs.push(new TextRun({ break: 1 }));
        return;
      }

      // Compute combined styles
      const elFont = getFontFamily(el.style.fontFamily) || parentStyles.font;
      const elSize = parseSize(el.style.fontSize) || parentStyles.size;
      const elColor = parseColor(el.style.color) || parentStyles.color;

      const isBold = tag === 'B' || tag === 'STRONG' || el.style.fontWeight === 'bold' || el.style.fontWeight === '700' || parentStyles.bold;
      const isItalic = tag === 'I' || tag === 'EM' || el.style.fontStyle === 'italic' || parentStyles.italics;
      const isUnderline = tag === 'U' || el.style.textDecoration === 'underline' || parentStyles.underline;
      const isStrike = tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || parentStyles.strike;

      const currentStyles = {
        font: elFont, size: elSize, color: elColor,
        bold: isBold, italics: isItalic, underline: isUnderline, strike: isStrike
      };

      runs.push(...nodeToTextRuns(el, currentStyles));
    });

    return runs;
  };

  const processNode = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    if (['H1', 'H2', 'H3', 'H4'].includes(tag)) {
      // Check alignment (e.g. text-align: center for Title Page)
      const style = el.getAttribute('style') || '';
      let align: any = AlignmentType.LEFT;
      if (style.includes('center') || el.style.textAlign === 'center') align = AlignmentType.CENTER;
      else if (style.includes('right') || el.style.textAlign === 'right') align = AlignmentType.RIGHT;
      else if (style.includes('justify') || el.style.textAlign === 'justify') align = AlignmentType.JUSTIFIED;

      // Check margins (e.g. margin-top: 120px in Title Page)
      const mtMatch = style.match(/margin-top:\s*(\d+)px/);
      const mt = mtMatch ? parseInt(mtMatch[1]) : 0;
      const spacing: any = {};
      if (mt) spacing.before = mt * 20; // Word twips (20 twips = 1px approx)
      
      let baseSize = globalSize * 2;
      if (tag === 'H1') baseSize = 36; // 18pt
      if (tag === 'H2') baseSize = 32; // 16pt
      if (tag === 'H3') baseSize = 28; // 14pt
      if (tag === 'H4') baseSize = 24; // 12pt

      const currentStyles = {
        font: getFontFamily(el.style.fontFamily) || globalFont,
        size: baseSize,
        bold: true,
        color: parseColor(el.style.color) || '000000',
      };

      const runs = nodeToTextRuns(el, currentStyles);
      paragraphs.push(new Paragraph({
        children: runs,
        alignment: align,
        spacing: Object.keys(spacing).length > 0 ? spacing : undefined,
      }));
      return;
    }

    if (['P', 'DIV', 'LI'].includes(tag)) {
      const style = el.getAttribute('style') || '';
      let align: any = AlignmentType.LEFT;
      if (style.includes('center') || el.style.textAlign === 'center') align = AlignmentType.CENTER;
      else if (style.includes('right') || el.style.textAlign === 'right') align = AlignmentType.RIGHT;
      else if (style.includes('justify') || el.style.textAlign === 'justify') align = AlignmentType.JUSTIFIED;

      const runs = nodeToTextRuns(el, { font: globalFont, size: globalSize * 2, color: '000000' });
      if (runs.length > 0) {
        paragraphs.push(new Paragraph({ children: runs, alignment: align }));
      } else if (tag === 'P') {
        // empty paragraph spacing
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
      }
      return;
    }

    if (['UL', 'OL'].includes(tag)) {
      el.querySelectorAll('li').forEach((li) => {
        const runs = nodeToTextRuns(li, { font: globalFont, size: globalSize * 2, color: '000000' });
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: '• ' }), ...runs],
        }));
      });
      return;
    }

    el.childNodes.forEach(processNode);
  };

  wrapper.childNodes.forEach(processNode);
  return paragraphs;
}

export async function exportToDocxFormat(pages: ExportPage[], documentName: string, globalFont: string = 'Times New Roman', globalSize: number = 12): Promise<void> {
  const filename = sanitizeName(documentName);
  const allSections = pages.map((page, idx) => {
    const paras = htmlToParagraphs(page.content, globalFont, globalSize);
    if (idx > 0) paras.unshift(new Paragraph({ children: [new PageBreak()] }));
    return paras;
  }).flat();

  const doc = new Document({ sections: [{ properties: {}, children: allSections }] });
  const buffer = await Packer.toBlob(doc);
  triggerDownload(buffer, `${filename}.docx`);
}

export function exportToPDF(pages: ExportPage[], documentName: string, globalFont: string = 'Times New Roman', globalSize: number = 12): void {
  const combinedHtml = pages.map((page, idx) =>
    `<div class="page${idx < pages.length - 1 ? ' page-break' : ''}">${page.content}</div>`
  ).join('\n');

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <style id="pdf-styles">
      body { font-family: '${globalFont}', serif; font-size: ${globalSize}pt; color: #000; line-height: 1.6; background-color: #ffffff; }
      h1 { font-size: 18pt; font-weight: bold; margin: 16pt 0 8pt; text-align: left; }
      h2 { font-size: 16pt; font-weight: bold; margin: 14pt 0 6pt; text-align: left; }
      h3 { font-size: 14pt; font-weight: bold; margin: 12pt 0 4pt; color: #333333; text-align: left; }
      h4 { font-size: 12pt; font-weight: bold; margin: 10pt 0 4pt; text-align: left; }
      p  { margin: 0 0 10pt; text-align: justify; }
      table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
      td, th { border: 1px solid #000000; padding: 5pt 7pt; }
      ul, ol { margin: 0 0 10pt; padding-left: 20pt; }
      .page-break { page-break-after: always; }
      .pdf-container { padding: 0.5in; background-color: #ffffff; width: 8.5in; box-sizing: border-box; }
    </style>
    <div class="pdf-container" id="pdf-root">
      ${combinedHtml}
    </div>
  `;

  document.body.appendChild(wrapper);

  const opt: any = {
    margin:       [0.5, 0.5, 0.5, 0.5],
    filename:     `${documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      logging: false, 
      backgroundColor: '#ffffff',
      onclone: (clonedDoc: any) => {
        // STRIP ALL EXTERNAL STYLES: This flawlessly prevents html2canvas from crashing 
        // when parsing Tailwind v4's modern CSS variables (like lab() or oklch()).
        const styles = clonedDoc.querySelectorAll('style:not(#pdf-styles), link[rel="stylesheet"]');
        styles.forEach((s: any) => s.remove());
      }
    },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  const element = document.getElementById('pdf-root');
  import('html2pdf.js').then((module) => {
    const html2pdf = module.default || module;
    html2pdf().set(opt).from(element as HTMLElement).save().then(() => {
      document.body.removeChild(wrapper);
    });
  });
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-z0-9_\-\s]/gi, '').replace(/\s+/g, '_').toLowerCase() || 'document';
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