/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS. */
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
const sharp = require("sharp"), crypto = require("node:crypto");
const plain = value => JSON.parse(JSON.stringify(value));
function loader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const requireLocal = id => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === "node:crypto") return crypto;
      if (id === "sharp") return { __esModule: true, default: sharp };
      if (id === "server-only") return {};
      if (id.startsWith("@/")) return load(id.slice(2) + ".ts");
      if (id.startsWith(".")) return load(path.resolve(path.dirname(file), id + ".ts"));
      throw Error("UNMOCKED_IMPORT: " + id);
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
      { module: mod, exports: mod.exports, require: requireLocal, Buffer, File, URL,
        process: { env: { OPENAI_API_KEY: "MOCK_ONLY" } }, console: { info() {}, warn() {}, error() {} }, ...globals }, { filename: file });
    return mod.exports;
  }
  return load;
}
const load = loader();
const gate = load("lib/premium-quality-gate.server.ts");
const { validateAutopilotImageAnalyses: validate } = load("lib/autopilot-image-quality.ts");
const variants = [
  {
    "title": "3-Zimmer-Wohnung mit Balkon in Schaffhausen",
    "text": "Diese 3-Zimmer-Wohnung in Schaffhausen verfügt über eine Wohnfläche von 85 m². Zur Ausstattung gehören ein Balkon, Parkettboden und eine separate Küche. Der Kaufpreis beträgt 450000 CHF. Die Küche ist vom übrigen Wohnbereich getrennt."
  },
  {
    "title": "Schaffhausen: Wohnung mit separater Küche",
    "text": "Die separate Küche zählt zu den Merkmalen dieser Wohnung. Ergänzt wird das Angebot durch einen Balkon und Parkettboden. Die Wohnung umfasst 3 Zimmer bei einer Wohnfläche von 85 m² und liegt in Schaffhausen. Der Kaufpreis beträgt 450000 CHF."
  },
  {
    "title": "Balkon und Parkett prägen das Angebot",
    "text": "Ein Balkon und Parkettboden gehören zur Ausstattung dieser Wohnung in Schaffhausen. Die Wohnfläche beträgt 85 m² bei insgesamt 3 Zimmern. Eine separate Küche ist ebenfalls vorhanden. Angeboten wird die Immobilie zum Kauf für 450000 CHF."
  }
];
const facts = { locale: "de", market: "CH", propertyType: "Wohnung", location: "Schaffhausen", rooms: 3, livingArea: 85, price: 450000,
  currency: "CHF", marketingType: "sale", transactionType: "sale", verifiedFeatures: "Balkon, Parkettboden, separate Küche", highlights: "Balkon, Parkettboden, separate Küche" };
const raw = (index = 1, extra = {}) => ({ imageIndex: index, room: "livingRoom", roomConfidence: .95, roomIndependentFacts: [{ fact: "Fenster", confidence: .95 }], condition: "", visibleFacts: [], category: "living", qualityScore: 90, titleScore: 90, sharpnessScore: 90, exposureScore: 90, suitable: true, suitabilityConfidence: .95, suitabilityReason: "Klar erkennbares Motiv", ...extra });
const image = { imageId: "1", fileName: "image.png", contentFingerprint: "a".repeat(64), analysis: validate([raw()], 1)[0] };

