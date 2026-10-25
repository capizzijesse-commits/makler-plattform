import { normalizeExposeNumber } from './expose-core-fact-conflicts';

type Group = 'building'|'location'|'dimensions'|'rooms'|'equipment'|'offer';
type Entry = { id:string; field:string; value:string|number|boolean; group:Group; source:string; independentlyVerified:false };
const groups:Record<string,Group>={propertyType:'building',location:'location',rooms:'rooms',livingArea:'dimensions',plotArea:'dimensions',commercialArea:'dimensions',commercialUse:'rooms',price:'offer',currency:'offer',marketingType:'offer',transactionType:'offer',rentPeriod:'offer',priceOnRequestConfirmed:'offer'};
const numeric=new Set(['rooms','livingArea','plotArea','commercialArea','price']);
const unknownDomains=['storeys','floorPlan','roomAllocation','buildingCondition','constructionStandards','actualConsumption','heatingCoverage','parkingLocation','locationQuality'];
const domainEvidence:Record<string,RegExp>={storeys:/Etagen|Geschosse|Ebenen/iu,floorPlan:/Grundriss|Raumaufteilung/iu,roomAllocation:/Schlafzimmer|Wohnzimmer|Raumzuordnung/iu,buildingCondition:/Zustand|saniert|renoviert/iu,constructionStandards:/Norm|Standard|Bauvorschrift/iu,actualConsumption:/Verbrauch/iu,heatingCoverage:/(?:Fußbodenheizung|Fussbodenheizung).*(?:Räumen|Zimmer|Wohnräumen)/iu,parkingLocation:/(?:Stellplätze|Parkplätze).*(?:Grundstück|am Haus|Garage)/iu,locationQuality:/(?:ruhige|zentrale|begehrte) Lage/iu};
function usable(field:string,value:unknown):value is string|number|boolean {
 if(field==='priceOnRequestConfirmed')return value===true;
 if(numeric.has(field)){
  const raw=String(value??'').trim();
  const s=['livingArea','plotArea','commercialArea'].includes(field)?raw.replace(/\s*(?:m²|m2|qm)$/iu,''):raw;
  const n=normalizeExposeNumber(s);return n!==null&&Number(n)>0;
 }
 return typeof value==='string'&&!!value.trim()&&!/^(?:unknown|unbekannt|nicht angegeben|nicht dokumentiert|n\/a)$/iu.test(value.trim());
}
export function buildEditorialFactPlan(input:Record<string,unknown>) {
 const type=String(input.propertyType??'').toLowerCase(),kind=/grundstück|grundstueck|land parcel/u.test(type)?'land':/gewerbe|büro|buero|commercial/u.test(type)?'commercial':/wohnung|haus|apartment|house/u.test(type)?'residential':'unknown';
 const requiredFields=['propertyType','location',...(kind==='residential'?['rooms','livingArea']:kind==='land'?['plotArea']:kind==='commercial'?['commercialArea','commercialUse']:[])];
 if(['sale','rent'].includes(String(input.marketingType)))requiredFields.push('price','currency');
 const entries:Entry[]=[];
 for(const [field,group] of Object.entries(groups)){
  if(input.marketingType==='on_request'&&field==='price')continue;
  if(usable(field,input[field]))entries.push({id:field,field,value:input[field] as string|number|boolean,group,source:'supplied object facts.'+field,independentlyVerified:false});
 }
 // No extraction of new property claims: retain each supplied feature statement intact.
 // Unverified highlights remain outside this plan; scalar/source validation stays upstream.
 const verified=typeof input.verifiedFeatures==='string'?input.verifiedFeatures:'';
 for(const statement of verified.split(/[;\n]+/u).map(x=>x.trim()).filter(Boolean)){
  const group:Group=/Baujahr|construction year/iu.test(statement)?'building':/Badezimmer|bathroom/iu.test(statement)?'rooms':'equipment';
  entries.push({id:'feature-'+entries.filter(x=>x.field==='verifiedFeatures').length,field:'verifiedFeatures',value:statement,group,source:'supplied object facts.verifiedFeatures',independentlyVerified:false});
 }
 const mustCover=(e:Entry)=>requiredFields.includes(e.field)||numeric.has(e.field);
 const required=entries.filter(mustCover),optional=entries.filter(e=>!mustCover(e));
 const explicitStatements=verified.split(/[;\n]+/u).filter(s=>!/(?:nicht|kein\w*|unbestätigt|unklar)/iu.test(s));
 const unknown=[...Object.keys(groups).filter(field=>!entries.some(e=>e.field===field)),...unknownDomains.filter(domain=>!explicitStatements.some(s=>domainEvidence[domain].test(s)))];
 const orders:Group[][]=[['building','location','dimensions','rooms','equipment','offer'],['rooms','location','dimensions','offer','building','equipment'],['offer','location','building','dimensions','rooms','equipment']];
 return {version:'EDITORIAL_FACT_PLAN_9C',propertyKind:kind,verification:'Planning uses supplied validated data; it does not create independent verification. Unknown, image-derived or merely stylistic properties are never promoted to facts.',required,optional,unknown,missingRequired:requiredFields.filter(field=>!entries.some(e=>e.field===field)),
  excludedInputs:['imageAnalysis','imageEvidence','styleText','unverified highlights'],
  variants:orders.map((order,index)=>({variant:index+1,perspective:['factual-property-portrait','reader-oriented-residential','compact-offer'][index],sections:order.map(group=>({topic:group,factIds:entries.filter(e=>e.group===group).map(e=>e.id)})).filter(s=>s.factIds.length>0),mustCoverFactIds:required.map(e=>e.id),guidance:'Group adjacent topics into natural paragraphs. Each planned fact is used once; optional facts only where useful. Adapt to the object and omit empty topics. No sentence templates, invented relationships or word quota.'}))};
}
