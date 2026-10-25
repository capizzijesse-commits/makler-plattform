const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=process.cwd();
function loadTs(file){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mod.exports,module:mod,Set,Number,String,Date,Error});return mod.exports}
const guard=loadTs(path.join(root,'lib/expose-core-fact-conflicts.ts'));
const {collectExposeCoreFacts:collect,applyExposeCoreEvidence:apply,confirmExposeFactConflicts:confirm,hasUnresolvedExposeConflicts:pending}=guard;
const base=()=>({rooms:'AI room',livingArea:'AI area',price:'AI price',missingFields:[],location:'Berlin',propertyType:'Wohnung',projectName:'4 Zimmer',highlights:'Alte Werte',styleText:'Alte Werte',sourceSummary:'Alte Werte'});
const plain=x=>JSON.parse(JSON.stringify(x));
function sourceFunctions(source,names){return ts.createSourceFile('source.ts',source,ts.ScriptTarget.Latest,true).statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText()).join('\n')}
const route=fs.readFileSync('app/api/automation/extract-expose/route.ts','utf8');
const locals=sourceFunctions(route,['extractLocalFastFacts','emptyResult','isLocalFastFactsReady','cleanExposeLocation','cleanString','cleanExposePostalCode','extractExplicitNetLivingArea']);
const api={exports:{}};vm.runInNewContext(ts.transpileModule(locals+'\nexports.extract=extractLocalFastFacts;exports.ready=isLocalFastFactsReady;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{...guard,exports:api.exports,Set,Number,String});
const ui=fs.readFileSync('app/automation/AutomationFlowV2.tsx','utf8');
function uiReady(data,variants=[{title:'a',text:'b'}]){
  const start=ui.indexOf('  const requiredMissing = useMemo');const end=ui.indexOf('\n\n\n',ui.indexOf('  const readyToPublish =',start));
  const code=sourceFunctions(ts.createSourceFile('ui.tsx',ui,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).getFullText(),['never']);
  // The location validator is nested in the component: extract its exact body.
  const location=ui.slice(ui.indexOf('  function isPlausibleAutomationLocation'),start);
  const check=ts.transpileModule(location+ui.slice(start,end)+'\nexports.ready=readyToPublish;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const result={};vm.runInNewContext(check,{...guard,data,variants,useMemo:f=>f(),exports:result});return result.ready;
}
for(const [name,text,field,expected] of [
 ['identical rooms','Zimmer: 4\nZimmerzahl: 4','rooms','4'],
 ['identical areas','Wohnfläche: 120 m²\nWohnfläche: 120,00 qm','livingArea','120'],
 ['identical prices','Kaufpreis: EUR 450.000\nAngebotspreis: 450000 €','price','450000'],
 ['fraction rooms','4½ Zimmer\nZimmerzahl: 4,5\n4 1/2 Zimmer','rooms','4.5'],
 ['international prices',"Kaufpreis: EUR 1.250.000,00\nKaufpreis: EUR 1,250,000.00\nKaufpreis: EUR 1’250’000.00\nKaufpreis: EUR 1 250 000",'price','1250000'],
 ['ancillary area','Wohnfläche: 120 m²\nNutzfläche: 30 m²\nGrundstücksfläche: 800 m²\nKellerfläche: 20 m²','livingArea','120'],
 ['foreign inline','Kaufpreis: EUR 450000\nVergleichsobjekt Kaufpreis: EUR 600000','price','450000'],
 ['foreign section','Vergleichsobjekt: Wohnung B\nKaufpreis: EUR 600000\nAktuelles Objekt: Wohnung A\nKaufpreis: EUR 450000','price','450000'],
 ['history','Historischer Kaufpreis: EUR 300000\nKaufpreis: EUR 450000','price','450000'],
 ['history same line','Früherer Kaufpreis: EUR 300000; Kaufpreis: EUR 450000','price','450000'],
 ['flat PDF text','Wohnfläche: 120 m² Zimmer: 4 Kaufpreis: EUR 450.000','price','450000'],
 ['net area CSV','Netto Wohnfläche, "120,50"','livingArea','120.5'],
 ['multiline rooms','Zimmer:\n4\nZimmerzahl:\n4','rooms','4'],
 ['multiline currency','Kaufpreis:\nEUR\n450.000','price','450000'],
 ['multiline history','Historischer Kaufpreis:\nEUR 300000\nKaufpreis:\nEUR 450000','price','450000'],
 ['dated historic price','Kaufpreis (2020): EUR 300000\nKaufpreis: EUR 450000','price','450000'],
 ['dated historic price without parentheses','Kaufpreis 2020: EUR 300000\nKaufpreis: EUR 450000','price','450000'],
 ['Swiss price suffix',"Kaufpreis: CHF 1'290'000.-",'price','1290000']
])test(name,()=>{const r=collect(text);assert.equal(r.values[field],expected);assert.equal(r.conflicts.length,0)});
for(const [name,text,field] of [
 ['rooms conflict','Zimmer: 4\nZimmer: 5','rooms'],
 ['area conflict','Wohnfläche: 120\nWohnfläche: 150','livingArea'],
 ['net versus generic conflict','Netto Wohnfläche: 120\nWohnfläche: 150','livingArea'],
 ['price conflict','Kaufpreis: EUR 450000\nKaufpreis: EUR 480000','price'],
 ['currency conflict','Kaufpreis: EUR 450000\nKaufpreis: CHF 450000','price'],
 ['ambiguous other object','Wohnung B Kaufpreis: EUR 480000\nKaufpreis: EUR 450000','price'],
 ['multiple docs','DOKUMENT 1: A\nZimmer: 4\nDOKUMENT 2: B\nZimmer: 5','rooms'],
 ['multiline conflicting area','Wohnfläche:\n120\nWohnfläche:\n150','livingArea'],
 ['room range','Zimmer: 4–5','rooms'],
 ['area range','Wohnfläche: 120 bis 150 m²','livingArea'],
 ['price range','Kaufpreis: EUR 450000–480000','price']
])test(name+' blocks extraction, fallback and READY',()=>{
 const r=collect(text);assert.equal(r.values[field],'');assert.equal(r.conflicts[0].field,field);
 const applied=apply(base(),r);assert.equal(applied[field],'');assert(pending(applied));assert(applied.missingFields.includes(field));assert.equal(uiReady(applied),false);
 for(const key of ['projectName','highlights','styleText','sourceSummary'])assert.equal(applied[key],'');
 assert.equal(applied.factConflicts[0].status,'unresolved');assert.throws(()=>confirm(applied));
});
test('missing facts remain absent without fabricated conflict',()=>{const r=collect('Keine Angaben');assert.deepEqual(plain(r.values),{rooms:'',livingArea:'',price:''});assert.equal(r.conflicts.length,0)});
test('only explicitly historical/foreign values are not released',()=>{const r=collect('Historischer Kaufpreis: EUR 300000\nVergleichsobjekt Zimmer: 4');const x=apply(base(),r);assert.equal(x.price,'');assert.equal(x.rooms,'')});
test('all three conflicts are structured and manual input alone does not enable READY',()=>{
 const x=apply(base(),collect('Zimmer: 4\nZimmer: 5\nWohnfläche: 120\nWohnfläche: 150\nKaufpreis: 450000\nKaufpreis: 480000'));
 assert.equal(x.factConflicts.length,3);assert.equal(uiReady({...x,rooms:'4',livingArea:'120',price:'450000'}),false);
 const checked=confirm({...x,rooms:'4',livingArea:'120',price:'450000'});assert.equal(pending(checked),false);assert.equal(uiReady(checked),false); // A current server assessment is mandatory even after manual conflict resolution.
 assert.equal(x.factConflicts[0].status,'unresolved');
});
test('actual local extractor does not pick a conflicting first value and readiness fails',()=>{
 const text='PLZ: 10115\nOrt: Berlin\nObjektart: Wohnung\nZimmer: 4\nZimmerzahl: 5\nWohnfläche: 120\nKaufpreis: 450000';
 const x=api.exports.extract(text,'DE');assert.equal(x.rooms,'');assert(pending(x));assert.equal(api.exports.ready(x),false);
});
test('actual local extractor keeps working without conflict',()=>{
 const x=api.exports.extract('PLZ: 10115\nOrt: Berlin\nObjektart: Wohnung\nZimmer: 4\nWohnfläche: 120\nKaufpreis: 450000','DE');
 assert.equal(x.rooms,'4');assert.equal(x.price,'450000');assert.equal(api.exports.ready(x),true);
});
test('late conflict in extensive expose is detected without truncation',()=>{
 const x=collect('Zimmer: 4\n'+'Unkritischer Dokumentinhalt\n'.repeat(20000)+'Zimmerzahl: 5');
 assert.equal(x.conflicts[0].field,'rooms');assert.equal(x.values.rooms,'');
});
test('final response reapplies guard after AI and explicit-area fallback; generation refuses unresolved conflicts',()=>{
 // Execute the final shared response/persistence initializer, rather than
 // requiring duplicate literal calls in two object properties.
 const tree=ts.createSourceFile('route.ts',route,ts.ScriptTarget.Latest,true);let final;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='confirmedExtracted')final=n;ts.forEachChild(n,visit);}visit(tree);
 assert(final);assert(final.pos>route.indexOf('const explicitNetLivingArea ='));
 const country=loadTs(path.join(root,'lib/expose-object-country.ts'));
 const scope={...guard,...country,extracted:{...base(),countryCode:'CH'},combinedFastText:'Land: DE\nZimmer: 4\nZimmer: 5\nWohnfläche: 120\nKaufpreis: EUR 450000'};
 const checked=vm.runInNewContext(final.initializer.getText(tree),scope);
 assert.equal(checked.rooms,'');assert(pending(checked));assert.equal(checked.countryCode,'DE');assert.equal(checked.requiresManualReview,true);
 const fn=ui.slice(ui.indexOf('  async function generateListing('),ui.indexOf('    const generateRequest ='));
 assert(fn.includes('hasUnresolvedExposeConflicts(facts)'));
 const start=ui.indexOf('async function processFiles'),stop=ui.indexOf('if (hasUnresolvedExposeConflicts(facts) || !facts.countryCode) {',start);
 assert(stop>start&&stop<ui.indexOf('const variantsPromise ='));
});
