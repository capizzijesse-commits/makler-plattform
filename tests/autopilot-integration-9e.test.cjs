const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),p=require('path'),ts=require('typescript'),Module=require('module');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const resolve=Module._resolveFilename;Module._resolveFilename=function(id,parent,...rest){return resolve.call(this,id.startsWith('@/')?p.resolve(id.slice(2)):id,parent,...rest);};
const {buildConfirmedAutopilotFacts:build}=require('../lib/autopilot-confirmed-facts.ts');
const base={locale:'de',market:'DE',location:'Bonn',propertyType:'Einfamilienhaus',rooms:6,livingArea:178,price:1390000,currency:'EUR',marketingType:'sale'};
const field=(field,value,status='reported')=>({field,value,status,evidence:[{page:1,text:String(value)}]});
const doc={structuredFacts:{requiresReview:false,fields:[field('plotArea',620),field('constructionYear',2020),field('bathrooms',2),field('heatingSystem','Wärmepumpe'),field('floorHeating','Fussbodenheizung'),field('energyClass','A+'),field('parkingSpaces',2)]}};
test('confirmed shared facts include document plot/currency/offer and only supported equipment',()=>{
 const x=build(base,[doc]);a.equal(x.plotArea,620);a.equal(x.currency,'EUR');a.equal(x.marketingType,'sale');a(x.verifiedFeatures.includes('2 Badezimmer'));a(x.verifiedFeatures.includes('Fußbodenheizung'));a.equal(x.highlights,x.verifiedFeatures);a.equal(x.imageAnalysis,'');a(!String(x.verifiedFeatures).includes('Garage'));
});
test('ambiguous documents and conflicting values remain blocking, AI-only plot excluded',()=>{
 a.throws(()=>build(base,[{documentAnalysis:{requiresReview:true}}]),/REVIEW/);a.throws(()=>build(base,[doc,{structuredFacts:{fields:[field('plotArea',700)]}}]),/CONFLICT/);a.throws(()=>build(base,[doc],{plotArea:700}),/CONFLICT/);a.equal(build({...base,plotArea:999,verifiedFeatures:'Garage',imageAnalysis:'Pool'},[]).plotArea,undefined);a.equal(build(base,[{structuredFacts:{fields:[field('floorHeating','heated all rooms','uncertain')]}}]).verifiedFeatures,'');
});
for(const offer of [{marketingType:'rent',price:1400,currency:'CHF',rentPeriod:'month'},{marketingType:'on_request',price:null,priceOnRequestConfirmed:true,transactionType:'sale'},{propertyType:'Gewerbe',marketingType:'rent',commercialArea:300,commercialUse:'Büro',price:2500,currency:'EUR',rentPeriod:'month'}])test('explicit reviewed special-case metadata preserved '+JSON.stringify(offer),()=>{const x=build(base,[],offer);for(const [key,value]of Object.entries(offer))a.equal(x[key],key==='price'&&value!==null?String(value):value===null&&key==='price'?undefined:value);});

