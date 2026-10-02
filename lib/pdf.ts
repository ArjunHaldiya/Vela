"use client";
// Browser-side PDF reading: the models only accept text and images, so a PDF becomes
// its text layer (exact, for digital PDFs) or page images (for scanned PDFs).

export type PdfContent = { text: string } | { images: { data: string; mimeType: string }[] };

const MIN_TEXT_CHARS = 40; // less than this means the PDF is a scan with no real text layer

export async function readPdf(file: File, maxPages = 5): Promise<PdfContent> {
  const pdfjs = await import("pdfjs-dist");
  // Served from public/ (copied from node_modules by the predev/prebuild scripts); bundling it breaks Terser.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const n = Math.min(doc.numPages, maxPages);

  const pages: string[] = [];
  for (let i = 1; i <= n; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    let line = "", lines: string[] = [];
    for (const it of tc.items as any[]) {
      line += it.str;
      if (it.hasEOL) { lines.push(line); line = ""; }
    }
    if (line) lines.push(line);
    pages.push(lines.join("\n"));
  }
  const text = pages.join("\n\n").trim();
  if (text.replace(/\s/g, "").length >= MIN_TEXT_CHARS) return { text };

  const images: { data: string; mimeType: string }[] = [];
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2.5, 1600 / Math.max(base.width, base.height)) });
    const c = document.createElement("canvas");
    c.width = Math.round(viewport.width); c.height = Math.round(viewport.height);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push({ data: c.toDataURL("image/jpeg", 0.85).split(",")[1], mimeType: "image/jpeg" });
  }
  return { images };
}
