import { analysePdfTableDetail } from "./pdf-local-detail.server";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { recognisePdfPageLocally } from "./pdf-local-ocr.server";
import { hasMeaningfulPdfText, pdfDocumentImageIndices, pdfWordsToText, summarisePdfEvidence, type PdfPageEvidence, type PdfWordEvidence } from "./pdf-document-evidence";
type Ocr = (png:Buffer,width:number,height:number) => Promise<PdfWordEvidence[]>;
export async function analysePdfDocument(bytes: Buffer, options: { ocr?: Ocr } = {}) {
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new Error("PDF_DOCUMENT_SIZE_LIMIT");
  await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data:new Uint8Array(bytes), useSystemFonts:false,
    // Same asset directory as the PDF candidate extractor. PDF.js NodeBinaryDataFactory
    // passes this string to fs.readFile, so use a filesystem path, not a file:// URI.
    wasmUrl: join(process.cwd(), "node_modules", "pdfjs-dist", "wasm").replaceAll("\\", "/") + "/",
  });
  const pages: PdfPageEvidence[] = [];
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 30) throw new Error("PDF_DOCUMENT_PAGE_LIMIT_REVIEW_REQUIRED");
    for (let pageNumber=1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale:1 });
        const content = await page.getTextContent();
        const words: PdfWordEvidence[] = []; let nativeText = "";
        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) continue;
          nativeText += item.str + (item.hasEOL ? "\n" : " ");
          const [x,y] = viewport.convertToViewportPoint(item.transform[4],item.transform[5]);
          words.push({text:item.str,confidence:null,box:[x,y-item.height,item.width,item.height],line:String(item.transform[5])});
        }
        const operators = await page.getOperatorList();
        const hasImages = operators.fnArray.some(op => [pdfjs.OPS.paintImageXObject,pdfjs.OPS.paintInlineImageXObject,pdfjs.OPS.paintImageMaskXObject].includes(op));
        const coveringImage = pdfDocumentImageIndices(operators,pdfjs.OPS,viewport.width*viewport.height).size > 0;
        const entry:PdfPageEvidence={pageNumber,width:viewport.width,height:viewport.height,nativeText:nativeText.trim(),text:nativeText.trim(),hasImages,coveringImage,method:"native",words,issues:[]};
        if (!hasMeaningfulPdfText(nativeText) || coveringImage) {
          entry.method="unavailable"; entry.issues.push("PDF_PAGE_REQUIRES_REVIEW");
          try {
            if (!options.ocr && !process.env.IA_LOCAL_TESSERACT_PATH) throw new Error("PDF_LOCAL_OCR_UNAVAILABLE");
            const view=page.getViewport({scale:2.5});
            const width=Math.ceil(view.width),height=Math.ceil(view.height);
            if(width*height>12_000_000) throw new Error("PDF_PAGE_PIXEL_LIMIT");
            const canvas=createCanvas(width,height);
            await page.render({canvas:canvas as never,canvasContext:canvas.getContext("2d") as never,viewport:view}).promise;
            const png=await canvas.encode("png");
            const recognised=await (options.ocr ?? recognisePdfPageLocally)(png,width,height);
            entry.text=pdfWordsToText(recognised); entry.method="local_ocr";
            entry.issues.push("PDF_OCR_UNVERIFIED");
            if (!hasMeaningfulPdfText(entry.text)) entry.issues.push("PDF_OCR_TEXT_INCOMPLETE");
            if (recognised.some(w => w.confidence === null || w.confidence < 0.9)) entry.issues.push("PDF_OCR_LOW_CONFIDENCE");
            if(!options.ocr) {
              try {
                const details=await analysePdfTableDetail(png,width,height,recognised);
                entry.detailRegions=details.map(detail=>({...detail,region:{left:detail.region.left/2.5,top:detail.region.top/2.5,width:detail.region.width/2.5,height:detail.region.height/2.5},words:detail.words.map(w=>({...w,box:w.box.map(v=>v/2.5) as [number,number,number,number]}))}));
              } catch { entry.issues.push("PDF_OCR_DETAIL_FAILED"); }
            }
            // Store all boxes in page points; the ocr: line prefix records their provenance.
            entry.words=words.concat(recognised.map(w=>({...w,box:w.box.map(v=>v/2.5) as [number,number,number,number],line:"ocr:"+w.line})));
          } catch(error) {
            const message=error instanceof Error ? error.message : "";
            entry.issues.push(message==="PDF_LOCAL_OCR_UNAVAILABLE" ? message : "PDF_OCR_EXTRACTION_FAILED");
          }
        }
        pages.push(entry);
      } finally { page.cleanup(); }
    }
    return summarisePdfEvidence(pages);
  } finally { await task.destroy(); }
}