// Reuse the real handler/service harnesses without running or altering their tests.
function helpers(file,marker,code,transform=x=>x){const m={exports:{}};const text=fs.readFileSync(p.join(__dirname,file),'utf8');new Function('require','module','exports','__dirname',transform(text.slice(0,text.indexOf(marker)))+'\n'+code)(require,m,m.exports,__dirname);return m.exports;}
const direct=helpers('autopilot-expose-core-conflicts.test.cjs','for (const [name, docs','module.exports={runRoute};',s=>s.replace('checkAndRecordPremiumQuality: async () => (','checkAndRecordPremiumQuality: async input => (calls.finalFacts=input.facts, ').replace('documentText: bytes.toString(),','documentText: bytes.toString(), structuredFacts:options.structuredFacts,'));
test('actual direct POST without qualityFacts passes identical facts to generation and final gate',async()=>{
 const {calls}=await direct.runRoute(['Zimmer: 6\nWohnfläche: 178 m²\nKaufpreis: EUR 1390000'],{rooms:6,livingArea:178,price:1390000,currency:'EUR'},{structuredFacts:doc.structuredFacts});
 a.equal(calls.generated.length,1);a.equal(calls.generated[0],calls.finalFacts);a.equal(calls.finalFacts.plotArea,620);a.equal(calls.finalFacts.marketingType,'sale');a.equal(calls.finalFacts.currency,'EUR');a(calls.finalFacts.verifiedFeatures.includes('Wärmepumpe'));
});
const broker=helpers('broker-review-v1.test.cjs',"test('offline end-to-end",'module.exports={reviewHarness};',s=>s.replace('return {load:l,','return {prisma,load:l,'));
async function harness(){
 const h=await broker.reviewHarness(),variants=JSON.parse(h.listing.generatedVariants);await h.save();h.listing.generatedVariants=null;
 await h.load('lib/premium-quality-store.server.ts').savePremiumAssessment('owner','autopilot_draft',{facts:{...h.listing,images:undefined,generatedVariants:undefined,locale:'de',currency:'CHF',marketingType:'sale'},sourceAssessmentId:null},'listing');
 const create=h.prisma.premiumQualityAssessment.create;h.prisma.premiumQualityAssessment.create=async args=>{if(args.data.id){if(h.records.some(x=>x.id===args.data.id))throw Object.assign(Error('duplicate'),{code:'P2002'});const r=await create(args);r.id=args.data.id;return r;}return create(args);};
 h.prisma.listing.updateMany=async({where,data})=>{if(h.listing.updatedAt.getTime()!==where.updatedAt.getTime())return {count:0};Object.assign(h.listing,data);return {count:1};};
 let calls=0,sourceFacts;h.load('lib/listing-text-engine.server.ts').generateListingTextVariants=async facts=>{calls++;sourceFacts=facts;return {variants,locale:'de',market:'CH'};};
 return {...h,variants,calls:()=>calls,sourceFacts:()=>sourceFacts};
}
test('stored image review resumes generation, saves three texts and technical READY without human approval',async()=>{
 const h=await harness();await h.save();const s=await h.state();const r=await h.post({action:'generate',snapshot:s.snapshot,manualConfirmed:true,facts:{locale:'de',currency:'CHF',marketingType:'sale'}});
 a.equal(r.status,200,JSON.stringify(r.body));a.equal(r.body.textsGenerated,true);a.equal(r.body.ready,true);a.equal(r.body.brokerApproved,false);a.equal(h.calls(),1);a.equal(JSON.parse(h.listing.generatedVariants).length,3);a.equal(await h.service.isListingPremiumPublicationReady('owner','listing'),false);
 const final=[...h.records].reverse().find(x=>x.kind==='final');a.deepEqual(JSON.parse(JSON.stringify(final.payload.facts)),JSON.parse(JSON.stringify(h.sourceFacts())));
});
test('open decisions and missing explicit confirmation never generate',async()=>{
 const h=await harness();const s=await h.state();a.equal((await h.post({action:'generate',snapshot:s.snapshot})).status,422);a.equal((await h.post({action:'generate',snapshot:s.snapshot,manualConfirmed:true})).status,422);a.equal(h.calls(),0);
});
test('parallel resumes and repeat after provider failure consume one durable claim',async()=>{
 const h=await harness();await h.save();const s=await h.state();let sends=0;h.load('lib/listing-text-engine.server.ts').generateListingTextVariants=async()=>{sends++;await Promise.resolve();throw Error('SIMULATED_PROVIDER_TIMEOUT');};
 const request={action:'generate',snapshot:s.snapshot,manualConfirmed:true,facts:{locale:'de',currency:'CHF',marketingType:'sale'}};const results=await Promise.all([h.post(request),h.post(request)]);a(results.every(x=>x.status===422));a.equal(sends,1);a.equal((await h.post(request)).status,422);a.equal(sends,1);a.equal(h.records.filter(x=>x.kind==='autopilot_resume').length,1);
});
test('both entrypoints route image review into same editor; resume UI never implies publication',()=>{
 for(const file of ['app/autopilot/page.tsx','app/components/AutomationPublishOverlay.tsx']){const s=fs.readFileSync(file,'utf8');a(s.includes('AUTOPILOT_IMAGE_REVIEW_REQUIRED'));a(s.includes('/edit?review='));}
 const ui=fs.readFileSync('app/cockpit/[id]/edit/BrokerReviewPanel.tsx','utf8');a(ui.includes('action("generate")'));a(ui.includes('!confirmed||unsavedImages'));a(ui.includes('Noch kein fertiger Textentwurf'));
});
test('actual targeted repair request carries full plan and exact missing fact, retaining German market',async()=>{
 const vm=require('vm'),text=fs.readFileSync('app/api/generate/route.ts','utf8'),tree=ts.createSourceFile('generate.ts',text,ts.ScriptTarget.Latest,true);
 const node=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='requestTargetedVariantRepairs'),g=require('../lib/premium-editorial-generation.ts');
 const box={getFailingVariantIndexes:()=>[0],...g};vm.runInNewContext(ts.transpileModule(node.getText(tree)+';globalThis.call=requestTargetedVariantRepairs',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);
 let request;await a.rejects(box.call({chat:{completions:{create:async r=>{request=r;throw Error('OFFLINE_CAPTURE');}}}},{market:'DE',targetLanguage:'German',facts:base},'de',[{title:'Haus in Bonn',text:'Ein Haus mit 178 m² Wohnfläche für 1390000 EUR.'}],{issues:[{severity:'error',variantIndex:0,code:'CORE_FACT_NOT_PRESENT',message:'missing rooms'}]}),/OFFLINE_CAPTURE/);
 const prompt=request.messages.map(x=>x.content).join('\n');a(prompt.includes('EDITORIAL_FACT_PLAN_9C'));a(prompt.includes('PRIORITY REQUIRED-FACT INSERTIONS'));a(prompt.includes('"field":"rooms","value":6'));a(prompt.includes('Keep German orthography'));a(!prompt.includes('85 to 120 words'));
 a.equal((text.match(/if\(\+\+aiRepairAttempts>2\)/g)||[]).length,3);
});
test('relevant edits after resumed generation invalidate technical readiness and broker approval',async()=>{
 const h=await harness();await h.save();const s=await h.state();const r=await h.post({action:'generate',snapshot:s.snapshot,manualConfirmed:true,facts:{locale:'de',currency:'CHF',marketingType:'sale'}});a.equal(r.body.ready,true);a.equal((await h.approve()).body.brokerApproved,true);h.listing.locationDescription='Geänderter Standorttext';h.listing.updatedAt=h.stamp();a.equal(await h.service.isListingPremiumPublicationReady('owner','listing'),false);
});
test('stale snapshot or concurrent edits cannot save generated content as approved',async()=>{
 const h=await harness();await h.save();const s=await h.state();let calls=0;
 h.load('lib/listing-text-engine.server.ts').generateListingTextVariants=async()=>{calls++;h.listing.locationDescription='Changed during generation';h.listing.updatedAt=h.stamp();return {variants:h.variants};};
 const r=await h.post({action:'generate',snapshot:s.snapshot,manualConfirmed:true,facts:{locale:'de',currency:'CHF',marketingType:'sale'}});a.equal(r.status,422);a.equal(calls,1);a.equal(h.listing.generatedVariants,null);a.equal(await h.service.isListingPremiumPublicationReady('owner','listing'),false);
});
