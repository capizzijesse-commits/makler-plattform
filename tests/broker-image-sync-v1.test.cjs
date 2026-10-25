/* eslint-disable @typescript-eslint/no-require-imports -- Offline component regression harness. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const page=fs.readFileSync('app/cockpit/[id]/edit/page.tsx','utf8');
const ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
function visit(node){if(ts.isJsxAttribute(node)&&node.name.text==='onImagesLoaded')callback=node.initializer.expression.getText(ast);ts.forEachChild(node,visit);}visit(ast);
assert(callback,'Editor must consume the confirmed server image state');
const transpile=(text,jsx=false)=>ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:jsx?ts.JsxEmit.ReactJSX:undefined}}).outputText;
const clone=x=>JSON.parse(JSON.stringify(x));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function descendants(node){if(node==null||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(descendants);return [node,...descendants(node.props?.children)];}
function text(node){if(node==null||typeof node==='boolean')return '';if(typeof node!=='object')return String(node);if(Array.isArray(node))return node.map(text).join('');return text(node.props?.children);}
function harness({failure,initial}={}){
 const ids=Array.from({length:7},(_,i)=>'F0'+(i+1));
 let server=initial??{snapshot:'initial',facts:{},reviewedContent:{facts:{},variants:[]},technicalReady:false,brokerApproved:false,images:ids.map((id,i)=>({id,position:i,isPrimary:id==='F03',version:id+'-v1',decision:id==='F02'?'reject':'accept',note:'Reviewed fixture',reasons:[],reasonLabels:[]}))};
 let parent=ids.map((id,i)=>({id,position:i,isPrimary:id==='F03',url:'/local/'+id,fileName:id+'.png'}));
 const update=vm.runInNewContext(transpile('const update = '+callback+'; update;'),{setImages:fn=>{parent=fn(parent);},Map});
 let slots=[],cursor=0,effects=[],mounted=false,tree,postCount=0,callbackCount=0;
 const react={useState(value){const index=cursor++;if(!(index in slots))slots[index]=value;return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];},useEffect(fn){cursor++;if(!mounted)effects.push(fn);}};
 const jsx=(type,props)=>({type,props});const module={exports:{}};
 const fetch=async(_url,options={})=>{
  assert.equal(_url,'/api/listings/test/broker-review');
  if(options.method==='POST'){
   postCount++;if(failure==='post')return {ok:false,json:async()=>({error:'REVIEW_STALE_RELOAD_REQUIRED'})};
   if(failure==='network')throw Error('Network unavailable');
   const body=JSON.parse(options.body);assert.equal(body.action,'images');
   server={...server,snapshot:'saved',images:server.images.map(image=>({...image,...body.decisions.find(d=>d.imageId===image.id),position:body.order.indexOf(image.id),isPrimary:image.id===body.primary}))};
   return {ok:true,json:async()=>({success:true})};
  }
  assert.equal(options.cache,'no-store');
  if(postCount&&failure==='refresh')return {ok:false,json:async()=>({error:'Reload failed'})};
  return {ok:true,json:async()=>clone(server)};
 };
 vm.runInNewContext(transpile(fs.readFileSync('app/cockpit/[id]/edit/BrokerReviewPanel.tsx','utf8'),true),{module,exports:module.exports,require:id=>{if(id==='react')return react;if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};throw Error(id);},fetch});
 function render(){cursor=0;tree=module.exports.default({listingId:'test',images:parent,dirty:false,onImagesLoaded:images=>{callbackCount++;update(images);}});mounted=true;return tree;}
 function button(label){const found=descendants(tree).find(n=>n.type==='button'&&text(n)===label);assert(found,'Missing button '+label);return found;}
 async function mount(){render();for(const effect of effects)effect();effects=[];await flush();render();}
 async function saveF04(){const article=descendants(tree).find(n=>n.type==='article'&&descendants(n).some(c=>c.type==='img'&&c.props.alt==='F04.png'));const titleButton=descendants(article).find(n=>n.type==='button'&&text(n).startsWith('Als Titelbild'));titleButton.props.onClick();render();button('Bildentscheidungen und Reihenfolge speichern').props.onClick();await flush();render();}
 return {mount,saveF04,parent:()=>clone(parent),server:()=>clone(server),count:()=>callbackCount,tree:()=>tree,reviewOrder:()=>descendants(tree).filter(n=>n.type==='select'&&n.props['aria-label']?.startsWith('Entscheidung ')).map(n=>n.props['aria-label'].split(' ')[1].replace('.png','')),message:()=>descendants(tree).filter(n=>n.props?.role==='status').map(text).join(' '),error:()=>descendants(tree).filter(n=>n.props?.role==='alert').map(text).join(' ')};
}
test('saved F04 primary and server order synchronize both editor areas without deleting rejected originals',async()=>{
 const h=harness();await h.mount();await h.saveF04();
 assert.equal(h.parent().find(i=>i.isPrimary).id,'F04');
 assert.deepEqual(h.parent().map(i=>i.id),h.reviewOrder());
 assert.equal(h.parent()[0].id,'F04');assert.equal(h.parent().length,7);
 assert.equal(h.server().images.find(i=>i.id==='F02').decision,'reject');
 assert.equal(h.server().brokerApproved,false);assert.equal(h.server().technicalReady,false);
 assert.match(h.message(),/Bildentscheidungen gespeichert/);
 const fresh=harness({initial:h.server()});await fresh.mount();
 assert.equal(fresh.parent().find(i=>i.isPrimary).id,'F04');
 assert.deepEqual(fresh.parent().map(i=>i.id),h.parent().map(i=>i.id));
});
for(const failure of ['post','network','refresh'])test(failure+' failure never publishes optimistic parent state or a success message',async()=>{
 const h=harness({failure});await h.mount();const before=h.parent(),calls=h.count();await h.saveF04();
 assert.deepEqual(h.parent(),before);assert.equal(h.count(),calls);assert.equal(h.message(),'');assert(h.error());
});
