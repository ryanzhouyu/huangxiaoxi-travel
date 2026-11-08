// 独立候选数据库验证。需本机 Docker 引擎；仅创建本脚本专属、无网络无端口容器。
import {spawn} from 'node:child_process';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const name = 'hxx-r01-transaction-spike-20261108';
const image = process.env.HXX_POSTGRES_IMAGE || 'postgres:18';
const output = process.env.HXX_SPIKE_REPORT || '.codex/local-deploy/r01-transaction-spike.json';
function docker(args, input) {
  return new Promise((resolve,reject)=>{
    const child=spawn('docker',args,{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);
    child.on('error',reject);
    child.on('close',code=>code===0?resolve(stdout.trim()):reject(new Error(stderr.trim()||stdout.trim())));
    child.stdin.end(input);
  });
}
const sql = statement => docker(['exec','-i',name,'psql','-U','postgres','-X','-q','-A','-t','-v','ON_ERROR_STOP=1'], statement);
const query = async statement => JSON.parse(await sql(statement));
const draw = (account,scene,pool,request) => query(`SELECT alpha_spike.draw_reward('${account}','${scene}','${pool}','${request}');`);
const checks=[];
let containerId;
try {
  const existing=await docker(['ps','-a','--filter','name=^/'+name+'$','--format','{{.ID}}']);
  if(existing)throw Error('Existing experiment container found; refusing to replace it.');
  // trust 只用于 network=none 且没有宿主映射端口的临时实验，不是部署配置。
  containerId=await docker(['run','--rm','-d','--network','none','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust',image]);
  let ready=false;
  for(let i=0;i<45;i++) {
    try{await docker(['exec',name,'pg_isready','-U','postgres']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}
  }
  assert.ok(ready,'PostgreSQL readiness');
  const version=await sql('SELECT version();');
  const imageId=await docker(['inspect','--format','{{.Image}}',containerId]);
  await sql(await readFile(new URL('./transaction-spike.sql',import.meta.url),'utf8'));
  const repeated=await Promise.all(Array.from({length:8},()=>draw('same','s1','p1','request-1')));
  assert.ok(repeated.every(r=>JSON.stringify(r)===JSON.stringify(repeated[0])));
  assert.equal(await query("SELECT balance::text FROM alpha_spike.wallets WHERE account_id='same';"),1);
  checks.push('8 concurrent identical requests return the same draw and debit once');
  await assert.rejects(()=>draw('same','s2','p2','request-1'),/REQUEST_CONFLICT/);
  checks.push('same request with different input rejected');
  const last=await Promise.all([draw('last','s1','p1','request-1'),draw('last','s1','p1','request-2')]);
  assert.deepEqual(last.map(x=>x.code).sort(),['DRAWN','POOL_COMPLETE']);
  assert.equal(await query("SELECT balance::text FROM alpha_spike.wallets WHERE account_id='last';"),0);
  checks.push('last reward and one ticket cannot be awarded or debited twice');
  const global=await Promise.all([draw('global','s1','p1','request-1'),draw('global','s2','p2','request-2')]);
  assert.deepEqual(global.map(x=>x.code).sort(),['DRAWN','POOL_COMPLETE']);
  assert.equal(await query("SELECT sum(balance)::text FROM alpha_spike.wallets WHERE account_id='global';"),1);
  assert.equal(await query("SELECT count(*)::text FROM alpha_spike.ownership WHERE account_id='global';"),1);
  checks.push('two scenes racing for a shared asset give one ownership and one debit');
  await assert.rejects(()=>sql("SELECT alpha_spike.draw_reward('rollback','s1','p1','request-1',true);"),/INJECTED_FAILURE/);
  const rolledBack=await query("SELECT jsonb_build_object('balance',(SELECT balance FROM alpha_spike.wallets WHERE account_id='rollback'),'owned',(SELECT count(*) FROM alpha_spike.ownership WHERE account_id='rollback'),'requests',(SELECT count(*) FROM alpha_spike.requests WHERE account_id='rollback'),'draws',(SELECT count(*) FROM alpha_spike.draws WHERE account_id='rollback'),'ledger',(SELECT count(*) FROM alpha_spike.ledger WHERE account_id='rollback')); ");
  assert.deepEqual(rolledBack,{balance:1,owned:0,requests:0,draws:0,ledger:0});
  const retried=await draw('rollback','s1','p1','request-1');assert.equal(retried.code,'DRAWN');
  checks.push('failure after debit rolls back all writes; same request can retry');
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify({date:'2026-11-08',version,imageId,checks,passed:true,scope:'Isolated PostgreSQL candidate draw transaction only; not production service or full concurrency certification.',limits:['no authentication','no visit transaction test','no deployment resources','no performance target verification']},null,2)+'\n');
  console.log('PostgreSQL candidate transaction experiment passed: '+checks.length+' scenarios.');
} catch(error) {
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify({date:'2026-11-08',passed:false,status:containerId?'failed':'environment-unavailable',checksCompleted:checks,error:error.message,scope:'Candidate experiment; not a production service test.'},null,2)+'\n');
  throw error;
} finally {
  if(containerId)await docker(['stop',containerId]);
}
