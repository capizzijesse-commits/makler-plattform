const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const resolve=Module._resolveFilename;Module._resolveFilename=function(id,parent,...rest){return resolve.call(this,id.startsWith('@/')?path.resolve(id.slice(2)):id,parent,...rest);};
const {buildEditorialFactPlan:plan}=require('../lib/listing-editorial-fact-plan.ts'),g=require('../lib/premium-editorial-generation.ts'),q=require('../lib/premium-editorial-quality.ts'),quality=require('../lib/listing-text-quality.ts'),strict=require('../lib/listing-strict-quality.ts');
const facts=require('./support/portable/quality-validation-8t/inputs/engine-input.synthetic.json'),gold=require('./fixtures/editorial-gold-9b.json');
test('9B exact editorial references pass factual, strict and distinctness checks without suppressing length warnings',()=>{
 a.equal(gold.origin,'EDITORIAL_REFERENCE_NOT_MODEL_OUTPUT');a(q.evaluatePremiumEditorialQuality(facts,gold.variants).passed);a(quality.evaluateListingQuality(gold.variants,'de',facts).passed);
 for(const v of gold.variants){a.deepEqual(strict.findStrictQualityIssues(v),[]);a.equal(g.missingCoreFactRequirements(facts,v).length,0);a(v.text.includes('Starnberg'));a(v.text.includes('Einfamilienhaus'));}
 a(quality.evaluateListingQuality(gold.variants,'de',facts).issues.some(x=>x.code==='WORD_COUNT_OUTSIDE_TARGET'));
});
test('plan separates mandatory, optional, unknown and source status with no fabricated facts',()=>{
 const p=plan({...facts,imageAnalysis:'Lake view and three storeys',styleText:'luxury',highlights:'unverified pool'});
 for(const key of ['propertyType','location','rooms','livingArea','plotArea','price','currency'])a(p.required.some(x=>x.id===key));
 a(p.optional.some(x=>x.field==='verifiedFeatures'));a(p.unknown.includes('storeys'));a(p.unknown.includes('parkingLocation'));a.equal(p.missingRequired.length,0);
 const serialized=JSON.stringify(p);a(!serialized.includes('Lake view'));a(!serialized.includes('unverified pool'));a(!serialized.includes('luxury'));a([...p.required,...p.optional].every(x=>x.independentlyVerified===false));
});
test('all three plans cover supplied core facts once with distinct information flows',()=>{
 const p=plan(facts);a.equal(new Set(p.variants.map(v=>v.sections.map(s=>s.topic).join(','))).size,3);
 a.equal(p.variants[0].sections[0].topic,'building');a.equal(p.variants[1].sections[0].topic,'rooms');a.equal(p.variants[2].sections[0].topic,'offer');
 for(const v of p.variants){const ids=v.sections.flatMap(s=>s.factIds);a.equal(new Set(ids).size,ids.length);for(const fact of p.required)a(ids.includes(fact.id));}
});
for(const [label,input,kind,required,absent] of [
 ['rental apartment',{propertyType:'Wohnung',location:'Mainz',rooms:2,livingArea:58,price:950,currency:'EUR',marketingType:'rent',rentPeriod:'month'},'residential',['rooms','livingArea','price'],[]],
 ['land on request',{propertyType:'Grundstück',location:'Bonn',plotArea:'780 m²',marketingType:'on_request',priceOnRequestConfirmed:true,price:123},'land',['plotArea'],['rooms','livingArea','price']],
 ['commercial',{propertyType:'Gewerbeimmobilie',location:'Leipzig',commercialArea:300,commercialUse:'Büro',marketingType:'rent',price:2500,currency:'EUR'},'commercial',['commercialArea','commercialUse','price'],['rooms','livingArea']],
 ['unknown',{propertyType:'Sonderobjekt',location:'Hamburg'},'unknown',['propertyType','location'],['rooms','livingArea']]
])test('generic planning adapts safely: '+label,()=>{
 const p=plan(input);a.equal(p.propertyKind,kind);for(const field of required)a(p.required.some(x=>x.field===field));for(const field of absent)a(![...p.required,...p.optional].some(x=>x.field===field));
 a(!JSON.stringify(p).includes('Starnberg'));a(!JSON.stringify(p).includes('1390000'));
});
test('uncertain, missing and malformed scalar values stay out of factual sections',()=>{
 const p=plan({propertyType:'Wohnung',location:'unbekannt',rooms:{value:6,status:'uncertain'},livingArea:'178 m?',price:-1,marketingType:'sale'});
 for(const field of ['location','rooms','livingArea','price','currency'])a(p.missingRequired.includes(field));a(!p.required.some(x=>['location','rooms','livingArea','price'].includes(x.field)));
 a(plan({propertyType:'Wohnung',location:'Bonn',rooms:'6 m²',livingArea:80}).missingRequired.includes('rooms'));
});
test('explicit feature evidence stays intact without treating derived domains as separately verified',()=>{
 const p=plan({propertyType:'Haus',location:'Bonn',verifiedFeatures:'Zwei Etagen; Fußbodenheizung in allen Wohnräumen; kein Verbrauchsnachweis'});
 a(!p.unknown.includes('storeys'));a(!p.unknown.includes('heatingCoverage'));a(p.unknown.includes('actualConsumption'));a(p.optional.some(x=>x.value==='Zwei Etagen'&&x.independentlyVerified===false));
});
test('actual three engine requests receive the structured plan without embedding gold text',async()=>{
 const engine=require('../lib/listing-text-engine.server.ts'),requests=[];
 await a.rejects(engine.generateListingTextVariants(facts,{openai:{chat:{completions:{create:async r=>{requests.push(r);throw Error('OFFLINE_CAPTURE');}}}}}));a.equal(requests.length,3);
 for(const [i,r] of requests.entries()){const prompt=r.messages.map(x=>x.content).join('\n');a(prompt.includes('EDITORIAL_FACT_PLAN_9C'));a(prompt.includes(g.premiumEditorialAngle(i)));a(!prompt.includes(gold.variants[0].text));a(prompt.includes('"id":"rooms","field":"rooms","value":6'));}
});
test('shared generate path and repair contract use the plan without changing safety limits',()=>{
 const source=fs.readFileSync('app/api/generate/route.ts','utf8');a(source.includes('premiumGenerationContract({ ...body'));a(source.includes('${premiumEditorialAngle(0)}'));a(source.includes('${premiumEditorialAngle(1)}'));a(source.includes('${premiumEditorialAngle(2)}'));a(!source.includes('CONCRETE USE AND DAILY LIFE'));a(!source.includes('Secondary facts should normally appear'));a(g.premiumGenerationContract(facts).includes('STRUCTURED EDITORIAL FACT PLAN'));a(g.premiumRepairInstructions([]).includes('no word-count quota'));
});
for(const run of ['8k','8o','8t'])test('real '+run+' first-generation set remains an unmodified negative/mixed reference',()=>{
 const raw=fs.readFileSync(path.join(__dirname,'support/portable/fixtures/quality-'+run+'-original.responses.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
 const variants=raw.filter(x=>x.kind==='chat'&&x.response.model.startsWith('gpt-4.1-mini')).slice(0,3).map(x=>JSON.parse(x.response.choices[0].message.content).variant);
 a.equal(variants.length,3);a.equal(q.evaluatePremiumEditorialQuality(facts,variants).passed,false);
});
