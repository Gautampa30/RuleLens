/**
 * generate_pdf.js — Phase 1 helper
 * Converts research_degrees_handbook_source.md → research_degrees_handbook.pdf
 * Uses: pdf-lib  (npm install pdf-lib)
 * Run from: corpus/
 *   node generate_pdf.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Install pdf-lib if not present
function ensureLib() {
  try { require.resolve('pdf-lib'); }
  catch {
    console.log('Installing pdf-lib...');
    execSync('npm install pdf-lib --no-save', { stdio: 'inherit', cwd: __dirname });
  }
}

ensureLib();

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function main() {
  const srcPath = path.join(__dirname, 'research_degrees_handbook_source.md');
  const outPath = path.join(__dirname, 'research_degrees_handbook.pdf');

  const mdText = fs.readFileSync(srcPath, 'utf-8');
  const lines = mdText.split(/\r?\n/);

  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await doc.embedFont(StandardFonts.Helvetica);

  const PAGE_W = 595;
  const PAGE_H = 842;
  const ML = 50, MR = 50, MT = 50, MB = 50;
  const contentW = PAGE_W - ML - MR;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MT;
  let pageNum = 1;

  function newPage() {
    // add page number to current page
    page.drawText(`${pageNum}`, {
      x: PAGE_W / 2 - 5, y: 20,
      size: 8, font: fontReg, color: rgb(0.5, 0.5, 0.5)
    });
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MT;
    pageNum++;
  }

  function ensureSpace(needed) {
    if (y - needed < MB) newPage();
  }

  function drawWrapped(text, font, size, color, indent = 0, lineGap = 2) {
    const maxW = contentW - indent;
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      const w = font.widthOfTextAtSize(test, size);
      if (w > maxW && currentLine) {
        ensureSpace(size + lineGap);
        page.drawText(currentLine, {
          x: ML + indent, y,
          size, font, color
        });
        y -= (size + lineGap);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) {
      ensureSpace(size + lineGap);
      page.drawText(currentLine, {
        x: ML + indent, y,
        size, font, color
      });
      y -= (size + lineGap);
    }
  }

  const BLACK   = rgb(0.1, 0.1, 0.1);
  const DARKBLUE = rgb(0.08, 0.16, 0.35);
  const MEDBLUE  = rgb(0.12, 0.24, 0.47);
  const LITBLUE  = rgb(0.20, 0.31, 0.55);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '') {
      y -= 5;
      continue;
    }

    if (line === '---') {
      ensureSpace(10);
      page.drawLine({
        start: { x: ML, y },
        end:   { x: PAGE_W - MR, y },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7)
      });
      y -= 8;
      continue;
    }

    // H1
    if (/^# (?!#)/.test(rawLine)) {
      const text = line.replace(/^# /, '');
      ensureSpace(22);
      y -= 4;
      drawWrapped(text, fontBold, 14, DARKBLUE);
      y -= 4;
      continue;
    }

    // H2
    if (/^## (?!#)/.test(rawLine)) {
      const text = line.replace(/^## /, '');
      ensureSpace(18);
      y -= 3;
      drawWrapped(text, fontBold, 12, MEDBLUE);
      y -= 3;
      continue;
    }

    // H3
    if (/^### /.test(rawLine)) {
      const text = line.replace(/^### /, '');
      ensureSpace(15);
      y -= 2;
      drawWrapped(text, fontBold, 10.5, LITBLUE);
      y -= 2;
      continue;
    }

    // Bullet
    if (/^- /.test(rawLine)) {
      const text = line.replace(/^- /, '');
      const clean = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1');
      drawWrapped('\u2022  ' + clean, fontReg, 9.5, BLACK, 10);
      y -= 2;
      continue;
    }

    // Table rows
    if (/^\|/.test(line)) {
      if (/^\|[-|]+\|$/.test(line)) { y -= 2; continue; }
      const cols = line.split('|').slice(1, -1).map(c => c.trim());
      const colText = cols.join('  |  ');
      const clean = colText.replace(/\*\*(.+?)\*\*/g, '$1');
      drawWrapped(clean, fontReg, 8.5, BLACK);
      y -= 1;
      continue;
    }

    // Bold-only line
    if (/^\*\*(.+)\*\*$/.test(line)) {
      const text = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      drawWrapped(text, fontBold, 9.5, BLACK);
      y -= 2;
      continue;
    }

    // body
    const clean = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1');
    drawWrapped(clean, fontReg, 9.5, BLACK);
    y -= 1;
  }

  // Final page number
  page.drawText(`${pageNum}`, {
    x: PAGE_W / 2 - 5, y: 20,
    size: 8, font: fontReg, color: rgb(0.5, 0.5, 0.5)
  });

  const bytes = await doc.save();
  fs.writeFileSync(outPath, bytes);
  const stats = fs.statSync(outPath);
  console.log(`PDF generated: ${outPath} (${(stats.size / 1024).toFixed(1)} KB, ${doc.getPageCount()} pages)`);
}

main().catch(err => { console.error(err); process.exit(1); });
