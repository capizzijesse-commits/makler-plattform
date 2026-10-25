const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),crypto=require('crypto');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const resolve=Module._resolveFilename;Module._resolveFilename=function(id,parent,...rest){return resolve.call(this,id.startsWith('@/')?path.resolve(id.slice(2)):id,parent,...rest);};
const {evaluatePremiumEditorialQuality:evaluate}=require('../lib/premium-editorial-quality.ts');
const {evaluatePremiumTextQuality,premiumTextSnapshot,PREMIUM_QUALITY_VERSION}=require('../lib/premium-quality-gate.server.ts');
const {selectAutopilotImages:select}=require('../lib/autopilot-image-quality.ts');
const {imageComparisonEvidence:comparison,fingerprintImageContent:fingerprint}=require('../lib/image-content-fingerprint.server.ts');
const {validateBrokerDecisions}=require('../lib/broker-review.ts');
const {applyPremiumRepairScope,assertRepairSourceFactsPreserved}=require('../lib/premium-editorial-generation.ts');
const {facts,examples}=require('./support/portable/fixtures/premium-7d.json');
const result=require('./support/portable/fixtures/quality-8k-original.result.json'),original=result.result.variants;
const raw=fs.readFileSync(path.join(__dirname,'support/portable/fixtures/quality-8k-original.responses.jsonl'));
const source=path.resolve(__dirname,'./support/portable/quality-validation-8k/runs/STARNBERG-QUALITY-8K-1ede5e40-6b34-41b1-b107-1c753c29868c');
test('real 8K results and all provider responses remain byte-identical',()=>{
 a(raw.equals(fs.readFileSync(path.join(source,'responses.jsonl'))));a(fs.readFileSync(path.join(__dirname,'support/portable/fixtures/quality-8k-original.result.json')).equals(fs.readFileSync(path.join(source,'result.json'))));
 a.equal(original.length,3);a.equal(raw.toString().trim().split(/\r?\n/).length,7);
});
for(const [i,fields] of [[0,['buildingCondition','energyCertification']],[1,['flexibleUse','constructionQuality','comfortEffect','heatingEffect']],[2,['energyCertification','locationQuality','heatingEffect']]])test('real variant '+(i+1)+' fails with concrete source-bound findings',()=>{
 const r=evaluate(facts,[original[i]]);a(!r.passed);for(const field of fields)a(r.findings.some(f=>f.field===field&&f.quote&&f.reason),field);
});
test('an empty successful model audit cannot override deterministic factual rejection',()=>{
 const audit={status:'passed',findings:[],snapshotHash:premiumTextSnapshot(facts,original)};
 const r=evaluatePremiumTextQuality(facts,original,audit);a.equal(r.passed,false);a(r.issues.includes('PREMIUM_EDITORIAL_QUALITY_FAILED'));a(!r.issues.includes('FACT_AUDIT_NOT_PASSED'));
});
for(const [field,sentence] of [
 ['buildingCondition','Die Technik gibt einen Überblick über den baulichen Zustand.'],
 ['flexibleUse','Die Fläche eignet sich für unterschiedliche Nutzungen.'],
 ['energyCertification','Das Haus ist mit der Energieeffizienzklasse A+ ausgezeichnet.'],
 ['locationQuality','Das Haus befindet sich in einer etablierten Lage.'],
 ['heatingEffect','Die Fußbodenheizung sorgt für Wärmeverteilung im Haus.'],
 ['comfortEffect','Zwei Badezimmer unterstützen den Komfort im Alltag.']
])test('claim family '+field+' requires explicit sentence evidence and permits it across object types',()=>{
 for(const propertyType of ['Wohnung','Einfamilienhaus','Gewerbeobjekt']){
 const v={title:propertyType,text:sentence};a(evaluate({propertyType},[v]).findings.some(f=>f.field===field));
 a(!evaluate({propertyType,verifiedFeatures:sentence},[v]).findings.some(f=>f.field===field));}
});
test('all source-safe examples remain valid; generic source-process endings are rejected',()=>{
 a.equal(evaluate(facts,examples).passed,true);
 for(const sentence of ['Diese Fakten bilden die Grundlage für eine sachliche Bewertung.','Dieses Angebot richtet sich an Interessenten, die Wert auf moderne Technik legen.'])a(evaluate({},[{title:'Wohnung',text:sentence}]).findings.some(f=>f.code==='LOW_INFORMATION_COPY'));
});
test('local factual repair preserves untouched sentences and known scalar data',()=>{
 const v=original[0],r=evaluate(facts,[v]);const removed=new Set(r.findings.map(f=>f.quote));
 const text=v.text.split(/(?<=[.!?])\s+/).map(s=>s.includes('Energieeffizienzklasse A+ ausgezeichnet')?'Die Energieeffizienzklasse ist mit A+ angegeben.':removed.has(s)?'':s).filter(Boolean).join(' ');
 const repaired=applyPremiumRepairScope(v,{...v,text},r.findings.map(f=>f.code+': '+JSON.stringify(f)));
 a(repaired.text.includes('178 m²'));a(repaired.text.includes('620 m²'));a(repaired.text.includes('1.390.000'));
 a.equal(evaluate(facts,[repaired]).passed,true);
 assertRepairSourceFactsPreserved(facts,v,repaired);
});
test('removing a false certification must not delete the supplied energy-class scalar',()=>{
 const v=original[0];a.throws(()=>assertRepairSourceFactsPreserved(facts,v,{...v,text:v.text.replace('Die Immobilie ist mit der Energieeffizienzklasse A+ ausgezeichnet.','')}),/SOURCE_FACT_LOST/);
});
let candidatesPromise;function candidates(){return candidatesPromise??=(async()=>{
 const base=path.resolve(__dirname,'./support/portable/quality-validation-8k'),manifest=JSON.parse(fs.readFileSync(path.join(base,'images-manifest.json')));
 const analyses=JSON.parse(fs.readFileSync(path.join(source,'images.json'))).analyses;
 return Promise.all(manifest.files.map(async x=>{const bytes=fs.readFileSync(path.join(base,x.file));a.equal(crypto.createHash('sha256').update(bytes).digest('hex'),x.sha256);return {imageId:x.id,fileName:x.file,contentFingerprint:await fingerprint(bytes),comparison:await comparison(bytes),analysis:analyses.find(v=>v.imageId===x.id)};}));
})();}
test('real compressed S08 is blocked alongside S01; darkness and different exterior views are not duplicates',async()=>{
 const rows=await candidates(),r=select(rows);const e=id=>r.entries.find(x=>x.imageId===id);
 a.equal(e('S08').duplicateOf,'S01');a(!r.selectedImageIds.includes('S08'));a(r.selectedImageIds.includes('S01'));
 a.equal(e('S09').duplicateOf,null);a.equal(e('S05').duplicateOf,null);a.equal(e('S06').duplicateOf,null);
 a(r.selectedImageIds.includes('S06'));a(!e('S06').reasons.includes('ROOM_OR_CATEGORY_UNCONFIRMED'));
 a.deepEqual(r.selectedImageIds,['S01','S06','S02','S03','S04']);a.equal(r.primaryImageId,'S01');
});
test('rotated S11 and its counterpart require explicit orientation review; fictional plan stays excluded',async()=>{
 const r=select(await candidates());for(const id of ['S05','S11']){const e=r.entries.find(x=>x.imageId===id);a(e.reasons.includes('ORIENTATION_REVIEW_REQUIRED'));a(!e.selected);}
 a(!r.selectedImageIds.includes('S07'));a(r.requiresReview);
});
test('manual orientation confirmation needs note; compressed duplicate and fictional plan cannot be overridden',async()=>{
 const rows=await candidates(),r=select(rows);
 const im=r.entries.find(x=>x.imageId==='S11');a.throws(()=>validateBrokerDecisions([{id:'S11',version:'v',reasons:im.reasons,analyzed:true,titleScore:90}],[{imageId:'S11',version:'v',decision:'accept',note:''}],['S11'],'S11'),/CONFIRMABLE/);
 for(const id of ['S07','S08']){const s=select(rows,{confirmedImageIds:[id],order:[id],primaryImageId:id});a(!s.selectedImageIds.includes(id));}
});
test('malformed supplied pixel evidence is rejected; no same-size heuristic',async()=>{
 const rows=await candidates();a.throws(()=>select([{...rows[0],comparison:{width:1,height:1,samples:'bad'}}]),/COMPARISON_INVALID/);
 const a0={...rows[0],analysis:{...rows[0].analysis},imageId:'A',contentFingerprint:'a'.repeat(64)},b0={...rows[1],analysis:{...rows[1].analysis},imageId:'B',contentFingerprint:'b'.repeat(64)};delete a0.analysis.imageId;delete b0.analysis.imageId;
 const r=select([a0,b0]);a.equal(r.entries[1].duplicateOf,null);
});
test('changed rule version prevents old quality receipts from silently passing',()=>{a.equal(PREMIUM_QUALITY_VERSION,'PREMIUM_FACT_EDITORIAL_GATE_8Z');a.notEqual(PREMIUM_QUALITY_VERSION,'PREMIUM_FACT_EDITORIAL_GATE_8R');});
