'use strict';
const crypto=require('node:crypto');
const bindings=require('./image-identities.json').bindings;
if(bindings.length!==12||new Set(bindings.map(x=>x.id)).size!==12||new Set(bindings.map(x=>x.requestSha256)).size!==12)throw Error('SIMULATOR_IDENTITY_MANIFEST_INVALID');
function simulateVision(ids,body){
 const urls=body.input.flatMap(m=>m.content||[]).filter(x=>x.type==='input_image').map(x=>x.image_url);
 if(!ids.length||urls.length!==ids.length||new Set(ids).size!==ids.length)throw Error('SIMULATOR_REQUEST_IDENTITIES_INVALID');
 const motifs=urls.map(url=>{if(typeof url!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(url))throw Error('SIMULATOR_IMAGE_UNKNOWN');const bytes=Buffer.from(url.slice(url.indexOf(',')+1),'base64');const hash=crypto.createHash('sha256').update(bytes).digest('hex');const b=bindings.find(x=>x.requestSha256===hash);if(!b)throw Error('SIMULATOR_IMAGE_UNKNOWN');return b.id;});
 ids.forEach((id,i)=>{if(/^S\d{2}$/.test(id)&&id!==motifs[i])throw Error('SIMULATOR_IDENTITY_MISMATCH');});
 if(new Set(motifs).size!==motifs.length)throw Error('SIMULATOR_DUPLICATE_IMAGE_IDENTITY');
 const cats=['living','kitchen','bedroom','bathroom','exterior','exterior','floorplan','living','living','bedroom','exterior','other'];
 return {imageAnalyses:motifs.map((motif,n)=>{const i=Number(motif.slice(1))-1;return {imageId:ids[n],imageIndex:n+1,room:i===11?'':cats[i],category:cats[i],roomConfidence:i===11?0:.98,roomIndependentFacts:[],condition:'Keine Zustandsbewertung im simulierten Bedienablauf',visibleFacts:[],qualityScore:i===8?35:i===9?30:85,titleScore:i===0?95:i===4?90:70,suitable:![6,7,8,9,10,11].includes(i),sharpnessScore:i===9?20:90,exposureScore:i===8?20:90,suitabilityConfidence:i===11?.3:.98,suitabilityReason:i===7?'Bekanntes komprimiertes Duplikat von S01':i===11?'Unklarer Detailausschnitt':i===10?'Gedrehte Aufnahme':i===6?'Fiktiver schematischer Grundriss':'Simulierter Bildtest',duplicateOfImageIndex:i===7&&motifs.includes('S01')?motifs.indexOf('S01')+1:null,duplicateConfidence:i===7&&motifs.includes('S01')?.99:0};})};
}
module.exports={simulateVision};
