import type { PdfWordEvidence } from "./pdf-document-evidence";
export function planPdfTableDetail(words:PdfWordEvidence[], width:number, height:number) {
  const groups=new Map<string,PdfWordEvidence[]>();
  for(const word of words){const key=word.line.split(":").slice(0,2).join(":");const list=groups.get(key)??[];list.push(word);groups.set(key,list);}
  const blocks=[...groups].map(([id,items])=>({id,text:items.map(w=>w.text).join(" "),x:Math.min(...items.map(w=>w.box[0])),y:Math.min(...items.map(w=>w.box[1])),right:Math.max(...items.map(w=>w.box[0]+w.box[2])),bottom:Math.max(...items.map(w=>w.box[1]+w.box[3]))}));
  const candidates=blocks.filter(b=>new Set(b.text.match(/Objektart|Wohnfläche|Grundstück|Zimmer|Badezimmer|Baujahr|Heizung|Energieeffizienzklasse/giu)?.map(s=>s.toLowerCase())??[]).size>=4);
  const table=candidates.sort((a,b)=>(a.right-a.x)-(b.right-b.x))[0];
  if(!table)return null;
  let bottom=table.bottom;
  for(let i=0;i<3;i++)for(const b of blocks)if(b.x>=table.x-10&&b.right<=table.right+10&&b.y>=table.y&&b.y-bottom<25)bottom=Math.max(bottom,b.bottom);
  const left=Math.max(0,Math.floor(table.x-8)),top=Math.max(0,Math.floor(table.y-8)),right=Math.min(width,Math.ceil(table.right+8)),end=Math.min(height,Math.ceil(bottom+8));
  if(right-left<40||end-top<40||(right-left)*(end-top)>width*height*0.4)return null;
  return {left,top,width:right-left,height:end-top};
}
