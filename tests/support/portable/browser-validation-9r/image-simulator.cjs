'use strict';
function simulateVision(ids){
   const cats=['living','kitchen','bedroom','bathroom','exterior','exterior','floorplan','living','living','bedroom','exterior','other'];
   const result={imageAnalyses:ids.map((imageId,i)=>({imageId,imageIndex:i+1,room:i===11?'':cats[i],category:cats[i],roomConfidence:i===11?0:.98,roomIndependentFacts:[],condition:'Keine Zustandsbewertung im simulierten Bedienablauf',visibleFacts:[],qualityScore:i===8?35:i===9?30:85,titleScore:i===0?95:i===4?90:70,suitable:![6,8,9,10,11].includes(i),sharpnessScore:i===9?20:90,exposureScore:i===8?20:90,suitabilityConfidence:i===11?.3:.98,suitabilityReason:i===11?'Unklarer Detailausschnitt':i===10?'Gedrehte Aufnahme':i===6?'Fiktiver schematischer Grundriss':'Simulierter Bildtest',duplicateOfImageIndex:i===7?1:null,duplicateConfidence:i===7?.99:0}))};
return result;
}
module.exports={simulateVision};
