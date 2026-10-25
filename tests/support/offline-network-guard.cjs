'use strict';
const deny=()=>{throw Error('RC_OFFLINE_NETWORK_OR_SUBPROCESS_DISABLED');};
require('node:net').Socket.prototype.connect=deny;
for(const name of ['node:http','node:https']){const m=require(name);m.request=deny;m.get=deny;}
require('node:tls').connect=deny;
globalThis.fetch=async()=>deny();
if(process.env.NODE_TEST_CONTEXT){const child=require('node:child_process');for(const method of ['exec','execFile','spawn','fork','execSync','execFileSync','spawnSync'])child[method]=deny;}
