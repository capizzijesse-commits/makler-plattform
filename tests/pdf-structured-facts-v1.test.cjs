/* eslint-disable @typescript-eslint/no-require-imports -- Isolated pure evidence tests. */
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript");
require.extensions[".ts"]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {extractPdfStructuredFacts:extract}=require("../lib/pdf-structured-facts.ts");
const {planPdfTableDetail}=require("../lib/pdf-ocr-layout.ts");
function page(lines,confidence=0.99){return{pageNumber:1,width:600,height:800,nativeText:"",text:lines.join("\n"),hasImages:true,coveringImage:true,method:"local_ocr",issues:[],words:lines.flatMap((line,i)=>line.split(" ").map((text,j)=>({text,confidence,box:[30+j*65,30+i*25,60,15],line:"1:1:1:"+i}))) };}
test("explicit labels and exact units produce reported provenance-bound values",()=>{const r=extract([page(["Wohnfläche 95 m²","Grundstück 420 qm","Zimmer 4","Badezimmer 2","Baujahr 2016"])]);assert.equal(r.values.livingArea,95);assert.equal(r.values.plotArea,420);assert.equal(r.values.rooms,4);assert.equal(r.values.bathrooms,2);assert(r.propertyFacts.every(f=>f.status==="reported"&&f.sourceReference.startsWith("page:1:")));});
test("damaged area unit remains uncertain, never repaired",()=>{const r=extract([page(["Wohnfläche 95 m*","Grundstück 420 m?"])]);assert.equal(r.values.livingArea,undefined);assert.equal(r.values.plotArea,undefined);assert(r.fields.every(f=>f.reasons.includes("UNIT_UNCERTAIN")));assert.equal(r.requiresReview,true);});
test("table and prose contradictions retain every candidate",()=>{const r=extract([page(["Wohnfläche 95 m²","105 m² Wohnfläche","Zimmer 4","Zimmer 5"])]);assert.equal(r.values.livingArea,undefined);assert.equal(r.values.rooms,undefined);assert(r.fields.every(f=>f.status==="conflicting"));});
test("a good OCR repeat cannot silently overwrite a bad-unit source",()=>{const p=page(["Wohnfläche 95 m*"]);p.detailRegions=[{kind:"table",region:{left:0,top:0,width:400,height:100},text:"Wohnfläche 95 m²",words:page(["Wohnfläche 95 m²"]).words}];const r=extract([p]);assert.equal(r.values.livingArea,undefined);assert.equal(r.fields[0].evidence.length,2);});
test("independent object passages with differing place names block location",()=>{const p=page(["12345 Lindenburg, Hessen","Wohngegend in Lindenberg"]);const before=JSON.stringify(p);const r=extract([p]);assert.equal(r.values.location,undefined);assert.equal(r.fields.find(f=>f.field==="location").status,"conflicting");assert(r.issues.includes("LOCATION_SOURCE_VARIANTS"));assert.equal(JSON.stringify(p),before);});
test("contact location is not used to correct object location",()=>{const r=extract([page(["12345 Lindenburg, Hessen","Ihr Ansprechpartner","54321 Lindenberg, Bayern"])]);assert.equal(r.values.location,"Lindenburg");assert.equal(r.fields.find(f=>f.field==="location").evidence.length,1);});
test("low-confidence value is not promoted to usable data",()=>{const r=extract([page(["Zimmer 4"],0.4)]);assert.equal(r.values.rooms,undefined);assert.equal(r.fields[0].value,4);assert(r.issues.includes("VALUE_CONFIDENCE_LOW"));});
test("multi-column icon text never assigns year to parking count",()=>{const r=extract([page(["Zimmer Wohnfläche Grundstück 2016 Stellplätze A+"])]);assert.equal(r.values.parkingSpaces,undefined);assert.equal(r.values.rooms,undefined);});
test("currency derives only from explicit offer and is retained separately",()=>{const r=extract([page(["Kaufpreis","375.000 €"])]);assert.equal(r.values.price,375000);assert.equal(r.values.currency,"EUR");assert.equal(extract([page(["375.000 €"])]).values.price,undefined);});
test("negated heating is not a positive equipment fact",()=>{const r=extract([page(["Keine Fußbodenheizung vorhanden"])]);assert.equal(r.values.floorHeating,undefined);});
test("no detail crop is invented from one uncertain number",()=>{assert.equal(planPdfTableDetail(page(["95 m*"]).words,600,800),null);});
test("different currencies cannot be resolved by picking the first",()=>{const r=extract([page(["Kaufpreis","375.000 €","Kaufpreis","375.000 CHF"])]);assert.equal(r.values.currency,undefined);assert.equal(r.fields.find(f=>f.field==="currency").status,"conflicting");});


