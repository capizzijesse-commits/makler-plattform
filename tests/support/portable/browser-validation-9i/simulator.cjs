// Offline fixture adapter, NOT model output and NOT a quality verdict. No HTTP client.
const fs=require('node:fs'),p=require('node:path');
const fixture=JSON.parse(fs.readFileSync(p.resolve(__dirname,'../../../fixtures/editorial-gold-9b.json'))).variants;
function simulateChat(body){
 const messages=body.messages||[],system=messages.filter(x=>x.role==='system').map(x=>x.content).join('\n'),user=messages.filter(x=>x.role==='user').map(x=>x.content).join('\n');
 // Operation is determined from the actual prompt contract, never from model name.
 if(/HARD FACT auditor/.test(system))return {kind:'fact_audit',data:{completed:true,checkedVariants:[1,2,3],findings:[]},simulated:true};
 let market;
 if(/for the Swiss market/i.test(system)||/For Swiss German, use ss instead of ß/.test(user))market='CH';
 else if(/for the German market/i.test(system)||/Keep German orthography with ß/.test(user))market='DE';
 else {const match=user.match(/TARGET MARKET:\s*(CH|DE)|"market"\s*:\s*"(CH|DE)"/);market=match?.[1]||match?.[2];}
 if(!market)throw Error('SIMULATOR_MARKET_UNCONFIRMED');
 const variants=fixture.map(x=>Object.fromEntries(Object.entries(x).map(([key,value])=>[key,market==='CH'?value.replace(/ß/g,'ss').replace(/ẞ/g,'SS'):value])));
 if(/targeted quality repair engine/.test(system)){
  const raw=user.match(/VARIANTS TO REWRITE:\s*([1-3](?:\s*,\s*[1-3])*)/);
  if(!raw)throw Error('SIMULATOR_REPAIR_SELECTION_INVALID');
  const numbers=raw[1].split(',').map(Number);if(new Set(numbers).size!==numbers.length)throw Error('SIMULATOR_REPAIR_SELECTION_INVALID');
  return {kind:'targeted_repair',market,simulated:true,data:{repairs:numbers.map(n=>({variantNumber:n,...variants[n-1]}))}};
 }
 if(/senior real-estate copy editor/.test(system)){
  const original=user.match(/ORIGINAL TITLE:\s*([^\n]+)/)?.[1]?.trim();
  const index=variants.findIndex(v=>v.title===original||v.title.replace(/ss/g,'ß')===original);
  if(index<0)throw Error('SIMULATOR_SINGLE_REPAIR_FIXTURE_UNCONFIRMED');
  return {kind:'single_repair',market,simulated:true,data:{variant:variants[index]}};
 }
 if(!/senior real estate editorial engine/i.test(system))throw Error('SIMULATOR_OPERATION_UNSUPPORTED');
 const assigned=user.match(/ASSIGNED VARIANT:\s*([1-3])/);
 return {kind:'initial_text',market,simulated:true,data:assigned?{variant:variants[Number(assigned[1])-1]}:{variants}};
}
module.exports={simulateChat};
