export const SCENE = {id:'demo',name:'黔山漫游',label:'贵州 · 测试景区',description:'从山门的第一步，到花溪边的一次停留。让黄晓西陪你把走过的地方慢慢收集起来。'};
export const SLOTS = {hair:'发型',top:'上装',bottom:'下装',shoes:'鞋履',expression:'表情',pose:'姿势',background:'背景'};
export const OUTFITS = [
 {id:'start-a',name:'山野来信',colors:['#514538','#b9c7ab','#536b58','#50493f'],source:'初始装扮'},
 {id:'start-b',name:'晴日出发',colors:['#514538','#e5bf73','#826c51','#635a4d'],source:'初始装扮'},
 {id:'start-c',name:'溪边薄荷',colors:['#514538','#a1c8c5','#5c7e84','#53606b'],source:'初始装扮'},
 {id:'gift',name:'黔山初见',colors:['#393c36','#b3bbda','#777d9e','#484c5e'],source:'景区免费套装'},
 {id:'mountain',name:'云山拾光',colors:['#424a48','#a4bbc0','#60788c','#3d4e5c'],source:'云山卡池'},
 {id:'flower',name:'花溪漫步',colors:['#674935','#e5ac9d','#ac6e78','#77515a'],source:'花溪卡池'},
];
export const ASSETS = OUTFITS.flatMap(o=>['hair','top','bottom','shoes'].map((slot,i)=>({id:`${o.id}-${slot}`,name:`${o.name}·${SLOTS[slot]}`,slot,color:o.colors[i],outfit:o.id,source:o.source}))).concat([
 {id:'calm',name:'自在',slot:'expression',source:'初始装扮'},
 {id:'stand',name:'轻松站立',slot:'pose',source:'初始装扮'},
 {id:'paper',name:'旅行手账',slot:'background',source:'初始装扮',color:'#e7e5d7'},
 {id:'joy',name:'开心笑眼',slot:'expression',source:'两个卡池均可收集'},
 {id:'wave',name:'挥手问候',slot:'pose',source:'两个卡池均可收集'},
 {id:'mountain-bg',name:'山色留白',slot:'background',source:'云山卡池',color:'#bdcdd0'},
 {id:'flower-bg',name:'花间日记',slot:'background',source:'花溪卡池',color:'#ead4cf'},
]);
export const STARTERS=OUTFITS.slice(0,3);
export const lookFor=id=>Object.fromEntries(['hair','top','bottom','shoes'].map(s=>[s,`${id}-${s}`]).concat([['expression','calm'],['pose','stand'],['background','paper']]));
export const POINTS=[
 {id:'gate',name:'山门入口',kind:'景点',desc:'从这里开始走进黔山。入口首次有效打卡即可获得景区通用次数。',reward:2,pools:['cloud'],code:'HXX-GATE-2026',spot:'入口广场 · 游客中心旁'},
 {id:'ridge',name:'望山台',kind:'景点',desc:'沿步道走到观景台，留下一次与山相遇的记录。与入口共享云山卡池。',reward:2,pools:['cloud'],code:'HXX-RIDGE-2026',spot:'山间步道 · 观景平台'},
 {id:'brook',name:'花溪小径',kind:'景点',desc:'在溪边慢慢走，收集属于花溪的装扮。',reward:2,pools:['bloom'],code:'HXX-BROOK-2026',spot:'花溪步道 · 临水休息区'},
 {id:'shop',name:'山间手作铺',kind:'商家',desc:'逛逛本地手作，或参加一场小小的文创体验。到店与体验奖励分别领取。',reward:1,pools:['bloom'],code:'HXX-SHOP-2026',spot:'花溪步道 · 文创街 01 号'},
];
export const ACTIVITY={id:'craft',point:'shop',name:'一枚旅行手作',reward:2,description:'到店参加约 20 分钟的手作体验，完成后由店员核验。测试版不发生真实消费。'};
export const POOLS=[
 {id:'cloud',name:'云山卡池',subtitle:'把山色带在身上',outfits:['mountain'],assets:ASSETS.filter(a=>a.outfit==='mountain').map(a=>a.id).concat(['joy','wave','mountain-bg']),points:['gate','ridge']},
 {id:'bloom',name:'花溪卡池',subtitle:'收集一路的柔软颜色',outfits:['flower'],assets:ASSETS.filter(a=>a.outfit==='flower').map(a=>a.id).concat(['joy','wave','flower-bg']),points:['brook','shop']},
];
export const PACKS=[{id:'one',count:1,price:'1.00'},{id:'five',count:5,price:'4.00'},{id:'ten',count:10,price:'7.00'}];
export const asset=id=>ASSETS.find(a=>a.id===id);
export const pool=id=>POOLS.find(p=>p.id===id);
export const point=id=>POINTS.find(p=>p.id===id);
