import { normalizeExposeNumber } from "./expose-core-fact-conflicts";
import type { PdfPageEvidence, PdfWordEvidence } from "./pdf-document-evidence";
import type { PropertyFact } from "./property-facts";
export type PdfFactEvidence={page:number;pass:string;line:string;text:string;box:[number,number,number,number];valueText:string;confidence:number|null};
export type PdfFactCandidate={field:string;value:string|number|boolean;unit?:string;evidence:PdfFactEvidence;unitValid:boolean};
export function extractPdfStructuredFacts(pages:PdfPageEvidence[]) {
 const candidates:PdfFactCandidate[]=[];
 const number=(s:string)=>{const n=normalizeExposeNumber(s);return n?Number(n):null;};
 for(const page of pages){
  const passes=[{id:page.method,words:page.words},...(page.detailRegions??[]).map((d,i)=>({id:"detail:"+i,words:d.words}))];
  for(const pass of passes){
   const rows:{line:string;words:PdfWordEvidence[];text:string;x:number;y:number}[]=[];
   for(const word of pass.words){let row=rows.at(-1);if(!row||row.line!==word.line){row={line:word.line,words:[],text:"",x:word.box[0],y:word.box[1]};rows.push(row);}row.words.push(word);row.text+=(row.text?" ":"")+word.text;}
   const contacts=rows.filter(r=>/Ansprechpartner|Kontaktperson|Maklerkontakt/iu.test(r.text));
   for(let i=0;i<rows.length;i++){
    const row=rows[i];if(contacts.some(c=>row.y>c.y&&row.x>=c.x-15))continue;
    const add=(field:string,value:string|number|boolean|null,valueText:string,unit?:string,unitValid=true)=>{
     if(value===null)return;
     const start=row.text.lastIndexOf(valueText),end=start+valueText.length;
     let pos=0;const tokens=row.words.filter(w=>{const a=pos,b=a+w.text.length;pos=b+1;return b>start&&a<end;});
     const conf=tokens.map(w=>w.confidence).filter((v):v is number=>v!==null);
     candidates.push({field,value,...(unit?{unit}:{}),unitValid,evidence:{page:page.pageNumber,pass:pass.id,line:row.line,text:row.text,box:[Math.min(...row.words.map(w=>w.box[0])),Math.min(...row.words.map(w=>w.box[1])),Math.max(...row.words.map(w=>w.box[0]+w.box[2])),Math.max(...row.words.map(w=>w.box[1]+w.box[3]))],valueText,confidence:conf.length?Math.min(...conf):null}});
    };
    let m:RegExpMatchArray|null;
    if((m=row.text.match(/^Objektart\s*:?\s+([\p{L} -]+)$/iu)))add("propertyType",m[1].trim(),m[1]);
    for(const [field,label]of [["rooms","Zimmer"],["bathrooms","Badezimmer"],["constructionYear","Baujahr"]] as const){
     m=row.text.match(new RegExp("^"+label+"\\s*:?\\s+(\\d+(?:[.,]\\d+)?)\\s*$","iu"));if(m)add(field,number(m[1]),m[1]);
    }
    // OCR 'm2' may be a misread exponent (7A); confidence alone cannot prove it.
    // Keep the original value/unit evidence. Never repair a unit or partial number.
    const areaNumber="(?:\\d{1,3}(?:[.'’ \\u00a0]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)";
    const addArea=(field:string,raw:string)=>{
     const match=raw.match(new RegExp("^("+areaNumber+")(?![\\d.,?*])\\s*(m²|m2|qm|m[^\\s,;)]*|ha|ft[^\\s,;)]*)?(?=$|[\\s.,;:)])","iu"));
     const unit=match?.[2];
     const exact=!!unit&&/^(?:m²|m2|qm)$/iu.test(unit);
     const native=pass.id==="native";
     const valid=exact&&(native||unit?.toLowerCase()!=="m2")&&!/(?:\bbis\b|[-–—])\s*\d/u.test(raw);
     const value=match?number(match[1]):null;
     add(field,value??raw,match?.[0]||raw,exact?"m2":unit,valid&&value!==null);
    };
    for(const [field,label]of [["livingArea","(?:Wohnfläche|Wohnflaeche)"],["plotArea","(?:Grundstück(?:sfläche)?|Grundstueck(?:sflaeche)?|Parzellenfläche|Parzellenflaeche)"]] as const){
     m=row.text.match(new RegExp("^"+label+"(?=\\s|:|$)\\s*:?\\s*(.*)$","iu"));
     if(m)addArea(field,m[1]);
    }
    if((m=row.text.match(/(?:^|\s)([\d][\d.,?*–— -]*(?:m[^\s,;)]*|qm)?)\s+Wohnfläche\b/iu)))addArea("livingArea",m[1].trim());
    if((m=row.text.match(/\b(\d{4,5})\s+([\p{L}][\p{L} -]+?),\s*([\p{L}][\p{L}-]+)/u))){add("postalCode",m[1],m[1]);add("location",m[2],m[2]);add("region",m[3],m[3]);}
    if((m=row.text.match(/(?:^Ort\s*:?\s+|Wohngegend\s+in\s+|Wohnlage\s+in\s+)([\p{L}][\p{L} -]+?)(?=[.,;]|$)/iu)))add("location",m[1],m[1]);
    const uncertainEquipment=/\b(?:ohne|keine|nicht|optional|geplant|voraussichtlich|unklar|oder)\b/iu.test(row.text);
    if(!uncertainEquipment&&(m=row.text.match(/^Energieeffizienzklasse\s*:?\s+([A-H][+]?)(?!\p{L})/iu)))add("energyClass",m[1].toUpperCase(),m[1]);
    if(!uncertainEquipment&&(m=row.text.match(/^Heizung\s*:?\s+(Wärmepumpe|Waermepumpe|Gasheizung|Ölheizung|Fernwärme|Pelletheizung)/iu)))add("heatingSystem",m[1],m[1]);
    if(!uncertainEquipment&&(m=row.text.match(/(?:^Heizung[^\n]*\(|\b)(Fußbodenheizung|Fussbodenheizung)\b/iu)))add("floorHeating",m[1].replace("ß","ss"),m[1]);
    if((m=row.text.match(/\b(zwei|drei|vier|fünf|sechs|\d+)\s+Stellplätze\s*\(/iu))){const v=number(m[1])??({zwei:2,drei:3,vier:4,"fünf":5,sechs:6} as Record<string,number>)[m[1].toLowerCase()];add("parkingSpaces",v??null,m[1]);}
    if((m=row.text.match(/^Stellplätze\s*:\s*(\d+)\s*$/iu)))add("parkingSpaces",number(m[1]),m[1]);
    const money=row.text.match(/^(?:(?:Kaufpreis|Angebotspreis|Verkaufspreis)\s*:?\s*)?([\d.,]+)\s*(€|EUR|CHF)(?!\p{L})/u);
    if(money&&(/^(?:Kaufpreis|Angebotspreis|Verkaufspreis)/u.test(row.text)||/^(?:Kaufpreis|Angebotspreis|Verkaufspreis)\s*:?$/u.test(rows[i-1]?.text??""))){add("price",number(money[1]),money[1]);add("currency",money[2]==="€"?"EUR":money[2],money[2]);}
   }
  }
 }
 const fields=[...new Set(candidates.map(c=>c.field))].map(field=>{
  const evidence=candidates.filter(c=>c.field===field),unique=[...new Set(evidence.map(c=>JSON.stringify(c.value)))];
  const reasons:string[]=[];
  if(unique.length!==1)reasons.push(field==="location"?"LOCATION_SOURCE_VARIANTS":"FIELD_VALUE_CONFLICT");
  if(evidence.some(c=>!c.unitValid))reasons.push("UNIT_UNCERTAIN");
  if(field==="location"&&!evidence.some(c=>/\b\d{4,5}\s+[\p{L} -]+,/u.test(c.evidence.text)||/^Ort\s*:/iu.test(c.evidence.text)))reasons.push("LOCATION_EVIDENCE_INSUFFICIENT");
  const area=field==="livingArea"||field==="plotArea";
  const confident=(c:PdfFactCandidate)=>c.evidence.confidence===null&&c.evidence.pass==="native"||c.evidence.confidence!==null&&c.evidence.confidence>=0.9;
  if(area?evidence.some(c=>!confident(c)):!evidence.some(confident))reasons.push("VALUE_CONFIDENCE_LOW");
  return {field,value:unique.length===1?evidence[0].value:null,unit:evidence[0].unit,status:unique.length>1?"conflicting" as const:reasons.length?"uncertain" as const:"reported" as const,reasons,evidence};
 });
 const values=Object.fromEntries(fields.filter(f=>f.status==="reported").map(f=>[f.field,f.value]));
 const supported=new Set(["propertyType","location","postalCode","rooms","bathrooms","livingArea","plotArea","constructionYear","heatingSystem","parkingSpaces"]);
 const propertyFacts:PropertyFact[]=fields.filter(f=>f.status==="reported"&&supported.has(f.field)&&f.value!==null).map(f=>{const best=[...f.evidence].sort((a,b)=>(b.evidence.confidence??1)-(a.evidence.confidence??1))[0].evidence;return{key:f.field,value:f.value!,...(f.unit?{unit:f.unit}:{}),source:"document",sourceReference:"page:"+best.page+":"+best.line,evidence:best.text,status:"reported"};});
 return {version:"PDF_STRUCTURED_FACTS_V1" as const,values,fields,propertyFacts,requiresReview:fields.some(f=>f.status!=="reported"),issues:[...new Set(fields.flatMap(f=>f.reasons))]};
}