test("a multiword address is not truncated or corrected",()=>{const r=extract([page(["12345 Bad Lindenburg, Hessen"])]);assert.equal(r.values.location,"Bad Lindenburg");});
test("context-only town is not promoted to an object address",()=>{const r=extract([page(["Wohngegend in Lindenburg."])]);assert.equal(r.values.location,undefined);assert(r.issues.includes("LOCATION_EVIDENCE_INSUFFICIENT"));});
test("range and damaged room counts are not partially parsed",()=>{for(const line of ["Zimmer 4 bis 5","Zimmer 4?5"]){assert.equal(extract([page([line])]).values.rooms,undefined);}});

for(const unit of ['m?','m2','m*','m²?','ha','ft2',''])test('OCR area unit requires review: '+JSON.stringify(unit),()=>{
 const r=extract([page(['Wohnfläche 160 '+unit,'Grundstück 420 '+unit])]);
 assert.equal(r.values.livingArea,undefined);assert.equal(r.values.plotArea,undefined);assert.equal(r.propertyFacts.length,0);assert.equal(r.requiresReview,true);
 assert(r.fields.every(f=>f.status==='uncertain'&&f.reasons.includes('UNIT_UNCERTAIN')));
 assert(r.fields[0].evidence[0].evidence.text.includes('160'));
});
for(const unit of ['m²','qm'])test('exact OCR area unit remains reported, never verified: '+unit,()=>{
 const r=extract([page(['Wohnfläche 160 '+unit])]);assert.equal(r.values.livingArea,160);assert.equal(r.fields[0].status,'reported');assert.equal(r.propertyFacts[0].status,'reported');
});
test('native textual m2 is explicit source text, not a repaired OCR glyph',()=>{
 const p=page(['Wohnfläche 160 m2'],null);p.method='native';const r=extract([p]);assert.equal(r.values.livingArea,160);assert.equal(r.propertyFacts[0].status,'reported');
});
for(const raw of ['1?8 m²','160 bis 180 m²','160–180 m²','-160 m²','0 m²','keine Angabe',''])test('damaged, ranged or absent area is not partially promoted: '+raw,()=>{
 const r=extract([page(['Wohnfläche '+raw])]);assert.equal(r.values.livingArea,undefined);assert.equal(r.requiresReview,true);assert.equal(r.propertyFacts.length,0);
});
test('unit confidence is checked together with the actual number',()=>{
 const p=page(['Wohnfläche 160 m²']);p.words.at(-1).confidence=.3;const r=extract([p]);assert.equal(r.values.livingArea,undefined);assert(r.issues.includes('VALUE_CONFIDENCE_LOW'));
});
test('high confidence detail cannot erase a weak original area observation',()=>{
 const p=page(['Wohnfläche 160 m²'],.4);p.detailRegions=[{kind:'table',region:{left:0,top:0,width:400,height:100},text:'Wohnfläche 160 m²',words:page(['Wohnfläche 160 m²']).words}];
 assert.equal(extract([p]).values.livingArea,undefined);
});
test('matching native evidence is retained without silently repairing damaged OCR',()=>{
 const native=page(['Wohnfläche 160 m²'],null);native.method='native';const r=extract([native,page(['Wohnfläche 160 m?'])]);assert.equal(r.fields[0].evidence.length,2);assert.equal(r.values.livingArea,undefined);assert.equal(r.requiresReview,true);
});
test('truly absent area has no fabricated number, unit or property fact',()=>{
 const r=extract([page(['Zimmer 4'])]);assert.equal(r.values.livingArea,undefined);assert.equal(r.fields.some(f=>f.field==='livingArea'),false);assert.equal(r.propertyFacts.some(f=>f.key==='livingArea'),false);
});
test('ordinary prose with an exact area unit and punctuation retains its source',()=>{
 const r=extract([page(['Wohnfläche 160 m². Größe und Straße.'])]);assert.equal(r.values.livingArea,160);assert.match(r.propertyFacts[0].evidence,/160 m²/);
});
test('unrelated property words are not treated as area labels',()=>{
 const r=extract([page(['Grundstückseigentümer nicht im Test erfasst','Wohnflächenberechnung liegt separat vor'])]);assert.equal(r.fields.length,0);
});
for(const raw of ['160 Wohnfläche','1?8 m² Wohnfläche','160–180 m² Wohnfläche'])test('uncertain area before its label is retained for review: '+raw,()=>{
 const r=extract([page([raw])]);assert.equal(r.values.livingArea,undefined);assert.equal(r.requiresReview,true);
});
