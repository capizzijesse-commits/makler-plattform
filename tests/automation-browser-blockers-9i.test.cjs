const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),p=require('path'),vm=require('vm'),ts=require('typescript');
function loader(mocks={}){const cache=new Map();return function load(file){file=p.resolve(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const requireLocal=id=>{if(Object.hasOwn(mocks,id))return mocks[id];if(id.startsWith('@/'))return load(id.slice(2)+'.ts');if(id.startsWith('.'))return load(p.resolve(p.dirname(file),id+'.ts'));if(id==='server-only')return {};return require(id);};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module:m,exports:m.exports,require:requireLocal,URL,Buffer,File,FormData,Headers,performance,process:{env:{},cwd:()=>process.cwd()},console:{info(){},warn(){},error(){},log(){}}});return m.exports;};}
const load=loader(),plain=x=>JSON.parse(JSON.stringify(x));
const source=JSON.parse(fs.readFileSync(p.resolve('tests/support/portable/browser-validation-9h/database-observed.json'))).sources[0];
const pages=source.documents[0].analysis.pages;
const {extractPdfStructuredFacts:extract}=load('lib/pdf-structured-facts.ts'),{applyDocumentedAutomationFacts:apply,automationTextFacts:canonical}=load('lib/automation-source-facts.ts'),{buildEditorialFactPlan:plan}=load('lib/listing-editorial-fact-plan.ts');
function doc(){return {documentAnalysis:source.documents[0].analysis,structuredFacts:extract(pages)};}
test('real unchanged 9H page evidence restores documented plot and equipment through fact plan',()=>{
 const result=apply(source.extracted,[doc()],'CH');a.equal(result.plotArea,'620');a.equal(result.rooms,'6');a.equal(result.livingArea,'178');for(const phrase of ['Baujahr 2020','2 Badezimmer','Wärmepumpe','Fussbodenheizung','Energieeffizienzklasse A+','2 Stellplätze'])a(result.highlights.includes(phrase),phrase);
 const facts=canonical(result,'CH'),editorial=plan(facts);a(editorial.required.some(x=>x.field==='plotArea'&&x.value==='620'));a(editorial.optional.some(x=>x.field==='verifiedFeatures'&&x.value.includes('Wärmepumpe')));a(!editorial.unknown.includes('plotArea'));a.equal(doc().structuredFacts.fields.find(x=>x.field==='plotArea').status,'reported');
});
test('uncertain OCR units, contradictory plots and unknown image equipment stay blocked',()=>{
 const uncertain=doc();uncertain.structuredFacts.requiresReview=true;a.throws(()=>apply(source.extracted,[uncertain],'CH'),/REVIEW/);
 const alternate=doc();alternate.structuredFacts.fields=alternate.structuredFacts.fields.map(f=>f.field==='plotArea'?{...f,value:700}:f);a.throws(()=>apply(source.extracted,[doc(),alternate],'CH'),/CONFLICT/);
 a.equal(apply({...source.extracted,highlights:'Pool',plotArea:999,imageAnalysis:'Garage'},[],'DE').highlights,'');a.equal(apply(source.extracted,[],'DE').plotArea,'');
});
test('DE/CH source normalization changes orthography without changing facts',()=>{a(apply(source.extracted,[doc()],'DE').highlights.includes('Fußbodenheizung'));a(!apply(source.extracted,[doc()],'CH').highlights.includes('ß'));});
test('planned, alternative or negated equipment never becomes confirmed equipment',()=>{
 for(const text of ['Heizung: Wärmepumpe geplant','Heizung: Wärmepumpe oder Gasheizung','Heizung: keine Wärmepumpe','Energieeffizienzklasse: A+ geplant','Fußbodenheizung optional']){
  const result=extract([{pageNumber:1,method:'native',words:[{text,confidence:null,box:[0,0,300,10],line:'one'}]}]);
  a(!result.fields.some(x=>['heatingSystem','floorHeating','energyClass'].includes(x.field)),text);
 }
});
test('actual generation preflight blocks changed, invalid and review-required source records before model access',async()=>{
 const text=fs.readFileSync('app/api/generate/route.ts','utf8'),tree=ts.createSourceFile('generate.ts',text,ts.ScriptTarget.Latest,true);let node;
 function visit(n){if(ts.isIfStatement(n)&&n.expression.getText(tree)==='body.sourceAssessmentId')node=n;ts.forEachChild(n,visit);}visit(tree);a(node);
 for(const sourceAudit of [{status:'failed',conflicts:[]},{status:'passed',conflicts:[{status:'unresolved'}]},{status:'passed',conflicts:[],documents:[{analysis:{requiresReview:true}}]},{status:'passed',conflicts:[]}]){
  const box={premiumSources:async()=>sourceAudit,premiumSourceContext:async()=> 'DOCUMENTED SOURCE',NextResponse:{json:(body,opts)=>({body,status:opts.status})}};
  vm.runInNewContext(ts.transpileModule('async function check(body){const user={id:"owner"};let verifiedSourceContext;'+node.getText(tree)+';return {body,verifiedSourceContext};}globalThis.check=check;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);
  const result=await box.check({sourceAssessmentId:'receipt',imageEvidence:['unconfirmed image observation'],imageAnalysis:'Pool'});
  if(sourceAudit.status==='passed'&&!sourceAudit.documents&&!sourceAudit.conflicts.length){a.equal(result.verifiedSourceContext,'DOCUMENTED SOURCE');a.equal(result.body.imageAnalysis,'');a.equal(result.body.imageEvidence.length,0);}else {a.equal(result.status,422);a.equal(result.body.code,'PREMIUM_SOURCE_AUDIT_REQUIRED');}
 }
});
async function extractionHandler(){let saved;const pdf={...doc(),rooms:6,documentText:source.sourceText};
 const mocks={'@/lib/pdf-document-facts.server':{extractPdfDocumentFacts:async()=>pdf,pdfDocumentReviewError:()=>Error('REVIEW')},'@/lib/premium-quality-store.server':{savePremiumAssessment:async(user,kind,payload)=>{saved=payload;return {id:'source-9i'};}},'@/lib/session':{getAuthenticatedUser:async()=>({id:'synthetic',plan:'pro'})},'@/lib/user-activity.server':{recordUserActivityEvent:async()=>{}},'@/lib/pdf-extract-property-photos.server':{extractPropertyPhotosFromPdf:async()=>({candidateCount:0,propertyPhotoCount:0,photos:[]})},'@/lib/automation-monitoring.server':{startAutomationMonitoringRun:async()=>null,recordAutomationMonitoringEvent:async()=>{},completeAutomationMonitoringRun:async()=>{},getMonitoringErrorFields:()=>({})},'next/server':{NextResponse:{json:(body,opts={})=>({body,status:opts.status||200})}},openai:{__esModule:true,default:class{constructor(){throw Error('AI_MUST_NOT_RUN');}}},'@vercel/blob':{del:async()=>{}}};
 const route=loader(mocks)('app/api/automation/extract-expose/route.ts'),form=new FormData();form.append('targetMarket','CH');form.append('skipPdfPhotoExtraction','true');form.append('files',new File(['%PDF synthetic'], 'synthetic.pdf',{type:'application/pdf'}));
 const response=await route.POST({headers:new Headers({'content-type':'multipart/form-data'}),formData:async()=>form});return {response,saved};
}
test('actual extract handler persists the same documented facts it returns without AI extraction',async()=>{const {response,saved}=await extractionHandler();a.equal(response.status,200,JSON.stringify(response.body));a.equal(response.body.extracted.plotArea,'620');a.deepEqual(plain(response.body.extracted),plain(saved.extracted));a(response.body.extracted.highlights.includes('2 Stellplätze'));a.equal(response.body.sourceAssessmentId,'source-9i');});
function functionFromUi(name,globals){const text=fs.readFileSync('app/automation/AutomationFlowV2.tsx','utf8'),tree=ts.createSourceFile('ui.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let node;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)node=n;ts.forEachChild(n,visit);}visit(tree);if(!node)throw Error('NO_FUNCTION');const box={File,FormData,...globals};vm.runInNewContext(ts.transpileModule(node.getText(tree)+'\nglobalThis.invoke='+name,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.invoke;}
test('actual UI uses identical canonical facts for generation and final validation with source ID',async()=>{
 const facts=apply(source.extracted,[doc()],'CH'),requests=[],signal=new AbortController().signal;
 const texts=JSON.parse(fs.readFileSync('tests/fixtures/editorial-gold-9b.json')).variants;
 let validated;const invoke=functionFromUi('generateListing',{automationTextFacts:canonical,sourceAssessmentRef:{current:'source-9i'},market:'CH',images:[],hasUnresolvedExposeConflicts:()=>false,isPlausibleAutomationLocation:()=>true,setStatusText(){},setVariants(){},buildSafeImageRoomPrompt:()=>'',fetch:async(url,init)=>{requests.push(JSON.parse(init.body));return {ok:true,json:async()=>({variants:texts,premiumTextQuality:{passed:true}})};},validatePremium:async(...args)=>{validated=canonical(args[0],'CH');}});
 await invoke(facts,[],signal,[],[],false);a.equal(requests[0].sourceAssessmentId,'source-9i');a.equal(requests[0].manualFactsConfirmed,false);for(const [key,value]of Object.entries(validated))a.deepEqual(plain(requests[0][key]),plain(value),key);
 const code=fs.readFileSync('app/automation/AutomationFlowV2.tsx','utf8');a(code.includes('form.append("facts", JSON.stringify(automationTextFacts('));
 const server=fs.readFileSync('app/api/generate/route.ts','utf8');a(server.indexOf('await premiumSources(user.id, body.sourceAssessmentId')<server.indexOf('const prompt =\n      buildGenerationPrompt'));a(server.includes('deliveredVariants, verifiedSourceContext, body.manualFactsConfirmed === true'));
});
const {selectAutomationUploads:select}=load('lib/automation-upload-input.ts');
const file=(name,type='image/jpeg')=>new File(['synthetic'],name,{type,lastModified:1});
test('PDF and twelve standalone fixtures enter the existing image pipeline together',async()=>{
 const pdf=file('synthetic.pdf','application/pdf'),images=Array.from({length:12},(_,i)=>file('S'+String(i+1).padStart(2,'0')+'.jpg'));
 let processed,error;const invoke=functionFromUi('handleIncomingFiles',{documentFiles:[],images:[],selectAutomationUploads:select,setError:x=>error=x,setDocumentFiles(){},setImages(){},setPreviewFiles(){},setStatusText(){},processFiles:async(d,i)=>{processed={documents:d,images:i};}});
 await invoke({target:{files:[pdf,...images],value:'selected'}});a.equal(error,undefined);a.equal(processed.documents.length,1);a.equal(processed.images.length,12);
});
test('adding an image retains current draft documents and previous images; duplicates are not appended twice',()=>{
 const pdf=file('synthetic.pdf','application/pdf'),one=file('S01.png','image/png'),two=file('S02.jpg');const result=select([pdf],[one],[one,two]);a.equal(result.documents[0],pdf);a.deepEqual([...result.images],[one,two]);
});
test('unknown types, empty files, oversized and excessive images are rejected',()=>{for(const files of [[file('evil.svg','image/svg+xml')],[new File([],'empty.png',{type:'image/png'})],[{name:'large.jpg',type:'image/jpeg',size:11*1024*1024,lastModified:1}],Array.from({length:21},(_,i)=>file(i+'.jpg'))])a.throws(()=>select([],[],files));});
test('actual image upload stays bound to existing listing and requires approved image selection',async()=>{
 const image=file('S01.png','image/png'),calls=[];const invoke=functionFromUi('uploadImagesForListing',{images:[image],collageDecisions:{},premiumApproval:{imageOrder:['1']},imageAnalyses:[],prepareImage:async f=>f,fetch:async(url,init)=>{calls.push({url,init});return {ok:true,json:async()=>({success:true,blob:{url:'http://127.0.0.1/image',pathname:'local/image'}})};}});
 await invoke('existing-draft');a.equal(calls[0].init.body.get('listingId'),'existing-draft');a.equal(JSON.parse(calls[1].init.body).listingId,'existing-draft');
 const blocked=functionFromUi('uploadImagesForListing',{images:[image],collageDecisions:{},premiumApproval:{imageOrder:[]}});await a.rejects(blocked('existing-draft'),/Qualitätsnachweis/);
});
const {simulateChat}=require('./support/portable/browser-validation-9i/simulator.cjs');
const historical=fs.readFileSync(p.resolve('tests/support/portable/browser-validation-9h/simulated-provider.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
test('all three actual 9H generation requests now receive CH fixture responses without ß',()=>{for(const row of historical.slice(0,3)){const response=simulateChat({model:'gpt-4.1-mini',messages:row.messages});a.equal(response.kind,'initial_text');a.equal(response.market,'CH');a(response.data.variant.title);a(!/ß|ẞ/.test(JSON.stringify(response.data)));}});
test('actual 9H repair prompt returns repairs only, never an audit result',()=>{const response=simulateChat({model:'gpt-4o-mini',messages:historical[3].messages});a.equal(response.kind,'targeted_repair');a(Array.isArray(response.data.repairs));a(!('findings'in response.data));a(response.data.repairs.every(x=>x.variantNumber>=1&&x.variantNumber<=3&&x.title&&x.text));a(!/ß|ẞ/.test(JSON.stringify(response.data)));});
test('audit and repair operations remain distinct even for the same model; DE keeps ß',()=>{
 const audit=simulateChat({model:'gpt-4o-mini',messages:[{role:'system',content:'You are the HARD FACT auditor for Inserat-AI.'}]});a.equal(audit.kind,'fact_audit');a.deepEqual(audit.data.checkedVariants,[1,2,3]);
 const gen=simulateChat({messages:[{role:'system',content:'You are the senior real estate editorial engine of Inserat-AI for the German market.'},{role:'user',content:'ASSIGNED VARIANT:\n1'}]});a(gen.data.variant.text.includes('ß'));
 a.throws(()=>simulateChat({messages:[{role:'system',content:'Unknown contract'}]}),/UNCONFIRMED/);
});