async function reviewHarness(options={}){
 const records=[],blobs=new Map();let tick=0;const stamp=()=>new Date(1800000000000+(++tick));
 const images=[];for(let i=0;i<3;i++){const bytes=await sharp({create:{width:32,height:24,channels:3,background:['red','blue','green'][i]}}).png().toBuffer();blobs.set('key'+i,bytes);images.push({id:'im'+i,storageKey:'key'+i,fileName:i+'.png',url:'/local/'+i,position:i,isPrimary:i===0,analysis:JSON.stringify({...raw(1,i===1?{suitabilityConfidence:.7}:{}),contentFingerprint:await load('lib/image-content-fingerprint.server.ts').fingerprintImageContent(bytes)}),analysisStatus:'analyzed',analyzedAt:stamp(),updatedAt:stamp()});}
 const listing={...facts,id:'listing',userId:'owner',updatedAt:stamp(),archivedAt:null,generatedVariants:JSON.stringify(variants),locationDescription:'Belegte Lagebeschreibung',locationData:JSON.stringify({city:'Schaffhausen'}),images};
 const prisma={premiumQualityAssessment:{
 create:async({data})=>{const record={...data,id:'r'+records.length,createdAt:stamp()};records.push(record);return record},
 update:async({where,data})=>{const record=records.find(x=>x.id===where.id);Object.assign(record,data);return record},
 findFirst:async({where})=>[...records].reverse().find(x=>(!where.id||x.id===where.id)&&x.userId===where.userId&&x.kind===where.kind&&(!where.listingId||x.listingId===where.listingId)&&(!where.version||x.version===where.version)&&x.expiresAt>new Date())??null},
 listing:{findFirst:async({where})=>where.userId==='owner'&&where.id==='listing'?listing:null},
 listingImage:{update:async({where,data})=>{const image=images.find(x=>x.id===where.id);Object.assign(image,data,{updatedAt:stamp()});return image}},
 $transaction:async jobs=>Promise.all(jobs)};
 class AI{constructor(){this.chat={completions:{create:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({completed:true,checkedVariants:[1,2,3],findings:[]})}}]})}}}}
 const l=loader({'./prisma':{prisma},'@/lib/prisma':{prisma},'./storage/storage.server':{getObjectBytes:async key=>blobs.get(key)},'openai':{__esModule:true,default:AI},'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status??200})}},'@/lib/listing-access':{canUseListingCoreForUser:async()=>!options.accessDenied},'@/lib/session':{getAuthenticatedUser:async()=>options.unauthenticated?null:({id:options.foreign?'other':'owner'})}});
 await l('lib/premium-quality-store.server.ts').savePremiumAssessment('owner','broker_vision',{images:images.map(image=>({id:image.id,analysis:image.analysis,analyzedAt:image.analyzedAt}))},'listing');
 const api=l('app/api/listings/[id]/broker-review/route.ts'),service=l('lib/premium-quality.server.ts'),review=l('lib/broker-review.server.ts'),pure=l('lib/broker-review.ts');
 async function state(){return (await api.GET({}, {params:Promise.resolve({id:'listing'})})).body}
 async function post(body){return api.POST({json:async()=>body},{params:Promise.resolve({id:'listing'})})}
 async function save(){const s=await state();assert(s.snapshot,JSON.stringify(s));return post({action:'images',snapshot:s.snapshot,primary:'im1',order:['im1','im0','im2'],decisions:s.images.map(x=>({imageId:x.id,version:x.version,decision:x.id==='im2'?'reject':'accept',note:'Am Original geprüft; erkennbare Gebäudefront'}))})}
 async function check(){const s=await state();return post({action:'check',snapshot:s.snapshot,manualConfirmed:true,facts})}
 async function approve(){const s=await state();return post({action:'approve',snapshot:s.snapshot,confirmed:true})}
 return {load:l,api,service,review,pure,listing,images,records,blobs,state,post,save,check,approve,stamp};
}
test('offline end-to-end: image review -> technical audit -> explicit broker approval',async()=>{const h=await reviewHarness();const initial=await h.state();assert.equal(initial.technicalReady,false);assert.equal(initial.brokerApproved,false);assert.equal((await h.save()).status,200);const check=await h.check();assert.equal(check.status,200,JSON.stringify(check.body));assert.equal(await h.service.isListingPremiumQualityReady('owner','listing'),true);assert.equal(await h.service.isListingPremiumPublicationReady('owner','listing'),false);assert.equal((await h.approve()).body.brokerApproved,true);assert.equal(await h.service.isListingPremiumPublicationReady('owner','listing'),true)});
test('rejection retains original; gallery order and primary are persisted',async()=>{const h=await reviewHarness();assert.equal((await h.save()).status,200);assert.equal(h.images.length,3);assert(h.blobs.has('key2'));assert.equal(h.images.find(x=>x.id==='im1').isPrimary,true);assert.equal(h.images.find(x=>x.id==='im1').position,0);const s=await h.state();assert.equal(s.images.find(x=>x.id==='im2').decision,'reject')});
test('stale screen cannot confirm changed images or new analyses',async()=>{const h=await reviewHarness();const s=await h.state();h.images[0].analyzedAt=h.stamp();const response=await h.post({action:'images',snapshot:s.snapshot});assert.equal(response.status,422);assert.match(response.body.error,/STALE/)});
for(const change of ['text','facts','locationDescription','locationData','image','analysis','reorder','metadata'])test('approval invalidates on '+change,async()=>{const h=await reviewHarness();assert.equal((await h.save()).status,200);assert.equal((await h.check()).status,200);assert.equal((await h.approve()).body.brokerApproved,true);if(change==='text')h.listing.generatedVariants=JSON.stringify([{...variants[0],text:variants[0].text+' Neuer Satz.'},...variants.slice(1)]);if(change==='facts')h.listing.price=460000;if(change==='locationDescription')h.listing.locationDescription='Geänderte Lage';if(change==='locationData')h.listing.locationData=JSON.stringify({city:'Andere Stadt'});if(change==='image')h.blobs.set('key0',Buffer.from('invalid new image'));if(change==='analysis')h.images[1].analyzedAt=h.stamp();if(change==='reorder')h.images[0].position=0;if(change==='metadata'){const checked=await h.check();assert.equal(checked.status,200);}let approved=false;try{approved=await h.service.isListingBrokerApproved('owner','listing')}catch{}assert.equal(approved,false)});
test('editing and reverting cannot resurrect an old approval',async()=>{const h=await reviewHarness();await h.save();await h.check();await h.approve();h.listing.updatedAt=h.stamp();assert.equal(await h.service.isListingBrokerApproved('owner','listing'),false)});

for(const field of ['livingArea','plotArea'])test('manual area correction invalidates technical proof and explicit approval: '+field,async()=>{
 const h=await reviewHarness();await h.save();await h.check();await h.approve();
 assert.equal(await h.service.isListingPremiumQualityReady('owner','listing'),true);
 h.listing[field]=field==='livingArea'?86:420;
 assert.equal(await h.service.isListingPremiumQualityReady('owner','listing'),false);
 assert.equal(await h.service.isListingBrokerApproved('owner','listing'),false);
 const guard=h.load('lib/broker-workflow/marketing-approval-guard.server.ts');
 assert.equal(await guard.isBrokerMarketingApproved({userId:'owner',listingId:'listing'}),false);
});
test('explicit approval and complete image decisions are mandatory',async()=>{const h=await reviewHarness();assert.equal((await h.approve()).status,422);const s=await h.state();assert.equal((await h.post({action:'images',snapshot:s.snapshot,decisions:[],order:[],primary:''})).status,422)});
test('conflicting room/category cannot be manually accepted',async()=>{const h=await reviewHarness();h.images[1].analysis=JSON.stringify(raw(1,{room:'Wohnzimmer',category:'bathroom'}));assert.equal((await h.save()).status,422)});
test('unanalysed image may be rejected, never confirmed',async()=>{const h=await reviewHarness();h.images[1].analysisStatus='not_analyzed';assert.equal((await h.save()).status,422)});
test('direct Autopilot sends review failures into the existing editor',()=>{const page=fs.readFileSync('app/autopilot/page.tsx','utf8'),route=fs.readFileSync('app/api/autopilot/run/route.ts','utf8');assert(page.includes('runData.code === "AUTOPILOT_IMAGE_REVIEW_REQUIRED"'));assert(page.includes('/edit?review=images'));assert(route.includes('reviewUrl:'));assert(route.includes('savePremiumAssessment(user.id, "expose"'))});

test('new analyses invalidate only the affected per-image decisions',async()=>{const h=await reviewHarness();await h.save();h.images[1].analyzedAt=h.stamp();const s=await h.state();assert.equal(s.images.find(x=>x.id==='im1').decision,'pending');assert.equal(s.images.find(x=>x.id==='im0').decision,'accept')});
test('changed pixels cannot reuse the previous analysis',async()=>{const h=await reviewHarness();h.blobs.set('key1',h.blobs.get('key2'));assert.equal((await h.save()).status,422)});
test('missing content-to-analysis binding cannot be manually promoted',async()=>{const h=await reviewHarness();h.images[1].analysis=JSON.stringify(raw());assert.equal((await h.save()).status,422)});
test('human gallery confirmation never promotes room facts',async()=>{const rawCandidate={...image,analysis:validate([raw(1,{roomConfidence:.2})],1)[0]};const selected=load('lib/autopilot-image-quality.ts').selectAutopilotImages([rawCandidate],{confirmedImageIds:['1'],order:['1'],primaryImageId:'1'});assert.equal(selected.entries[0].selected,true);assert.equal(selected.entries[0].analysis.room,null)});
test('new broker approval endpoint never invokes publication automation',()=>{const route=fs.readFileSync('app/api/listings/[id]/broker-review/route.ts','utf8');assert(!route.includes('runPublication'));assert(route.includes('publicationTriggered:false'))});

test('changing the image set invalidates the existing approval',async()=>{const h=await reviewHarness();await h.save();await h.check();await h.approve();h.images.pop();assert.equal(await h.service.isListingBrokerApproved('owner','listing'),false)});
test('review page receives exactly the current saved texts and location',async()=>{const h=await reviewHarness();const s=await h.state();assert.equal(s.reviewedContent.variants.length,3);assert.equal(s.reviewedContent.facts.locationDescription,'Belegte Lagebeschreibung');assert.equal(s.reviewedContent.variants[0].text,variants[0].text)});
test('low-title-score primary requires explicit rationale',async()=>{const h=await reviewHarness();assert.throws(()=>h.pure.validateBrokerDecisions([{id:'one',version:'v',reasons:[],analyzed:true,titleScore:40}],[{imageId:'one',version:'v',decision:'accept',note:''}],['one'],'one'),/TITLE_REVIEW/)});

test('actual shared marketing guard requires the current human approval, never an old timestamp',async()=>{const h=await reviewHarness();h.listing.brokerWorkflow={marketingApprovedAt:new Date()};await h.save();await h.check();const guard=h.load('lib/broker-workflow/marketing-approval-guard.server.ts');assert.equal(await guard.isBrokerMarketingApproved({userId:'owner',listingId:'listing'}),false);await h.approve();assert.equal(await guard.isBrokerMarketingApproved({userId:'owner',listingId:'listing'}),true);h.listing.locationDescription='Neue Lage';assert.equal(await guard.isBrokerMarketingApproved({userId:'owner',listingId:'listing'}),false)});
test('review endpoints require authentication and reject foreign listings',async()=>{const anonymous=await reviewHarness({unauthenticated:true});assert.equal((await anonymous.api.GET({}, {params:Promise.resolve({id:'listing'})})).status,401);assert.equal((await anonymous.post({action:'approve'})).status,401);const other=await reviewHarness({foreign:true});assert.equal((await other.post({action:'approve'})).status,422);assert.equal(other.records.length,1)});
test('technical audit preserves the existing feature-access check',async()=>{const h=await reviewHarness({accessDenied:true});await h.save();assert.equal((await h.check()).status,403)});

test('a browser-cache analysis without server evidence is never accepted',async()=>{const h=await reviewHarness();h.records.splice(0,h.records.length);assert.equal((await h.save()).status,422)});
