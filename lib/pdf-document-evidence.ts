export type PdfWordEvidence = { text: string; confidence: number | null; box: [number, number, number, number]; line: string };
export type PdfPageEvidence = { pageNumber: number; width: number; height: number; nativeText: string; text: string; hasImages: boolean; coveringImage: boolean; method: "native" | "local_ocr" | "unavailable"; words: PdfWordEvidence[]; issues: string[]; detailRegions?: { kind:"table"; region:{left:number;top:number;width:number;height:number}; words:PdfWordEvidence[]; text:string }[] };
export function hasMeaningfulPdfText(text: string) {
  return text.trim().length >= 40 && (text.match(/\p{L}+/gu)?.length ?? 0) >= 5;
}
type PdfOperators = { fnArray:number[]; argsArray:unknown[] };
type PdfOps = { save:number; restore:number; transform:number; paintImageXObject:number; paintInlineImageXObject:number };
// Conservative placement analysis: dimensions alone never identify document images.
export function pdfDocumentImageIndices(operators:PdfOperators, ops:PdfOps, pageArea:number) {
  let matrix=[1,0,0,1,0,0]; const stack:number[][]=[]; const areas=new Map<number,number>();
  for(let i=0;i<operators.fnArray.length;i++) {
    const op=operators.fnArray[i],args=operators.argsArray[i];
    if(op===ops.save) stack.push([...matrix]);
    else if(op===ops.restore) matrix=stack.pop() ?? [1,0,0,1,0,0];
    else if(op===ops.transform && Array.isArray(args) && args.length===6 && args.every(v=>typeof v==="number" && Number.isFinite(v))) {
      const [a,b,c,d,e,f]=matrix,[g,h,j,k,l,m]=args;
      matrix=[a*g+c*h,b*g+d*h,a*j+c*k,b*j+d*k,a*l+c*m+e,b*l+d*m+f];
    } else if(op===ops.paintImageXObject || op===ops.paintInlineImageXObject) areas.set(i,Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2]));
  }
  // Aggregate also catches tiled scan pages; overlap can conservatively require review.
  const coverage=[...areas.values()].reduce((sum,value)=>sum+value,0)/pageArea;
  return new Set(coverage >= 0.55 ? areas.keys() : []);
}
export function parseTesseractTsv(tsv: string, width: number, height: number): PdfWordEvidence[] {
  const rows = tsv.replace(/^\uFEFF/, "").trimEnd().split(/\r?\n/);
  if (rows.shift() !== "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext") throw new Error("PDF_OCR_TSV_INVALID");
  const words: PdfWordEvidence[] = [];
  for (const row of rows) {
    const c = row.split("\t");
    if (c[0] !== "5") continue;
    if (c.length !== 12) throw new Error("PDF_OCR_TSV_INVALID");
    const box = c.slice(6,10).map(Number); const confidence = Number(c[10]);
    if (!c[11].trim()) continue;
    if (!box.every(Number.isFinite) || !Number.isFinite(confidence) || confidence < 0 || confidence > 100 || box[0] < 0 || box[1] < 0 || box[2] <= 0 || box[3] <= 0 || box[0]+box[2] > width+1 || box[1]+box[3] > height+1) throw new Error("PDF_OCR_TSV_INVALID");
    words.push({ text:c[11], confidence:confidence / 100, box:box as [number,number,number,number], line:c.slice(1,5).join(":") });
    if (words.length > 15000) throw new Error("PDF_OCR_WORD_LIMIT");
  }
  return words;
}
export function pdfWordsToText(words: PdfWordEvidence[]) {
  let line = ""; let text = "";
  for (const word of words) { text += text ? (line === word.line ? " " : "\n") : ""; text += word.text; line = word.line; }
  return text;
}
export function summarisePdfEvidence(pages: PdfPageEvidence[]) {
  const needsOcr = pages.filter(p => p.method !== "native");
  const hasNative = pages.some(p => hasMeaningfulPdfText(p.nativeText));
  const type = !hasNative && pages.every(p => p.hasImages) ? "image_based" : pages.some(p => p.hasImages) || needsOcr.length ? "mixed" : "machine_readable";
  return { version:"PDF_OCR_INTELLIGENCE_V1" as const, coordinateSystem:"page_viewport_points" as const, tableInterpretation:"layout_only_unverified" as const, type, scanCandidate: type === "image_based", multiPage:pages.length > 1, pageCount:pages.length, textPageCount:pages.filter(p => !!p.text.trim()).length,
    requiresReview:needsOcr.length > 0 || pages.some(p => p.issues.length > 0),
    issues:[...new Set(pages.flatMap(p => p.issues))], pages,
    documentText:pages.map(p => "[PAGE " + p.pageNumber + "][" + p.method + "]\n" + p.nativeText + (p.method === "local_ocr" ? "\n[OCR CANDIDATE]\n" + p.text : "") + (p.detailRegions ?? []).map(detail => "\n[DETAIL table]\n" + detail.text).join("")).join("\n\n") };
}
