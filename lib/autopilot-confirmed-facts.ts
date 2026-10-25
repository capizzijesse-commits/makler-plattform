import type { PremiumFacts } from './premium-quality-gate.server';
import { normalizeExposeNumber } from './expose-core-fact-conflicts';
type Document = {documentAnalysis?:{requiresReview?:boolean};structuredFacts?:{requiresReview?:boolean;fields:{field:string;value:unknown;status:string;evidence:unknown[]}[]}};
// Only the deterministic document adapter or explicit human facts may authorize
// additional attributes. Vision/CORE guesses are deliberately not arguments.
export function buildConfirmedAutopilotFacts(base:PremiumFacts,documents:Document[],manual?:PremiumFacts):PremiumFacts {
 const values=new Map<string,unknown>();
 for(const doc of documents){
  if(doc.documentAnalysis?.requiresReview||doc.structuredFacts?.requiresReview)throw Error('PDF_DOCUMENT_REVIEW_REQUIRED');
  for(const field of doc.structuredFacts?.fields??[]){
   if(field.status!=='reported'||!field.evidence.length)continue;
   if(values.has(field.field)&&JSON.stringify(values.get(field.field))!==JSON.stringify(field.value))throw Error('EXPOSE_FACT_CONFLICT_REVIEW_REQUIRED');
   values.set(field.field,field.value);
  }
 }
 const numeric=(v:unknown)=>normalizeExposeNumber(String(v??'').replace(/\s*(?:m²|m2|qm)$/iu,''));
 for(const field of ['rooms','livingArea','plotArea','price'])if(!(field==='price'&&['rent','on_request'].includes(String(manual?.marketingType)))&&values.has(field)&&manual?.[field]!=null&&numeric(values.get(field))!==numeric(manual[field]))throw Error('EXPOSE_FACT_CONFLICT_REVIEW_REQUIRED');
 const features:string[]=[];
 for(const [field,label] of [['constructionYear','Baujahr'],['bathrooms','Badezimmer'],['parkingSpaces','Stellplätze'],['energyClass','Energieeffizienzklasse']] as const){
  const value=values.get(field);if(value!==undefined)features.push(field==='bathrooms'||field==='parkingSpaces'?`${value} ${label}`:`${label} ${value}`);
 }
 for(const field of ['heatingSystem','floorHeating'])if(typeof values.get(field)==='string')features.push(String(values.get(field)).replace(/Fussbodenheizung/g,base.market==='DE'?'Fußbodenheizung':'Fussbodenheizung'));
 const manualFeatures=manual?.verifiedFeatures??manual?.highlights;
 if(typeof manualFeatures==='string'&&manualFeatures.trim())features.push(manualFeatures.trim());
 const verifiedFeatures=[...new Set(features)].join('; ');
 const facts:PremiumFacts={...base,...(manual??{}),verifiedFeatures,highlights:verifiedFeatures,imageAnalysis:'',imageEvidence:[]};
 for(const field of ['rooms','livingArea','plotArea'])if(values.has(field))facts[field]=values.get(field);
 if(!manual&&values.has('currency'))facts.currency=values.get('currency');
 // AI-only plot values are not authorized by their presence in CORE output.
 facts.plotArea=manual?.plotArea??values.get('plotArea');
 for(const field of ['rooms','livingArea','price'])facts[field]=facts[field]==null?undefined:numeric(facts[field])??undefined;
 return facts;
}
