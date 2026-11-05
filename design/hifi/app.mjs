import {pages,stateNames} from './catalog.mjs';
import {renderPage,renderModal,button,go} from './pages.mjs';
import {item,icon} from './art.mjs';

const $=selector=>document.querySelector(selector);
let route={id:'partner',state:'default'},returnTo='partner',selectedPackage={count:5,price:'4.00'};
const composeDraft={title:'把黔山带回去',template:'单页纪念',eventCount:3};
let bindingPurpose='initial',toastTimer;
const modalStates=new Set(['agreement','bind-conflict','place-list','gift','checkin-success','checkin-failed','no-balance','prize','dirty','source','render-failed','share','logout','change-phone','recover']);

function parse(){
  const [id,query='']=location.hash.slice(1).split('?');
  const params=new URLSearchParams(query);
  return {id:pages.some(p=>p.id===id)?id:'partner',state:params.get('state')||'default',pool:params.get('pool')||'cloud'};
}

function fit(){
  if(innerWidth<=700)return;
  const width=innerWidth-238-(innerWidth>1100?(innerWidth>=1500?300:269):0)-55;
  const scale=Math.min(1,(innerHeight-151)/844,width/390);
  document.documentElement.style.setProperty('--view-scale',Math.max(.35,scale));
}

function navigate(id,state='default',opts={}){
  if(id==='wardrobe'&&route.id!=='wardrobe')returnTo=opts.from||route.id;
  if(id==='bind')bindingPurpose=opts.purpose||'initial';
  const params=new URLSearchParams();
  if(state!=='default')params.set('state',state);
  if(id==='pool'&&(opts.pool||route.id==='pool'&&route.pool)==='bloom')params.set('pool','bloom');
  const target='#'+id+(params.size?'?'+params.toString():'');
  if(location.hash===target){render();return;}
  location.hash=target;
}

function toast(message){
  document.querySelector('.hifi-toast')?.remove();
  const el=document.createElement('div');el.className='hifi-toast';el.role='status';el.textContent=message;$('#phone').append(el);
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),3500);
}

function modal(state){
  const content=renderModal(state);
  if(content){$('#overlay').innerHTML=content;$('#overlay button, #overlay input')?.focus({preventScroll:true});}
}

function render(){
  route=parse();const page=pages.find(p=>p.id===route.id);
  document.title=page.name+' · 黄晓西高保真设计';
  $('#screen').innerHTML=renderPage(route.id,route.state);
  if(route.id==='pool'&&route.pool==='bloom'){
    $('#screen').innerHTML=$('#screen').innerHTML.replaceAll('云山拾光','花溪漫步').replaceAll('云山','花溪');
  }
  if(route.id==='compose'||route.id==='work'){
    const title=$('.postcard-title strong');if(title)title.textContent=composeDraft.title||'把黔山带回去';
    if(route.id==='compose'){
      $('#work-title').value=composeDraft.title;
      $('.selected-events>b').textContent='已选 '+composeDraft.eventCount+' 条到访经历';
      document.querySelectorAll('.template-options button').forEach(b=>b.classList.toggle('active',b.textContent===composeDraft.template));
    }
    if(route.id==='work')$('.work-description h2').textContent=composeDraft.title||'把黔山带回去';
  }
  $('#screen').dataset.page=route.id;$('#screen').dataset.state=route.state;
  $('#overlay').innerHTML='';
  if(modalStates.has(route.state)&&route.state!=='agreement')modal(route.state);
  $('#page-title').textContent=page.name;$('#note-title').textContent=page.name;$('#note').textContent=page.note;
  $('#states').innerHTML=page.states.map(s=>`<button class="state-button ${s===route.state?'active':''}" data-state="${s}">${stateNames[s]||s}</button>`).join('');
  $('#position').textContent=String(pages.indexOf(page)+1).padStart(2,'0')+' / '+pages.length;
  let group='';$('#pages').innerHTML=pages.map((p,i)=>{const title=p.group!==group?`<div class="nav-group">${p.group}</div>`:'';group=p.group;return title+`<a href="#${p.id}" class="${p.id===route.id?'selected':''}" ${p.id===route.id?'aria-current="page"':''}><small>${String(i+1).padStart(2,'0')}</small>${p.name}</a>`;}).join('');
  if(bindingPurpose==='change'&&route.id==='bind'){
    const title=$('.auth-paper>h2');if(title)title.textContent='原身份已验证，绑定新手机号';
    const bottom=$('.auth-paper>.text-button');if(bottom)bottom.textContent='暂不更换，保留原绑定';
  }
  if(route.id==='order'){
    const title=$('.order-product h3'),price=$('.order-product>b');
    if(title)title.textContent=selectedPackage.count+' 次景区通用次数';
    if(price)price.textContent='¥'+selectedPackage.price;
    if(route.state==='order-paid')$('.order-status p').textContent='已增加 '+selectedPackage.count+' 次景区通用次数';
  }
  fit();
}

