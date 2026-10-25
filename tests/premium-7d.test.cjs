const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const resolve=Module._resolveFilename;Module._resolveFilename=function(id,parent,...rest){return resolve.call(this,id.startsWith('@/')?path.resolve(id.slice(2)):id,parent,...rest);};
const fixture=require('./support/portable/fixtures/premium-7d.json'),{facts,examples,originalVariants}=fixture;
const {evaluatePremiumEditorialQuality:evaluate}=require('../lib/premium-editorial-quality.ts');
const {premiumEditorialAngle,premiumGenerationContract,premiumRepairInstructions,repairPremiumVariants}=require('../lib/premium-editorial-generation.ts');
const {evaluatePremiumTextQuality}=require('../lib/premium-quality-gate.server.ts');
const {selectAutopilotImages:select,validateAutopilotImageAnalyses:validate}=require('../lib/autopilot-image-quality.ts');
test('stored V4 set fails with precise 7C claims, filler and perspective findings',()=>{
 const r=evaluate(facts,originalVariants);assert.equal(r.passed,false);
 for(const field of ['heatingPerformance','energyDemand','constructionQuality']){const f=r.findings.find(x=>x.field===field);assert(f,field);assert(f.quote);assert(f.reason.includes('fehlt'));}
 assert(r.findings.some(x=>x.code==='LOW_INFORMATION_COPY'&&x.quote.includes('beanspruchen')));
 assert(r.findings.some(x=>x.code==='EDITORIAL_OPENING_STRATEGY_REUSED'));
});
for(const phrase of ['Eine effiziente Wärmepumpe ist vorhanden.','Die Wärmepumpe arbeitet sparsam.','Die Klasse weist auf einen niedrigen Energiebedarf hin.','Das Haus hat eine zeitgemäße Bauweise.','Das Objekt hat eine durchdachte technische Ausstattung.'])test('claim requires its own source: '+phrase,()=>{
 const v=examples.map(x=>({...x}));v[0].text+=' '+phrase;assert(evaluate(facts,v).findings.some(x=>x.code==='MATERIAL_CLAIM_WITHOUT_EVIDENCE'&&x.quote.includes(phrase)));
 const sourced={...facts,verifiedFeatures:facts.verifiedFeatures+'; '+phrase};assert(!evaluate(sourced,v).findings.some(x=>x.code==='MATERIAL_CLAIM_WITHOUT_EVIDENCE'&&x.quote.includes(phrase)));
});
test('editorial examples retain known facts without claiming a real audit',()=>{
 assert.equal(evaluate(facts,examples).passed,true,JSON.stringify(evaluate(facts,examples)));
 const q=evaluatePremiumTextQuality(facts,examples,null);assert.equal(q.quality.passed,true,JSON.stringify(q));assert.deepEqual(q.issues,['FACT_AUDIT_NOT_PASSED']);
 for(const v of examples){assert(v.text.includes('178 m²'));assert(v.text.includes('620 m²'));assert(/sechs Zimmer/.test(v.text));assert(v.text.includes('1.390.000 EUR'));assert(v.text.includes('2020'));assert(v.text.includes('A+'));assert(v.text.includes('Wärmepumpe'));assert(v.text.includes('Fußbodenheizung'));assert(/zwei Badezimmer/i.test(v.text));assert(/zwei Stellplätze/i.test(v.text));}
});
test('plans follow architectural, residential and offer ordering without invented architecture',()=>{
 assert(premiumEditorialAngle(0).startsWith('ARCHITECTURAL FACTUAL'));assert(premiumEditorialAngle(1).startsWith('WARM RESIDENTIAL'));assert(premiumEditorialAngle(2).startsWith('COMPACT FACTUAL'));
 const c=premiumGenerationContract(facts);assert(c.includes('never permits invented facade'));assert(c.includes('does not prove device efficiency'));assert(c.includes('metacommentary'));
 assert(premiumRepairInstructions(['MATERIAL_CLAIM_WITHOUT_EVIDENCE']).includes('Remove unsupported efficiency'));
});
test('unsupported efficiency in title is not hidden by an otherwise valid body',()=>{
 const v=examples.map(x=>({...x}));v[0].title='Effiziente Wärmepumpe im Einfamilienhaus in Starnberg';assert(evaluate(facts,v).findings.some(x=>x.code==='MATERIAL_CLAIM_WITHOUT_EVIDENCE'&&x.quote===v[0].title));
});
test('repeated full information sentence is flagged without banning recurring facts across variants',()=>{
 const v=examples.map(x=>({...x}));v[0].text+=' '+v[0].text.split(/(?<=[.!?])\s+/)[0];assert(evaluate(facts,v).findings.some(x=>x.code==='LOW_INFORMATION_COPY'&&x.reason.includes('wiederholt')));
 assert.equal(evaluate(facts,examples).passed,true);
});
test('same heating-first angle is detected even with different wording',()=>{
 const v=examples.map(x=>({...x}));v[0]={title:'Wärmepumpe im Einfamilienhaus in Starnberg',text:'Eine Wärmepumpe gehört zur Ausstattung. '+examples[0].text};v[1]={title:'Fußbodenheizung für das Haus in Starnberg',text:'Mit einer Fußbodenheizung ist das Haus ausgestattet. '+examples[1].text};assert(evaluate(facts,v).findings.some(x=>x.code==='EDITORIAL_OPENING_STRATEGY_REUSED'));
});
test('single unsupported inference is repaired without changing correct neighbours',async()=>{
 const v=examples.map(x=>({...x}));v[1].text+=' Eine effiziente Wärmepumpe ist vorhanden.';let calls=0;
 const result=await repairPremiumVariants(facts,v,async(_v,issues,index)=>{calls++;assert.equal(index,1);assert(issues.join(' ').includes('heatingPerformance'));return examples[1];},()=>{});
 assert.equal(calls,1);assert.equal(result[0].text,examples[0].text);assert.equal(result[2].text,examples[2].text);
});
const candidates=()=>{const analyses=validate(fixture.imageCandidates.map(c=>({...c.analysis,room:c.analysis.room??''})),7);return fixture.imageCandidates.map((c,i)=>({...c,analysis:analyses[i]}));};
test('real stored image scores stay review-bound; no silent acceptance of variety candidates',()=>{
 const c=candidates(),snapshot=JSON.stringify(c),r=select(c);assert.deepEqual(r.selectedImageIds,['F03','F04']);assert.equal(r.primaryImageId,'F03');assert(r.requiresReview);for(const id of fixture.galleryProposal.pending)assert(!r.selectedImageIds.includes(id));assert.equal(JSON.stringify(c),snapshot);
});
test('explicitly simulated broker selection removes similar views without deleting originals',()=>{
 const c=candidates(),before=JSON.stringify(c),order=fixture.galleryProposal.order;
 const r=select(c.filter(x=>order.includes(x.imageId)),{confirmedImageIds:order,order,primaryImageId:'F04'});
 assert.deepEqual(r.selectedImageIds,order);assert.equal(r.primaryImageId,'F04');assert.equal(c.length,7);assert.equal(JSON.stringify(c),before);
 for(const pair of fixture.galleryProposal.similarPairs)assert.equal(pair.filter(id=>r.selectedImageIds.includes(id)).length,1);
});
test('manual variation cannot override contradictory classification or content duplicates',()=>{
 const c=candidates().filter(x=>['F03','F04'].includes(x.imageId));c[0].analysis={...c[0].analysis,room:'Wohnzimmer',category:'bathroom'};c[1].contentFingerprint=c[0].contentFingerprint;
 const r=select(c,{confirmedImageIds:['F03','F04'],order:['F03','F04'],primaryImageId:'F03'});assert(!r.selectedImageIds.includes('F03'));assert(!r.selectedImageIds.includes('F04'));assert(r.requiresReview);
});
