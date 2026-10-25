const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),crypto=require('crypto');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const resolve=Module._resolveFilename;Module._resolveFilename=function(id,parent,...rest){return resolve.call(this,id.startsWith('@/')?path.resolve(id.slice(2)):id,parent,...rest);};
const g=require('../lib/premium-editorial-generation.ts'),q=require('../lib/premium-editorial-quality.ts'),{selectAutopilotImages:select}=require('../lib/autopilot-image-quality.ts');
const root=path.resolve(__dirname,'./support/portable/quality-validation-8t'),run=root+'/runs/STARNBERG-QUALITY-8T-a713412e-3a10-4753-8127-3ab551dc0a4e',facts=require(root+'/inputs/engine-input.synthetic.json');
const raw=fs.readFileSync(__dirname+'/support/portable/fixtures/quality-8t-original.responses.jsonl'),rows=raw.toString().trim().split(/\r?\n/).map(JSON.parse),texts=rows.filter(x=>x.kind==='chat').map(x=>JSON.parse(x.response.choices[0].message.content).variant);
const {examples}=require('./support/portable/fixtures/premium-7d.json');
test('six genuine provider responses remain byte-identical; five reconstructed prompt hashes match',()=>{
 a.equal(rows.length,6);a(raw.equals(fs.readFileSync(run+'/responses.jsonl')));a.equal(crypto.createHash('sha256').update(raw).digest('hex'),'488fc416e4fdc5c0eb098f9aa774b5e276a750d78cde9564e4393dac0a6a6a71');
 const reconstructed=require('./support/portable/rc-validation-8z/original-prompts.json');a.equal(reconstructed.requests.length,5);
 const expected=fs.readFileSync(run+'/requests.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse).filter(x=>x.kind==='chat');for(const [i,x] of reconstructed.requests.entries()){a.equal(x.sha256,expected[i].bodyHash);a(JSON.stringify(x.body).includes('rooms'));}
});
for(const i of [0,2,3,4])test('real missing-room response '+i+' fails precise core coverage',()=>{
 const req=g.missingCoreFactRequirements(facts,texts[i]);a(req.some(x=>x.field==='rooms'&&x.value===6&&x.semanticLabel==='Zimmer'));a(g.coreFactRepairBrief(facts,texts[i]).includes('mandatory repair acceptance condition'));
});
test('two real ineffective repair candidates never overwrite the original or pass',async()=>{
 let calls=0;const original=[texts[0],examples[1],examples[2]];
 await a.rejects(g.repairPremiumVariants(facts,original,async(v,issues)=>{a.equal(v.text,texts[0].text);if(calls===1)a(issues.join().includes('CORE_FACT_REPAIR_INEFFECTIVE'));return texts[3+calls++];},()=>{}),/QUALITY_GATE_FAILED/);a.equal(calls,2);a.equal(original[0].text,texts[0].text);
});
test('specific source-based room insertion preserves valid sentences and distinct siblings',async()=>{
 const good=examples.map(x=>({...x})),bad=good.map(x=>({...x}));for(const field of ['title','text'])bad[0][field]=bad[0][field].replace(/\b(?:6|sechs)[- ]Zimmer/gi,'Zimmer');
 const corrected={...bad[0],text:bad[0].text+' Die Immobilie verfügt über 6 Zimmer.'};
 let calls=0;const result=await g.repairPremiumVariants(facts,bad,async(v,issues)=>{calls++;a(issues.some(x=>x.startsWith('CORE_FACT_NOT_PRESENT')));return corrected;},()=>{});
 a.equal(calls,1);a.equal(result[0].text,corrected.text);a.deepEqual(result.slice(1),good.slice(1));a.equal(g.missingCoreFactRequirements(facts,result[0]).length,0);
});
test('actual emotional answer exposes all four source-bound claim families',()=>{
 const findings=q.evaluatePremiumEditorialQuality(facts,[texts[1]]).findings;
 for(const field of ['plotBoundary','floorHeatingCoverage','designFreedom','parkingAllocation'])a(findings.some(f=>f.field===field&&f.quote&&f.reason),field);
});
for(const [field,text] of [['plotBoundary','Das Grundstück schafft eine klare Abgrenzung zur Umgebung.'],['floorHeatingCoverage','Die Fußbodenheizung ist in den Wohnräumen installiert.'],['floorHeatingCoverage','Eine Fußbodenheizung ist im Badezimmer vorhanden.']])test('specific evidence required for '+text,()=>{
 a(q.evaluatePremiumEditorialQuality({},[{title:'Objekt',text}]).findings.some(x=>x.field===field));
 a(!q.evaluatePremiumEditorialQuality({verifiedFeatures:text},[{title:'Objekt',text}]).findings.some(x=>x.field===field));
});
test('equipment and plot scalar values do not become unsupported relationships',()=>{
 const v={title:'Haus',text:'Das Grundstück umfasst 620 m². Eine Fußbodenheizung ist vorhanden. Zwei Stellplätze sind vorhanden.'};a(!q.evaluatePremiumEditorialQuality({},[v]).findings.some(x=>['plotBoundary','floorHeatingCoverage','parkingAllocation'].includes(x.field)));
});
test('actual repair request carries the exact missing source value and priority insertion contract',async()=>{
 const engine=require('../lib/listing-text-engine.server.ts'),requests=[];let index=0;
 await a.rejects(engine.generateListingTextVariants(facts,{openai:{chat:{completions:{create:async body=>{requests.push(body);const response=rows.filter(x=>x.kind==='chat')[index++]?.response;if(!response)throw Error('NO_EXTRA_DUMMY');return response;}}}}}),/QUALITY_GATE_FAILED/);
 a.equal(requests.length,5);for(const request of requests.slice(3)){const prompt=request.messages.map(x=>x.content).join('\n');a(prompt.includes('PRIORITY REQUIRED-FACT INSERTIONS'));a(prompt.includes('"field":"rooms","value":6,"semanticLabel":"Zimmer"'));}
 a(requests[0].messages.some(x=>x.content.includes('CORE FACT COVERAGE CHECKLIST')));
});
test('a fixed room count cannot excuse a new unproven statement in repaired copy',async()=>{
 const bad=examples.map(x=>({...x}));bad[0].text+=' Das Haus entspricht aktuellen Standards.';let calls=0;
 await a.rejects(g.repairPremiumVariants(facts,bad,async()=>{calls++;return bad[0];},()=>{}),/QUALITY_GATE_FAILED/);a.equal(calls,2);
});
test('new review policy invalidates prior image decision version',()=>{
 const {imageReviewVersion}=require('../lib/broker-review.ts'),{stableQualityHash}=require('../lib/premium-quality-gate.server.ts');
 const x={id:'image',storageKey:'test',analysis:'{}',analysisStatus:'ANALYZED',analyzedAt:null},fingerprint='test';
 const old=stableQualityHash({id:x.id,storageKey:x.storageKey,analysis:x.analysis,status:x.analysisStatus,analyzedAt:null,fingerprint});
 a.notEqual(imageReviewVersion(x,fingerprint),old);
});
const images=require(run+'/images.json'),comparison=require(root+'/image-comparison-evidence.json');
const candidates=images.analyses.map((analysis,i)=>({imageId:analysis.imageId,fileName:analysis.imageId+'.jpg',analysis,contentFingerprint:comparison.images[i].contentFingerprint,comparison:comparison.images[i].comparison}));
test('unchanged S12 hallucination is deferred without claiming category correction',()=>{
 const rawVision=JSON.parse(rows[0].response.output[0].content.find(x=>x.type==='output_text').text).imageAnalyses;a.equal(rawVision.find(x=>x.imageId==='S12').category,'exterior');
 const s=select(candidates);a(!s.selectedImageIds.includes('S12'));a(s.entries.find(x=>x.imageId==='S12').reasons.includes('SCENE_CONTEXT_REVIEW_REQUIRED'));a.equal(s.entries.find(x=>x.imageId==='S12').analysis.category,'exterior');a.equal(s.primaryImageId,'S01');a(s.requiresReview);
 a.deepEqual(s.selectedImageIds,['S01','S06','S02','S03','S04']);a.equal(s.entries.find(x=>x.imageId==='S08').duplicateOf,'S01');for(const id of ['S07','S09','S10','S11'])a(!s.selectedImageIds.includes(id));
});
test('sufficient full-frame exterior still accepted; small exterior requires explicit review',()=>{
 const exterior={...candidates[5],imageId:'other',analysis:{...candidates[5].analysis,imageId:'other',imageIndex:1}};
 a(select([exterior]).selectedImageIds.includes('other'));
 const small={...exterior,comparison:{...exterior.comparison,width:240,height:140}};a(!select([small]).selectedImageIds.includes('other'));
 const reviewed=select([small],{confirmedImageIds:['other'],order:['other'],primaryImageId:'other'});a(reviewed.selectedImageIds.includes('other'));a(reviewed.entries[0].reviewedReasons.includes('SCENE_CONTEXT_REVIEW_REQUIRED'));
});
