import type { ListingTextVariant } from './listing-text-quality';
import { normalizeExposeNumber } from './expose-core-fact-conflicts';
export type EditorialFinding = { code: string; variantIndex: number; field?: string; quote: string; reason: string };
type Facts = Record<string, unknown>;
const normalized = (s: string) => s.toLocaleLowerCase('de').replace(/ß/g, 'ss').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function number(value: unknown): number | null {
 const s=String(value ?? '').replace(/\s*(?:m²|m2|qm)$/iu,'');
 const n=normalizeExposeNumber(s.trim().replace(/[.,]$/u,''));return n && Number(n)>0 ? Number(n) : null;
}
function mentions(text: string, value: unknown, kind: string) {
 const expected=number(value); if(expected===null)return true;
 // Match numbers with their semantic unit; do not satisfy a price using an area.
 const patterns: Record<string, RegExp>={rooms:/(\d+(?:[.,]\d+)?)\s*[- ]?Zimmer/gi, livingArea:/(\d[\d.,'’ ]*)\s*(?:m²|m2|qm|Quadratmeter(?:n)?)/gi,plotArea:/(\d[\d.,'’ ]*)\s*(?:m²|m2|qm|Quadratmeter(?:n)?)/gi,price:/(\d[\d.,'’ ]*)\s*(?:EUR|CHF|€|Franken|Euro)/gi,commercialArea:/(\d[\d.,'’ ]*)\s*(?:m²|m2|qm|Quadratmeter(?:n)?)/gi};
 if(kind==='rooms') { const names=['null','ein','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf','zwölf']; const n=names[expected]; if(n && new RegExp('(?:^|\\s)'+n+'(?:e)?[- ]Zimmer','i').test(text))return true; }
 if(kind==='price')for(const m of text.matchAll(/(?:EUR|CHF|€)\s*(\d[\d.,'’ ]*)/gi))if(number(m[1])===expected)return true;
 const pattern=patterns[kind];if(!pattern)return false;
 for(const m of text.matchAll(pattern)){if(number(m[1])!==expected)continue;const around=text.slice(Math.max(0,m.index!-160),m.index!+m[0].length+160);if(kind==='livingArea'&&!/Wohnfl(?:ä|ae)che/i.test(around))continue;if(kind==='plotArea'&&!/Grundst(?:ü|ue)ck/i.test(around))continue;if(kind==='commercialArea'&&!/(?:Gewerbe|Nutz|Büro|Buero|Lager)fl(?:ä|ae)che|Büronutzung/i.test(around))continue;return true;}return false;
}
// Each family checks a material assertion against an explicit source statement in the
// same family. Mere equipment/year/class data cannot establish these relationships.
const assertionFamilies = [
 {field:'plotBoundary',claim:/(?:Grundstück|Grundstücksfläche).{0,100}(?:Abgrenzung|Abschirmung|Trennung).{0,35}(?:Umgebung|Nachbar|Außen|Aussen)|(?:Abgrenzung|Abschirmung).{0,45}(?:Grundstück|Umgebung|Nachbar)/i},
 {field:'floorHeatingCoverage',claim:/(?:Fußbodenheizung|Fussbodenheizung).{0,100}(?:in (?:den|allen|sämtlichen|bestimmten) (?:Wohnräumen|Räumen|Zimmern)|im (?:Wohnzimmer|Badezimmer|Schlafzimmer))|(?:Wohnräume|Räume|Zimmer).{0,45}(?:sind|werden).{0,30}(?:Fußbodenheizung|Fussbodenheizung)/i},
 {field:'storeys',claim:/(?:auf|über|verteilt|erstreck\w*|umfasst|verfügt über|hat|besitzt).{0,30}(?:\d+|zwei|drei|vier|mehrere|mehreren)\s+(?:Ebenen|Etagen|Geschosse\w*|Stockwerke\w*)|(?:mehrgeschossig\w*|zweigeschossig\w*|dreigeschossig\w*|zweistöckig\w*)/i},
 {field:'buildingCondition',claim:/(?:Überblick|Aufschluss|Aussage|Rückschluss|belegt|zeigt).{0,80}(?:baulich\w* Zustand|Bauzustand)|(?:baulich\w* Zustand|Bauzustand).{0,55}(?:gut|hervorragend|modern|einwandfrei)/i},
 {field:'flexibleUse',claim:/(?:gut nutzbar\w* Fläche|unterschiedlich\w* Nutzung\w*|vielfältig\w* Wohnbedürfnisse|Nutzungsvielfalt)|(?:Räum\w*|Zimmer|Wohnfläche).{0,55}(?:flexibel|vielseitig).{0,20}(?:nutzen|nutzbar|einsetzbar)|(?:variabl\w*|flexibl\w*).{0,20}(?:Raumaufteilung|Nutzung)/i},
 {field:'roomCountAllocation',claim:/(?:Zimmer|Räume).{0,55}\bdarunter\b.{0,25}Badezimmer/i},
 {field:'energyCertification',claim:/(?:Energieeffizienzklasse|Energieklasse).{0,20}(?:ausgezeichnet|zertifiziert)|(?:ausgezeichnet|zertifiziert).{0,35}(?:Energieeffizienzklasse|Energieklasse)/i},
 {field:'energyClassCausality',claim:/(?:Wärmepumpe|Heizung).{0,100}(?:verleih\w*|bewirk\w*|ermöglich\w*|garantier\w*|sicher\w*|unterstütz\w*|sorgt\s+für|führt\s+zu).{0,65}(?:Energieeffizienzklasse|Energieklasse)|(?:Wärmepumpe|Heizung).{0,110}(?:Energieeffizienzklasse|Energieklasse).{0,45}(?:verleih\w*|bewirk\w*|ermöglich\w*|garantier\w*|sicher\w*)|(?:Energieeffizienzklasse|Energieklasse).{0,70}(?:Wärmepumpe|Heizung).{0,30}(?:unterstütz\w*|bewirk\w*|ermöglich\w*|garantier\w*|erreich\w*)|(?:Energieeffizienzklasse|Energieklasse).{0,35}(?:beruht|basiert|resultiert).{0,20}(?:Wärmepumpe|Heizung)|(?:dank|aufgrund|durch).{0,20}(?:Wärmepumpe|Heizung).{0,80}(?:Energieeffizienzklasse|Energieklasse)/i},
 {field:'locationQuality',claim:/(?:etabliert\w*|begehrt\w*|erstklassig\w*|hervorragend\w*|ruhig\w*).{0,12}(?:Lage|Standort)|(?:Lage|Standort).{0,20}(?:etabliert|begehrt|erstklassig|hervorragend|ruhig)/i},
 {field:'heatingEffect',claim:/(?:Wärmepumpe|Fußbodenheizung|Fussbodenheizung).{0,90}(?:Raumklima|Wärmeverteilung|gleichmäßige Wärme|behagliche Wärme)|(?:Raumklima|Wärmeverteilung).{0,25}(?:regulier|sorg|unterstütz)/i},
 {field:'comfortEffect',claim:/(?:Badezimmer|Ausstattung|Heizung).{0,60}(?:Komfort|Alltag).{0,25}(?:unterstütz|erleichter|verbesser)|(?:Badezimmer|Heizung).{0,45}(?:unterstütz|erleichter|verbesser).{0,25}(?:Komfort|Alltag)/i},
 {field:'constructionStandard',claim:/(?:nach|entspr(?:ech|ich)\w*|erfüll\w*).{0,45}(?:aktuell\w*|heutig\w*|geltend\w*).{0,35}(?:Standard|Anforderung|Norm)|(?:aktuell\w*|heutig\w*|geltend\w*).{0,25}(?:Standard\w*|Anforderung\w*|Norm\w*).{0,30}(?:entspr(?:ech|ich)\w*|erfüll\w*|einhalt\w*)|(?:normgerecht\w*|normkonform\w*)|(?:entspricht|erfüllt|gemäß).{0,35}(?:Normen|Bauvorschriften|Baustandards|DIN\s*\d*)/i},
 {field:'economics',claim:/(?:Wirtschaftlichkeit|wirtschaftlich(?:en|e|es)? Betrieb|geringe\w* (?:Betriebs|Heiz|Energie)kosten|niedrige\w* (?:Betriebs|Heiz|Energie)kosten)/i},
 {field:'layout',claim:/(?:durchdacht\w*|funktional\w*|klar\w*).{0,22}(?:Raumkonzept|Raumaufteilung|Grundriss|Design|räumlich\w*\s+Struktur|Struktur des Gebäudes|Fläche|Gliederung der Räume)|(?:private\w*\s+Rückzugsbereiche|Gemeinschaftsräume)/i},
 {field:'parkingAllocation',claim:/(?:Stellplätz\w*|Parkplätz\w*).{0,90}(?:zugeordnet|Teil des Angebots|(?:Bewohner\w*|Eigentümer\w*|Mieter\w*|Käufer\w*).{0,35}(?:zur Verfügung|nutzbar|nutzen|reserviert)|(?:Eigentum|Sondernutzungsrecht)|(?:Kaufpreis|Mietpreis|Angebot).{0,20}(?:enthalten|inbegriffen|inklusive))|(?:Bewohner\w*|Eigentümer\w*|Mieter\w*|Käufer\w*).{0,45}(?:verfügen über|nutzen|steht|stehen).{0,45}(?:Stellplätz\w*|Parkplätz\w*)|(?:Objekt|Angebot).{0,35}(?:sind|bietet).{0,20}Stellplätz\w*.{0,20}zugeordnet/i},
 {field:'newBuildStatus',claim:/\bNeubau(?:s|ten)?\b|\bErstbezug\b/i},
 {field:'sustainability',claim:/nachhaltig\w*.{0,35}(?:Technik|Energieversorgung|Bauweise|Wohnen)/i},
 {field:'parkingLocation',claim:/(?:Parken|Stellplätz\w*|Parkplätz\w*).{0,65}(?:auf dem Grundstück|auf eigenem Grund|unmittelbar am Objekt|direkt am Haus|am Gebäude)|(?:auf dem Grundstück|auf eigenem Grund|direkt am Haus|unmittelbar am Objekt|am Gebäude).{0,100}(?:Stellplätz\w*|Parkplätz\w*)|(?:Grundstück).{0,70}(?:stehen|befinden|bietet).{0,30}(?:Stellplätz\w*|Parkplätz\w*)/i},
 {field:'actualConsumption',claim:/(?:niedrig\w*|gering\w*).{0,15}Energieverbrauch|Energieverbrauch.{0,20}(?:niedrig|gering)|(?:Energieverbrauch|Verbrauch)\s+(?:beträgt|liegt bei)\s*\d/i},
 {field:'heatingPerformance',claim:/(?:effizient\w*|sparsam\w*).{0,18}(?:Wärmepumpe|Waermepumpe)|(?:Wärmepumpe|Waermepumpe).{0,25}(?:arbeitet|ist|heizt).{0,12}(?:effizient|sparsam)/i},
 {field:'energyDemand',claim:/(?:niedrig\w*|gering\w*).{0,15}Energiebedarf|Energiebedarf.{0,20}(?:niedrig|gering)/i},
 {field:'constructionQuality',claim:/(?:modern\w*|zeitgemäß\w*|zeitgemaess\w*|hochwertig\w*).{0,15}Bauweise|(?:durchdacht\w*|hochwertig\w*).{0,15}technisch\w*.{0,15}Ausstattung|modern\w*.{0,12}Energiestandard/i},
 {field:'designFreedom',claim:/(?:vielfältig\w*|flexibl\w*|frei\w*|individuell\w*).{0,28}(?:Raumgestaltung|Nutzungsmöglichkeit|Gestaltungsmöglichkeit)|(?:Zimmer|Wohnfläche).{0,70}(?:Gestaltungsfreiheit|Umgestaltung|flexible Nutzung)/i},
 {field:'siteSuitability',claim:/(?:Grundstück|Fläche).{0,90}(?:Platz|Raum|geeignet|Eignung|eignet sich).{0,40}(?:Außenanlagen|Aussenanlagen|Gartenanlagen|Gartenflächen|Zusatzbauten)|(?:Grundstück|Grundstücksfläche).{0,70}(?:ermöglicht|bietet|schafft).{0,35}(?:großzügig\w*|grosszügig\w*|nutzbar\w*)\s+(?:Außenfläche|Aussenfläche)/i},
 {field:'marketPosition',claim:/(?:gehoben\w*|Premium|Luxus).{0,18}(?:Marktsegment|Marktposition)|(?:Marktsegment|Marktposition).{0,20}(?:gehoben|Premium|Luxus)/i},
 {field:'parkingDemand',claim:/(?:Park|Stell).{0,35}(?:deck|erfüll).{0,20}(?:Bedarf|Nachfrage)|(?:Bedarf|Nachfrage).{0,30}(?:Park|Stell).{0,30}(?:abdeck|deck|erfüll)|(?:Park|Stell).{0,60}(?:Bedarf|Nachfrage).{0,30}(?:abdeck|deck|erfüll)/i},
 {field:'priceJustification',claim:/(?:Verkaufspreis|Kaufpreis|Preis).{0,100}(?:kalkuliert|gerechtfertigt|angemessen|marktgerecht|fair|bewertet)|(?:angemessen\w*|marktgerecht\w*|fair\w*).{0,20}(?:Verkaufspreis|Kaufpreis|Preis)/i},
 {field:'layoutQuality',claim:/(?:großzügig\w*|grosszügig\w*).{0,18}(?:Raumaufteilung|Raumgestaltung|Grundriss)/i},
];
const evidenceNeeds: Record<string,string> = {
 plotBoundary:'Ein konkreter Beleg der Grundstücksabgrenzung oder Abschirmung fehlt; die Grundstücksfläche belegt keine Abgrenzung zur Umgebung.',
 floorHeatingCoverage:'Ein raumbezogener Installationsbeleg fehlt; die Angabe einer Fußbodenheizung belegt nicht ihre Installation in bestimmten oder allen Räumen.',
 storeys:'Ein objektbezogener Geschoss-/Ebenenbeleg fehlt; Zimmerzahl, Baujahr und Wohnfläche belegen keine Verteilung auf Etagen.',
 constructionStandard:'Eine konkrete Bau-/Normkonformität muss ausdrücklich belegt sein; Baujahr und technische Ausstattung reichen nicht.',
 buildingCondition:'Ein Zustands-/Besichtigungsbeleg fehlt; Baujahr, Technik und Energieklasse belegen nicht den tatsächlichen baulichen Zustand.',
 flexibleUse:'Die konkrete Nutzbarkeit oder flexible Raumnutzung benötigt einen Grundriss-/Nutzungsbeleg; Fläche und Zimmerzahl allein reichen nicht.',
 energyCertification:'Die Energieklasse ist keine Auszeichnung oder Zertifizierung; ein ausdrücklicher Zertifizierungs-/Auszeichnungsbeleg fehlt.',
 energyClassCausality:'Eine Heizung und eine Energieklasse als Einzelangaben belegen keinen ursächlichen Zusammenhang; dafür fehlt ein ausdrücklicher objektbezogener Nachweis.',
 roomCountAllocation:'Zimmerzahl und Badezimmerzahl sind getrennte Angaben; ihre Einordnung als darunter benötigt einen ausdrücklichen Quellenbeleg.',
 locationQuality:'Die konkrete Standortwertung benötigt einen Lagebeleg; der Ortsname allein reicht nicht.',
 heatingEffect:'Die behauptete Raumklima-/Wärmeverteilungswirkung bzw. deren Umfang ist nicht durch die blosse Heizungsangabe belegt.',
 comfortEffect:'Die konkrete Komfort-/Alltagswirkung ist nicht durch eine Ausstattungsliste belegt.',
 layout:'Ein ausdrücklicher Beleg für Raumgliederung, Flächengestaltung oder die konkrete Raumnutzung fehlt; Zimmerzahl und Fläche reichen nicht.',
 parkingAllocation:'Ein ausdrücklicher Zuordnungs-/Angebotsbeleg für die Stellplätze fehlt; ihre Anzahl allein reicht nicht.',
 newBuildStatus:'Aktueller Neubau-/Erstbezugsstatus muss ausdrücklich belegt sein; das Baujahr allein reicht nicht.',
 designFreedom:'Expliziter Grundriss-/Nutzungsbeleg für die behauptete Gestaltungsfreiheit; Zimmerzahl und Fläche reichen nicht.',
 siteSuitability:'Beleg der tatsächlich geeigneten oder verfügbaren Grundstücksfläche und zulässigen Nutzung; Gesamtfläche allein reicht nicht.',
 marketPosition:'Objektbezogene Marktvergleichsdaten für die behauptete Positionierung; Angebotspreis allein reicht nicht.',
 actualConsumption:'Ausdrücklicher Verbrauchsnachweis für die Aussage; Energieklasse und Heizung sind kein Nachweis tatsächlichen Verbrauchs.',
 heatingPerformance:'Gerätebezogener Effizienz-/Leistungsbeleg fehlt; die blosse Angabe einer Wärmepumpe belegt keine Effizienz.',
 energyDemand:'Konkreter Bedarfsnachweis fehlt; eine angegebene Energieklasse allein bestätigt nicht diese Bedarfsfolgerung.',
 constructionQuality:'Objektbezogener Bauqualitäts-/Planungsbeleg fehlt; Baujahr und Ausstattungsliste reichen für diese Wertung nicht.',
 parkingDemand:'Dokumentierter Parkbedarf und nachgewiesene Deckung; Stellplatzzahl allein reicht nicht.',
 priceJustification:'Belegte Kalkulations-/Bewertungsgrundlage für die Preisaussage; ein Angebotspreis erklärt seine Berechnung nicht.',
 layoutQuality:'Dokumentierter Grundriss oder ausdrücklicher Beleg der behaupteten Raumqualität.'
};
const openingShape = (text:string) => /^(?:das|die|der|dieses|diese|dieser)\s+(?:(?:angeboten\w*|im Jahr \d+ errichtet\w*|\d+ erbaut\w*)\s+)?(?:Einfamilienhaus|Haus|Wohnung|Grundstück|Gewerbefläche)\b/i.test(text.trim()) ? 'property-subject' : '';
const firstSentence = (text:string) => text.split(/(?<=[.!?])\s+/u)[0] ?? '';
function openingPerspective(text:string) {
 const first=firstSentence(text);
 if(/Kaufpreis|Verkaufspreis|zum Kauf|Miete|EUR|Euro|CHF/i.test(first))return 'offer';
 if(/Baujahr|\b(?:erbaut|errichtet)\b/i.test(first))return 'building';
 if(/Wohnfläche|Zimmer|Grundstück/i.test(first))return 'space';
 return structure(first).join('|');
}
const filler = /(?:klar (?:definiert\w*|strukturiert\w*) Angebot|Angebot im Markt|Beispiel für modernen Wohnkomfort|eigenständiges Bauwerk|ohne.{0,45}(?:Ausstattungsdetails|Eigenschaften|Merkmale).{0,30}(?:beanspruch|behaupt|erfind))/i;
const topics=[['space',/Wohnfläche|Zimmer|Grundstück/i],['heating',/Wärmepumpe|Fußbodenheizung|Fussbodenheizung|Haustechnik|Energieeffizienz/i],['bath',/Badezimmer/i],['parking',/Stellplätz|Parken/i],['offer',/Kaufpreis|Miete|EUR|CHF/i],['kitchen',/Küche/i],['outdoor',/Balkon|Terrasse|Garten/i]] as const;
function structure(text: string){return text.split(/(?<=[.!?])\s+/).map(s=>topics.filter(([,r])=>r.test(s)).map(([t])=>t).join('+')).filter(Boolean);}
function dominantOpeningTopic(v:ListingTextVariant){
 // Required scalar facts are shared by design; they are not a repeated feature angle.
 const features=topics.filter(([t])=>t!=='space'&&t!=='offer');
 const titleTopics=features.filter(([,r])=>r.test(v.title)).map(([t])=>t);
 const first=v.text.split(/(?<=[.!?])\s+/)[0]??'';
 return titleTopics.length===1&&features.some(([t,r])=>t===titleTopics[0]&&r.test(first))?titleTopics[0]:null;
}
export function evaluatePremiumEditorialQuality(facts: Facts, variants: ListingTextVariant[]) {
 const findings: EditorialFinding[]=[];
 const add=(variantIndex:number,code:string,quote:string,reason:string,field?:string)=>findings.push({variantIndex,code,quote,reason,...(field?{field}:{})});
 const sources=String(facts.verifiedFeatures ?? '')+'; '+String(facts.highlights ?? '');
 const sourceStatements=sources.split(/[;\n.!?]+/).filter(s=>!/(?:nicht|kein\w*|unbestätigt|unklar)/i.test(s));
 variants.forEach((v,i)=>{
  const combined=v.title+' '+v.text;
  for(const family of assertionFamilies)if(family.claim.test(v.title)&&!sourceStatements.some(s=>family.claim.test(s)&&normalized(s)===normalized(v.title)))add(i,'MATERIAL_CLAIM_WITHOUT_EVIDENCE',v.title,evidenceNeeds[family.field] ?? 'Für diese konkrete Titelaussage fehlt ein ausdrücklicher Beleg.',family.field);
  const required=['rooms','livingArea','plotArea','commercialArea'];
  if(['sale','rent'].includes(String(facts.marketingType)))required.push('price');
  for(const field of required)if(number(facts[field])!==null&&!mentions(combined,facts[field],field))add(i,'CORE_FACT_NOT_PRESENT','',field==='rooms' ? 'Die belegte Zimmerzahl '+String(facts[field])+' ist nicht eindeutig als Zimmer angegeben. Allgemeine Räume können Nebenräume einschliessen; dies ist eine Begriffsunsicherheit, keine Feststellung einer falschen Zahl.' : 'Die belegte Kernangabe '+String(facts[field])+' fehlt im Titel/Beschreibungstext. Keine serverseitig nachgewiesene separate Darstellung vorhanden.',field);
  if(facts.market==='DE' && /\b(?:grosse[nsrm]?|grosszügig\w*|Strasse\w*|Fussbodenheizung)\b/iu.test(combined))add(i,'MARKET_ORTHOGRAPHY_MISMATCH',combined,'Für Markt DE ist deutsche Standardschreibung erforderlich; Reparaturen dürfen den Sprachmarkt nicht wechseln.');
  const paragraphs=v.text.split(/\n\s*\n/).filter(Boolean);
  if(paragraphs.length>1){
   const last=paragraphs[paragraphs.length-1],before=paragraphs.slice(0,-1).join(' ');
   const newTopics=topics.filter(([,r])=>r.test(last)&&!r.test(before));
   if(!newTopics.length && /insgesamt|solide Option|Interesse wecken|Die Kombination|kennzeichnet|wesentliche Merkmale/i.test(last) && !/\d/.test(last))add(i,'LOW_INFORMATION_CLOSING',last,'Der Schluss wiederholt bekannte Themen und bewertet das Angebot, ohne eine zusätzliche belegte Information zu vermitteln.');
  }
  let heatingSeen=false; const sentencesSeen=new Set<string>();
  for(const sentence of v.text.split(/(?<=[.!?])\s+/)){
   const key=normalized(sentence);if(key.split(' ').length>=8&&sentencesSeen.has(key))add(i,'LOW_INFORMATION_COPY',sentence,'Derselbe vollständige Informationssatz wird innerhalb der Variante wiederholt.');sentencesSeen.add(key);
   for(const family of assertionFamilies)if(family.claim.test(sentence)&&!sourceStatements.some(s=>family.claim.test(s)&&normalized(s)===normalized(sentence)))add(i,'MATERIAL_CLAIM_WITHOUT_EVIDENCE',sentence,evidenceNeeds[family.field] ?? 'Für diese konkrete Aussage fehlt ein ausdrücklicher Beleg. Baujahr, Ausstattung oder Energieklasse allein reichen nicht aus.',family.field);
   if(heatingSeen && /(?:Ausstattung|Kombination|Technik).{0,70}(?:wesentliche Merkmale|Wohnkomfort|kennzeichnet|solide Option)/i.test(sentence))add(i,'REDUNDANT_EQUIPMENT_COPY',sentence,'Ausstattung wird erneut pauschal bewertet statt um einen weiteren belegten Aspekt ergänzt.');
   if(/Wärmepumpe|Fußbodenheizung|Fussbodenheizung/.test(sentence))heatingSeen=true;
   if(filler.test(sentence)||/Die Kombination.{0,110}(?:klare Übersicht|Ausstattungsmerkmale)|Diese Fakten bilden die Grundlage|Diese Fakten.{0,100}(?:Überblick|Entscheidungsfindung)|(?:Baujahr|Energieeffizienzklasse).{0,35}ist Teil der Objektbeschreibung|zeitlichen Rahmen der Errichtung dokumentiert|Das Angebot wird.{0,80}angeboten|richtet sich an Interessenten, die Wert auf|eignet sich für Interessenten, die Wert auf|Dieses Angebot bietet eine Kombination/i.test(sentence))add(i,'LOW_INFORMATION_COPY',sentence,'Abstrakte Angebots-/Qualitätsbewertung ohne zusätzliche objektspezifische Information.');
  }
 });
 if(variants.length===3){
  const openings=variants.map(v=>normalized(firstSentence(v.text)).split(' ').slice(0,8).join(' '));
  const plans=variants.map(v=>structure(v.text));
  for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){
   const ta=new Set(normalized(variants[a].title).split(' ')),tb=new Set(normalized(variants[b].title).split(' '));const overlap=[...ta].filter(w=>tb.has(w)).length/Math.max(1,new Set([...ta,...tb]).size);
   if(overlap>=.8)add(b,'EDITORIAL_TITLES_REUSED',variants[b].title,'Titel wiederholt nahezu dieselben Begriffe einer anderen Variante.');
   if(openingShape(variants[a].text) && openingShape(variants[a].text)===openingShape(variants[b].text) && openingPerspective(variants[a].text)===openingPerspective(variants[b].text))add(b,'EDITORIAL_OPENING_STRATEGY_REUSED',firstSentence(variants[b].text),'Gleicher Objekt-Einstieg mit derselben Informationsperspektive wie Variante '+(a+1)+'.');
   if(dominantOpeningTopic(variants[a])&&dominantOpeningTopic(variants[a])===dominantOpeningTopic(variants[b]))add(b,'EDITORIAL_OPENING_STRATEGY_REUSED',variants[b].title+' / '+variants[b].text.split(/(?<=[.!?])\s+/)[0],'Titel und Einstieg priorisieren denselben dominanten Sachbereich wie Variante '+(a+1)+'; eine andere Wortstellung ist keine eigenständige Perspektive.');
   if(openings[a]===openings[b]&&openings[a].split(' ').length>=6)add(b,'EDITORIAL_OPENING_REUSED',variants[b].text.split(/[.!?]/)[0],'Gleicher Einstieg und gleiche Informationsführung wie Variante '+(a+1)+'.');
   if(plans[a].length>=3&&JSON.stringify(plans[a])===JSON.stringify(plans[b]))add(b,'EDITORIAL_STRUCTURE_REUSED',variants[b].text,'Gleiche Abfolge der belegten Argumentthemen wie Variante '+(a+1)+'.');
  }
 }
 return {passed:findings.length===0,findings};
}
