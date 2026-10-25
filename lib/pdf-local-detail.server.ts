import sharp from "sharp";
import { recognisePdfPageLocally } from "./pdf-local-ocr.server";
import { planPdfTableDetail } from "./pdf-ocr-layout";
import { pdfWordsToText, type PdfWordEvidence } from "./pdf-document-evidence";
export async function analysePdfTableDetail(png:Buffer, width:number, height:number, words:PdfWordEvidence[]) {
  const region=planPdfTableDetail(words,width,height);if(!region)return [];
  // One bounded, evidence-selected table crop. Upsampling helps segmentation, not source resolution.
  if(region.width*region.height*4>8_000_000)return [];
  const crop=await sharp(png).extract(region).resize({width:region.width*2,kernel:"lanczos3"}).png().toBuffer();
  const recognised=await recognisePdfPageLocally(crop,region.width*2,region.height*2,{segmentation:6});
  return [{kind:"table" as const,region,words:recognised.map(w=>({...w,line:"detail:"+w.line,box:[region.left+w.box[0]/2,region.top+w.box[1]/2,w.box[2]/2,w.box[3]/2] as [number,number,number,number]})),text:pdfWordsToText(recognised)}];
}