const categoryNames={hair:'头饰',top:'上装',bottom:'下装',shoes:'鞋履',expression:'表情',pose:'姿势',background:'背景'};
// 页签只更新本页的视觉选择反馈，不写入账号或业务搭配。
function selectWardrobeTab(action){
  document.querySelectorAll('.wardrobe-subtabs button').forEach(button=>{
    const selected=button.dataset.action===action;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
}
function showCategory(type){
  $('#category-name').textContent=categoryNames[type];
  const names={hair:['银花轻冠','山野发饰','晴日草帽','溪边花簪'],top:['黔山绣衣','山野来信','晴日出发','溪边薄荷'],bottom:['山纹百褶','山野长裙','晴日短裙','溪边长裙'],shoes:['花绣布鞋','山野布鞋','晴日绣鞋','溪边便鞋'],expression:['自在','开心笑眼'],pose:['轻松站立','挥手问候'],background:['旅行手账','山色留白']};
  $('.wardrobe-grid').innerHTML=names[type].map((n,i)=>`<button class="asset-tile ${i===0?'selected':''}" data-action="select-asset" data-type="${type}"><span>${item(type==='hair'&&i===2?'hat':type==='hair'&&i===3?'pin':type)}</span><b>${n}</b><small>已收集</small></button>`).join('');
  $('#selected-name').textContent=names[type][0];
  $('.selected-item>small').textContent='当前分类 · '+categoryNames[type];
}

document.addEventListener('click',event=>{
  const el=event.target.closest('button,a');if(!el)return;
  if(el.dataset.go){
    navigate(el.dataset.go,'default',{from:el.dataset.from,purpose:el.dataset.purpose});return;
  }
  if(el.dataset.state){navigate(route.id,el.dataset.state);return;}
  const action=el.dataset.action;if(!action)return;
  if(action.startsWith('memory-tab:')){navigate('memories',action.endsWith('1')?'works':'default');return;}
  if(action.startsWith('wallet-tab:')){navigate('wallet',action.endsWith('1')?'orders':'default');return;}
  switch(action){
    case 'close-modal':$('#overlay').innerHTML='';break;
    case 'get-code':{
      if(!$('#agreement').checked){navigate('entry','agreement');return;}
      const phone=$('#phone-number').value.trim();
      if(phone&&!/^1\d{10}$/.test(phone)){toast('请输入 11 位手机号，或留空使用示例预览。');return;}
      navigate('code');break;
    }
    case 'verify-login':{
      const code=[...document.querySelectorAll('.otp input')].map(i=>i.value).join('');
      if(!/^\d{6}$/.test(code)){toast('请填写 6 位数字。设计演示可使用任意六位数。');return;}
      navigate(route.state==='returning'?'partner':'onboarding');toast('验证码仅演示，未发送或校验真实短信。');break;
    }
    case 'returning':navigate('partner');break;
    case 'bind-send':toast('设计演示：未发送真实验证码。');break;
    case 'bind-confirm':navigate(bindingPurpose==='change'?'security':'onboarding');toast('这是绑定完成的设计路径，未修改真实账号。');break;
    case 'bind-skip':navigate(bindingPurpose==='change'?'security':'onboarding');break;
    case 'starter':document.querySelectorAll('.starter-options button').forEach(b=>b.classList.toggle('chosen',b===el));toast('已选择默认搭配方案，角色服饰为统一示意母版。');break;
    case 'talk':$('#companion-line').textContent='把今天喜欢的风景，一起带回家吧。';break;
    case 'filter':document.querySelectorAll('.map-categories button').forEach(b=>b.classList.toggle('active',b===el));document.querySelectorAll('.map-pin').forEach((p,i)=>{p.hidden=el.textContent==='商家'?i!==3:el.textContent==='活动'?i!==3:el.textContent==='景点'?i===3:false;});break;
    case 'merchant':navigate('point','merchant');break;
    case 'locked-pool':navigate('pool','pool-locked',{pool:'bloom'});break;
    case 'unlock-source':modal('place-list');break;
    case 'category':document.querySelectorAll('.wardrobe-categories button').forEach(b=>b.classList.toggle('active',b===el));showCategory(el.dataset.type);break;
    case 'wardrobe-kind':selectWardrobeTab(action);showCategory('hair');break;
    case 'wardrobe-expression':selectWardrobeTab(action);showCategory('expression');break;
    case 'wardrobe-background':selectWardrobeTab(action);showCategory('background');break;
    case 'select-asset':document.querySelectorAll('.asset-tile').forEach(b=>b.classList.toggle('selected',b===el));if($('#selected-name')){$('#selected-name').textContent=el.querySelector('b').textContent;$('.selected-item>small').textContent='当前分类 · '+categoryNames[el.dataset.type];}break;
    case 'save-look':navigate(returnTo);toast('已预览保存并返回路径；设计稿不写入业务原型进度。');break;
    case 'discard-look':navigate(returnTo);break;
    case 'template':composeDraft.template=el.textContent;document.querySelectorAll('.template-options button').forEach(b=>b.classList.toggle('active',b===el));toast(el.textContent==='足迹长图'?'已选择足迹长图版式；当前为构图示意。':'已选择单页纪念版式。');break;
    case 'generate':navigate('compose','compose-preview');break;
    case 'save-work':navigate('work');toast('这里展示作品保存后的页面，不写入真实作品库。');break;
    case 'download':toast('这是高保真设计预览；真实 PNG 下载请使用业务交互原型。');break;
    case 'paid':navigate('order','order-paid');break;
    case 'pay-failed':navigate('order','order-failed');break;
    case 'cancel-order':navigate('order','order-cancelled');break;
    case 'package':document.querySelectorAll('.package-grid button').forEach(b=>b.classList.toggle('selected',b===el));selectedPackage={count:Number(el.dataset.count),price:el.dataset.price};break;
    case 'staff-success':navigate('activity','activity-done');break;
    case 'staff-failed':$('#overlay').innerHTML='';toast('模拟核验未通过；未增加经历或奖励。');break;
    case 'confirm-events':{
      const checked=document.querySelectorAll('.event-check input:checked').length;
      if(!checked){toast('至少选择一条有效到访经历。');return;}
      composeDraft.eventCount=checked;$('#overlay').innerHTML='';$('.selected-events>b').textContent='已选 '+checked+' 条到访经历';break;
    }
    case 'change-phone':bindingPurpose='change';modal('change-phone');break;
    default:modal(action);
  }
});

document.addEventListener('input',event=>{
  if(event.target.id==='work-title'){
    composeDraft.title=event.target.value;
    const title=$('.postcard-title strong');if(title)title.textContent=event.target.value||'把黔山带回去';
  }
  if(event.target.closest('.otp')&&event.target.value)event.target.nextElementSibling?.focus();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape')$('#overlay').innerHTML='';});
$('#previous').addEventListener('click',()=>navigate(pages[(pages.findIndex(p=>p.id===route.id)-1+pages.length)%pages.length].id));
$('#next').addEventListener('click',()=>navigate(pages[(pages.findIndex(p=>p.id===route.id)+1)%pages.length].id));
addEventListener('resize',fit);addEventListener('hashchange',render);
render();
