import { extractPdfStructuredFacts } from "./pdf-structured-facts";
import { collectExposeCoreFacts } from "./expose-core-fact-conflicts";
import { analysePdfDocument } from "./pdf-document-analysis.server";
export type PdfDocumentFacts = { rooms:number|null; evidence:string|null; documentText:string; documentAnalysis:Awaited<ReturnType<typeof analysePdfDocument>>; structuredFacts:ReturnType<typeof extractPdfStructuredFacts> };
export async function extractPdfDocumentFacts(pdfBuffer:Buffer):Promise<PdfDocumentFacts> {
  const documentAnalysis=await analysePdfDocument(pdfBuffer);
  const facts=collectExposeCoreFacts(documentAnalysis.documentText);
  const structuredFacts=extractPdfStructuredFacts(documentAnalysis.pages);
  if(structuredFacts.requiresReview){documentAnalysis.requiresReview=true;documentAnalysis.issues.push(...structuredFacts.issues.filter(issue=>!documentAnalysis.issues.includes(issue)));}
  const rooms=documentAnalysis.pages.some(page=>page.method==="local_ocr") ? typeof structuredFacts.values.rooms==="number" ? structuredFacts.values.rooms : null : facts.values.rooms ? Number(facts.values.rooms):null;
  return {structuredFacts,rooms,evidence:rooms!==null?"Zimmerzahl: "+rooms:null,documentText:documentAnalysis.documentText,documentAnalysis};
}
export function pdfDocumentReviewError(analysis: Awaited<ReturnType<typeof analysePdfDocument>>) {
  return Object.assign(new Error("Die PDF-Quellen benötigen eine manuelle Prüfung; eine automatische Freigabe ist gesperrt."), {
    code:"PDF_DOCUMENT_REVIEW_REQUIRED",status:422,documentAnalysis:analysis,
    structuredFacts:extractPdfStructuredFacts(analysis.pages),
    sourceEvidence: { sale:collectExposeCoreFacts(analysis.documentText),rent:collectExposeCoreFacts(analysis.documentText,"rent") },
  });
}
