const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),crypto=require('crypto');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const resolve=Module._resolveFilename;Module._resolveFilename=function(id,parent,...rest){return resolve.call(this,id.startsWith('@/')?path.resolve(id.slice(2)):id,parent,...rest);};
const {applyPremiumRepairScope:scope,repairSentenceFacts,repairPremiumVariants}=require('../lib/premium-editorial-generation.ts');
const {evaluatePremiumEditorialQuality:evaluate}=require('../lib/premium-editorial-quality.ts');
const {facts,examples}=require('./support/portable/fixtures/premium-7d.json');
const raw=fs.readFileSync(path.join(__dirname,'support/portable/fixtures/quality-8o-original.responses.jsonl'));
const texts=raw.toString().trim().split(/\r?\n/).map(JSON.parse).filter(x=>x.kind==='chat').map(x=>JSON.parse(x.response.choices[0].message.content).variant);
const issues=v=>evaluate(facts,[v]).findings.map(f=>f.code+': '+JSON.stringify(f));
test('all six actual 8O text responses remain immutable and retain concrete rejection reasons',()=>{
 a.equal(crypto.createHash('sha256').update(raw).digest('hex'),'486dc9147eed43928775d75a9dc6916c035cd43bffae90078ad3a48382f48e70');a.equal(texts.length,6);
 for(const v of texts)a.equal(evaluate(facts,[v]).passed,false,JSON.stringify(v));
});
for(const index of [4,5])test('real repair '+index+' preserves equipment/count meaning but still fails unsupported floors and parking location',()=>{
 const original=texts[1],candidate=texts[index];
 // Previous literal guard rejected the reworded equipment sentence. Current
 // guard accepts only that bounded preservation, never the entire candidate.
 const repaired=scope(original,candidate,issues(original),facts);
 a(repaired.text.includes('Wärmepumpe'));a(repaired.text.includes('Fußbodenheizung'));
 const r=evaluate(facts,[repaired]);a(r.findings.some(f=>f.field==='storeys'));a(r.findings.some(f=>f.field==='parkingLocation'));a.equal(r.passed,false);
});
test('bounded equipment paraphrases may split or combine sentences; unsupported effects do not satisfy them',()=>{
 const original={title:'Technik',text:'Zur technischen Ausstattung gehören eine Wärmepumpe und eine Fußbodenheizung, die das Haus beheizen.'};
 const candidate={...original,text:'Die Beheizung erfolgt mittels Wärmepumpe. Eine Fußbodenheizung ist vorhanden.'};
 a.deepEqual(scope(original,candidate,['MATERIAL_CLAIM_WITHOUT_EVIDENCE: {}'],facts),candidate);
 for(const text of ['Die Wärmepumpe ist sparsam und eine Fußbodenheizung ist vorhanden.','Eine Wärmepumpe steht im Garten. Eine Fußbodenheizung ist vorhanden.','Keine Wärmepumpe ist vorhanden. Eine Fußbodenheizung ist vorhanden.','Eine Wärmepumpe ist vorhanden.'])a.throws(()=>scope(original,{...original,text},['MATERIAL_CLAIM_WITHOUT_EVIDENCE: {}'],facts),/SAFE_CONTENT_LOST/);
});
test('unknown safe content cannot be erased or paraphrased by lexical similarity',()=>{
 const v={title:'Haus',text:'Der Balkon besitzt einen dokumentierten Zugang von der Küche.'};
 a.throws(()=>scope(v,{...v,text:'Ein Balkon ist vorhanden.'},['MATERIAL_CLAIM_WITHOUT_EVIDENCE: {}'],facts),/SAFE_CONTENT_LOST/);
 a.equal(repairSentenceFacts(v.text,facts),null);
});
test('missing or unsupported counts cannot masquerade as a harmless number-word rewrite',()=>{
 const v={title:'Ausstattung',text:'Zwei Badezimmer sind vorhanden.'};
 a.deepEqual(scope(v,{...v,text:'Die Immobilie hat 2 Badezimmer.'},['MATERIAL_CLAIM_WITHOUT_EVIDENCE: {}'],facts).text,'Die Immobilie hat 2 Badezimmer.');
 for(const text of ['Die Immobilie hat 3 Badezimmer.','Zwei Stellplätze sind vorhanden.'])a.throws(()=>scope(v,{...v,text},['MATERIAL_CLAIM_WITHOUT_EVIDENCE: {}'],facts),/SAFE_CONTENT_LOST/);
});
for(const [field,text]of [
 ['storeys','Die sechs Zimmer verteilen sich auf zwei Ebenen.'],['storeys','Das Haus erstreckt sich über drei Etagen.'],['storeys','Das Haus ist mehrgeschossig.'],['storeys','Die Immobilie hat zwei Stockwerke.'],
 ['constructionStandard','Die Ausstattung entspricht aktuellen Standards.'],['constructionStandard','Die technischen Merkmale erfüllen die geltenden Normen.'],['constructionStandard','Das Gebäude ist normkonform.'],['constructionStandard','Das Haus erfüllt alle Bauvorschriften.'],
 ['parkingLocation','Zwei Stellplätze sind auf dem Grundstück vorhanden.'],['parkingLocation','Auf dem Grundstück stehen zwei Stellplätze zur Verfügung.'],['parkingLocation','Auf dem 620 m² großen Grundstück befinden sich zwei Stellplätze.'],['parkingLocation','Direkt am Haus gibt es zwei Parkplätze.'],
 ['flexibleUse','Die Räume sind vielseitig nutzbar.'],['flexibleUse','Die Zimmer erlauben eine flexible Nutzung.']
])test('source-bound semantic family '+field+': '+text,()=>{
 const v={title:'Objekt',text};a(evaluate({},[v]).findings.some(f=>f.field===field));a(!evaluate({verifiedFeatures:text},[v]).findings.some(f=>f.field===field));
});
test('all original factual gaps are now detected, not merely the scope mismatch',()=>{
 a(evaluate(facts,[texts[0]]).findings.some(f=>f.field==='constructionStandard'));
 for(const v of [texts[1],texts[4],texts[5]]){const r=evaluate(facts,[v]);a(r.findings.some(f=>f.field==='storeys'));a(r.findings.some(f=>f.field==='parkingLocation'));}
});
test('six generic rooms remain ambiguous rather than being treated as an invented count',()=>{
 const r=evaluate({rooms:6},[{title:'Wohnung',text:'Die Wohnung verfügt über sechs Räume.'}]);a(r.findings.some(f=>f.field==='rooms'&&f.reason.includes('Begriffsunsicherheit')));
 a.equal(evaluate({rooms:6},[{title:'Wohnung',text:'Die Wohnung verfügt über sechs Zimmer.'}]).passed,true);
});
test('a newly defective repair is re-evaluated; a later valid candidate succeeds within the existing limit',async()=>{
 const v=examples.map(x=>({...x}));v[0].text+=' Das Haus ist normkonform.';let calls=0;
 const repaired=await repairPremiumVariants(facts,v,async()=>{calls++;return calls===1?{...v[0],text:examples[0].text+' Die Immobilie hat zwei Stockwerke.'}:examples[0];},()=>{});
 a.equal(calls,2);a.equal(repaired[0].text,examples[0].text);a.equal(repaired[1].text,examples[1].text);
});
test('length and format failure in a repair cannot be accepted as a complete set',async()=>{
 const v=examples.map(x=>({...x}));v[0].title='x';let calls=0;
 await a.rejects(repairPremiumVariants(facts,v,async x=>{calls++;return x;},()=>{}),/QUALITY_GATE_FAILED/);a.equal(calls,2);
});
test('three correct perspectives remain accepted unchanged with no repair',async()=>{
 let calls=0;const r=await repairPremiumVariants(facts,examples,async()=>{calls++;throw Error('NO_REPAIR_EXPECTED');},()=>{});a.deepEqual(r,examples);a.equal(calls,0);
});
