const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),crypto=require('node:crypto');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const resolve=Module._resolveFilename;Module._resolveFilename=function(id,parent,...rest){return resolve.call(this,id.startsWith('@/')?path.resolve(id.slice(2)):id,parent,...rest);};
const {evaluatePremiumEditorialQuality:evaluate}=require('../lib/premium-editorial-quality.ts');
const {applyPremiumRepairScope:scope,repairPremiumVariants}=require('../lib/premium-editorial-generation.ts');
const {getSafeImageRoomEvidence:safe}=require('../lib/image-expose-consistency.ts');
const {validateAutopilotImageAnalyses:validate,selectAutopilotImages:select}=require('../lib/autopilot-image-quality.ts');
const fixture=require('./support/portable/fixtures/premium-7d.json'),facts={...fixture.facts,locale:'de',market:'DE'};
const raw=fs.readFileSync(path.join(__dirname,'support/portable/fixtures/quality-8c-original.responses.jsonl'));
const records=raw.toString().trim().split(/\r?\n/).map(JSON.parse),texts=records.filter(r=>r.kind==='chat').map(r=>JSON.parse(r.response.choices[0].message.content).variant);
const imagePayload=JSON.parse(records[0].response.output.find(o=>o.type==='message').content.find(c=>c.type==='output_text').text).imageAnalyses;
test('immutable real fixture retains all seven texts and original twelve model analyses',()=>{
 a.equal(crypto.createHash('sha256').update(raw).digest('hex'),'0f9cce4d9a83d5d4397d229a65ebb5979e53a14d3947ec86101de9069b6febd8');
 const original=fs.readFileSync(path.resolve(__dirname,'./support/portable/quality-validation-8c/runs/STARNBERG-QUALITY-8C-d55353f2-13fa-48e5-8615-e4453b6015fe/responses.jsonl'));
 a(raw.equals(original));a.equal(texts.length,7);a.equal(imagePayload.length,12);
});
test('every real answer retains at least one justified rejection, including scalar-complete short repair',()=>{
 for(const v of texts)a.equal(evaluate(facts,[v]).passed,false,v.title);
});
test('real unsupported consumption, layout, allocation and filler receive concrete findings',()=>{
 const r=evaluate(facts,texts.slice(0,3));a(!r.passed);
 for(const field of ['actualConsumption','layout','parkingAllocation','newBuildStatus'])a(r.findings.some(f=>f.field===field),field);
 a(r.findings.some(f=>f.variantIndex===1&&f.field==='layout'&&f.quote.includes('Rückzugsbereiche')));
 a(r.findings.some(f=>f.variantIndex===2&&f.code==='LOW_INFORMATION_COPY'));
});
for(const sentence of ['Die Fläche ist eine durchdachte Fläche.','Das Haus bietet private Rückzugsbereiche.','Gemeinschaftsräume sind vorhanden.','Die klare Gliederung der Räume prägt das Haus.'])test('layout claim requires its exact source, not room count: '+sentence,()=>{
 const v={title:'Immobilie',text:sentence};a(evaluate({},[v]).findings.some(f=>f.field==='layout'));
 a(!evaluate({verifiedFeatures:sentence},[v]).findings.some(f=>f.field==='layout'));
});
test('warm address without invented layout remains valid across property types',()=>{
 for(const propertyType of ['Wohnung','Einfamilienhaus','Gewerbeobjekt'])a.equal(evaluate({propertyType},[{title:propertyType,text:'Willkommen in Mainz. Die Wohnfläche beträgt 85 m².'}]).passed,true);
});
test('same grammar with genuinely different offer/building perspectives is allowed',()=>{
 const set=[{title:'Haus Baujahr 2020',text:'Das Einfamilienhaus wurde 2020 errichtet.'},{title:'Wohnfläche in Mainz',text:'Mit 85 m² Wohnfläche wird die Wohnung angeboten.'},{title:'Angebot zum Kauf',text:'Das Einfamilienhaus wird in Mainz zum Kaufpreis von 1.390.000 EUR angeboten.'}];
 a(!evaluate({},set).findings.some(f=>f.code==='EDITORIAL_OPENING_STRATEGY_REUSED'));
 set[2].text='Das Einfamilienhaus wurde im Jahr 2021 errichtet.';
 a(evaluate({},set).findings.some(f=>f.code==='EDITORIAL_OPENING_STRATEGY_REUSED'));
});
test('opening-only scope permits first sentence correction, preserving title and remainder',()=>{
 const original=texts[2],candidate={title:'Unrequested change',text:'In Starnberg wird das Einfamilienhaus für 1.390.000 EUR angeboten. Changed body.'};
 const result=scope(original,candidate,['EDITORIAL_OPENING_STRATEGY_REUSED: {}']);
 a.equal(result.title,original.title);a(result.text.startsWith('In Starnberg'));a(result.text.endsWith(original.text.slice(original.text.indexOf('. Die Wohnfläche'))));
});
test('both real title-only repairs do not masquerade as opening corrections',()=>{
 for(const candidate of texts.slice(5))a.deepEqual(scope(texts[2],candidate,['EDITORIAL_OPENING_STRATEGY_REUSED: {}']),texts[2]);
});
test('rejected short repair is retried with precise preservation feedback, within two attempts',async()=>{
 const set=fixture.examples.map(v=>({...v})),sentence='Weitere Details zur Ausstattung oder zum Grundriss liegen nicht vor, sodass sich die Beschreibung auf die dokumentierten Fakten beschränkt.';
 set[0].text+=' '+sentence;let calls=0;
 const r=await repairPremiumVariants(facts,set,async(_v,issues,index)=>{a.equal(index,0);if(calls++===0)return {...fixture.examples[0],text:'Die Wohnfläche beträgt 178 m².'};a(issues.some(x=>x.includes('REPAIR_SAFE_CONTENT_LOST')));return fixture.examples[0];},()=>{});
 a.equal(calls,2);a.equal(r[0].text,fixture.examples[0].text);
});
test('real 56-word repair loses safe content and is rejected rather than replacing full copy',()=>{
 a.throws(()=>scope(texts[3],texts[4],['UNPROFESSIONAL_META_COPY']),/SAFE_CONTENT_LOST/);
 const sentence='Weitere Details zur Ausstattung oder zum Grundriss liegen nicht vor, sodass sich die Beschreibung auf die dokumentierten Fakten beschränkt.';
 const candidate={...texts[3],text:texts[3].text.replace(sentence,'').replace(/\n\n\n+/g,'\n\n')};
 a.deepEqual(scope(texts[3],candidate,['UNPROFESSIONAL_META_COPY']),candidate);
});
test('unchanged opening repairs stay bounded and receive explicit no-effect feedback',async()=>{
 const set=fixture.examples.map(v=>({...v}));set[0].text+=' Die Fläche ist eine durchdachte Fläche.';let calls=0;
 await a.rejects(repairPremiumVariants(facts,set,async(v,issues)=>{if(calls++)a(issues.some(x=>x.includes('REPAIR_NO_EFFECT')));return v;},()=>{}),/QUALITY_GATE_FAILED/);a.equal(calls,2);
});
test('known correct independent set and source-bound claims remain accepted',()=>a.equal(evaluate(facts,fixture.examples).passed,true));
test('living alias retains confidence and conflict guards',()=>{
 a.equal(safe({room:'living',category:'living',roomConfidence:.95}).room,'Wohnzimmer');
 a.equal(safe({room:'living',category:'living',roomConfidence:.5}).room,null);
 a.equal(safe({room:'living',category:'bathroom',roomConfidence:.95}).roomCategoryIssue,'ROOM_CATEGORY_CONFLICT');
});
test('real wrong image classes remain negative reference cases, never declared visually correct by parser',()=>{
 const parsed=validate(imagePayload,12,imagePayload.map(x=>x.imageId));
 const expected={S07:'floorplan',S08:'living',S10:'bedroom'};
 for(const [id,category] of Object.entries(expected))a.notEqual(parsed.find(x=>x.imageId===id).category,category);
 a.equal(parsed.find(x=>x.imageId==='S10').sharpnessScore,95); // wrong model score, no invented correction
 a.equal(parsed.find(x=>x.imageId==='S01').room,'Wohnzimmer');
});
test('conflicting labels cannot be confirmed into automatic selection',()=>{
 const an=validate([{...imagePayload[0],room:'living',category:'bathroom'}],1,['S01']);
 const c=[{imageId:'S01',fileName:'S01.png',contentFingerprint:'a'.repeat(64),analysis:an[0]}];
 const s=select(c,{confirmedImageIds:['S01'],order:['S01'],primaryImageId:'S01'});a(!s.selectedImageIds.length);a(s.requiresReview);
});
test('synthetic transform references are checked against actual pixels and hashes, not model labels',async()=>{
 const sharp=require('sharp'),base=path.resolve(__dirname,'./support/portable/quality-validation-8c'),manifest=JSON.parse(fs.readFileSync(path.join(base,'images-manifest.json')));
 const decode=async id=>{const x=manifest.files.find(f=>f.id===id),b=fs.readFileSync(path.join(base,x.file));a.equal(crypto.createHash('sha256').update(b).digest('hex'),x.sha256);return sharp(b).removeAlpha().raw().toBuffer({resolveWithObject:true});};
 const [s1,s8,s9,s3,s10,s5,s11]=await Promise.all(['S01','S08','S09','S03','S10','S05','S11'].map(decode));
 a.equal(s1.info.width,s8.info.width);a.equal(s1.info.height,s8.info.height);
 const mae=(x,y)=>x.reduce((n,v,i)=>n+Math.abs(v-y[i]),0)/x.length;
 a(mae(s1.data,s8.data)<10);a(mae(s1.data,s8.data)>0);
 const mean=x=>x.reduce((n,v)=>n+v,0)/x.length;a(mean(s9.data)<mean(s1.data)*.45);
 a.equal(s3.info.width,s10.info.width);a(mae(s3.data,s10.data)>1);
 const variance=s=>{let sum=0,sq=0,n=0;const w=s.info.width,c=s.info.channels;for(let i=w*c;i<s.data.length-w*c;i+=c){const v=4*s.data[i]-s.data[i-c]-s.data[i+c]-s.data[i-w*c]-s.data[i+w*c];sum+=v;sq+=v*v;n++;}return sq/n-(sum/n)**2;};
 a(variance(s10)<variance(s3)*.2);
 const back=await sharp(s11.data,{raw:s11.info}).rotate(90).raw().toBuffer();a(back.equals(s5.data));
});
