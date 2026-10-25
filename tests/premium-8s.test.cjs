const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:id=>id==='node:crypto'?require(id):id.startsWith('@/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):(()=>{throw Error('FORBIDDEN')})(),process:{env:{}},console});return m.exports;}
const engine=load('lib/listing-text-engine.server.ts'),g=load('lib/premium-editorial-generation.ts'),q=load('lib/premium-editorial-quality.ts');
const {facts,examples}=require('./support/portable/fixtures/premium-7d.json');
test('actual three outgoing generation requests have consistent source authority and distinct assigned plans',async()=>{
 const requests=[];const openai={chat:{completions:{create:async r=>{requests.push(r);throw Error('OFFLINE_CAPTURE');}}}};
 await a.rejects(engine.generateListingTextVariants({...facts,imageAnalysis:'A lake view and two floors'}, {openai}));a.equal(requests.length,3);
 for(const [i,r] of requests.entries()){
  const p=r.messages.map(x=>x.content).join('\n');a(p.includes(g.premiumEditorialAngle(i)));
  for(const required of ['FACT AUTHORITY','UNKNOWNS UNLESS EXPLICITLY SOURCED','EDITORIAL FREEDOM','Image observations are not confirmed object facts','No obligatory summary','Length follows distinct supported content'])a(p.includes(required),required);
  for(const obsolete of ['CONCRETE USE AND DAILY LIFE','DISTINCTIVE FEATURE OR MARKET ANGLE','120 to 180','at least 110 words','Secondary facts should normally','Do not begin with room count, living area','well-developed paragraphs and a concise closing'])a(!p.includes(obsolete),obsolete);
  a.equal(r.max_tokens,900);
 }
});
test('repair brief preserves quote/source diagnosis without asking for compensating claims',()=>{
 const issue='MATERIAL_CLAIM_WITHOUT_EVIDENCE: '+JSON.stringify({quote:'Sechs Zimmer auf zwei Ebenen.',field:'storeys',reason:'No source for storeys'});
 const p=g.premiumRepairInstructions([issue]);for(const term of ['exact quoted claim','missing source basis','retaining its separately supported scalar facts','Do not replace a removed filler conclusion with new praise','unknown content must stay verbatim'])a(p.includes(term));
 const c=g.premiumGenerationContract(facts);a(c.includes('Supplied does not mean independently verified or OCR-verified'));a(c.includes('floors/storeys'));a(c.includes('parking location'));
});
for(const run of ['8c','8k','8o'])test('unchanged real '+run+' responses still expose source-bound defects',()=>{
 const rows=fs.readFileSync(path.join(__dirname,'support/portable/fixtures/quality-'+run+'-original.responses.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
 const variants=rows.filter(x=>x.kind==='chat').map(x=>JSON.parse(x.response.choices[0].message.content).variant).filter(Boolean);
 a(variants.length>=3);a(variants.some(v=>q.evaluatePremiumEditorialQuality(facts,[v]).findings.length>0));
});
test('correct independent source-backed set needs no repair; attempts remain bounded at two',async()=>{
 let calls=0;await g.repairPremiumVariants(facts,examples,async()=>{calls++;throw Error('UNEXPECTED');},()=>{});a.equal(calls,0);
 const bad=examples.map(v=>({...v}));bad[0].text+=' Das Haus entspricht aktuellen Standards.';
 await a.rejects(g.repairPremiumVariants(facts,bad,async v=>{calls++;return v;},()=>{}),/QUALITY_GATE_FAILED/);a.equal(calls,2);
});
