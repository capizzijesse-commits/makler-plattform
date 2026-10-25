// Isolated test preload only. Not imported by the application or used in production.
const fs=require('node:fs'),p=require('node:path'),crypto=require('node:crypto'),ts=require('typescript'),Module=require('module');
const configFile=p.resolve(__dirname,'../lib/local-automation-test-config.ts');
const mod=new Module(configFile,module);mod.filename=configFile;mod.paths=module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(configFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,configFile);
const {validateLocalAutomationTestConfig,localAutomationTestBinding}=mod.exports;
const proofBytes=fs.readFileSync(process.env.INSERAT_AI_LOCAL_TEST_PROOF_PATH||'');
const proofSha256=crypto.createHash('sha256').update(proofBytes).digest('hex'),proof=JSON.parse(proofBytes);
if(proofSha256!==process.env.INSERAT_AI_LOCAL_TEST_PROOF_SHA256||!validateLocalAutomationTestConfig(process.env,proof))throw Error('LOCAL_TEST_ISOLATION_INVALID');
const allowedPorts=new Set([proof.database.port,proof.fixturePort,proof.appPort]);
function checkHost(host,port){if(!['127.0.0.1','localhost','::1','[::1]'].includes(host)||!allowedPorts.has(Number(port)))throw Error('LOCAL_TEST_NETWORK_BLOCKED');}
function checkUrl(input){const u=new URL(input);if(u.protocol!=='http:')throw Error('LOCAL_TEST_NETWORK_BLOCKED');checkHost(u.hostname,u.port||80);}
const fetchOriginal=globalThis.fetch;
globalThis.fetch=function(input,init){const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(url==='https://api.openai.com/v1/responses')return fetchOriginal('http://127.0.0.1:'+proof.fixturePort+'/v1/responses',init);
 checkUrl(url);return fetchOriginal(input,init);
};
for(const name of ['node:http','node:https']){const m=require(name);for(const method of ['request','get']){const original=m[method];m[method]=function(...args){const first=args[0];if(typeof first==='string'||first instanceof URL)checkUrl(first);else {if(first.protocol==='https:')throw Error('LOCAL_TEST_NETWORK_BLOCKED');checkHost(first.hostname||first.host||'localhost',first.port||80);}return original.apply(this,args);};}}
const net=require('node:net'),connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const normalized=Array.isArray(args[0])?args[0]:args;const first=normalized[0];
 if(typeof first==='object'){if(!first.path)checkHost(first.host||'localhost',first.port);}
 else if(typeof first==='number')checkHost(typeof normalized[1]==='string'?normalized[1]:'localhost',first);
 else if(typeof first!=='string')throw Error('LOCAL_TEST_NETWORK_BLOCKED');
 return connect.apply(this,args);
};
const tls=require('node:tls');tls.connect=()=>{throw Error('LOCAL_TEST_NETWORK_BLOCKED');};
const listen=net.Server.prototype.listen;
net.Server.prototype.listen=function(...args){const first=args[0];
 if(typeof first==='object'){if(!first.path)checkHost(first.host,first.port);}
 else if(typeof first==='number')checkHost(args[1],first);
 else if(typeof first!=='string')throw Error('LOCAL_TEST_NETWORK_BLOCKED');
 return listen.apply(this,args);
};
Object.defineProperty(globalThis,Symbol.for('inserat-ai.local-test-network.v1'),{value:Object.freeze({proofSha256,networkPolicy:'loopback-only',configurationHash:crypto.createHash('sha256').update(localAutomationTestBinding(process.env)).digest('hex')}),writable:false,configurable:false});
