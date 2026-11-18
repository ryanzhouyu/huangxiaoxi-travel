// 地图章节与确认稿的点位目录。样例进度只供预览，不进评审账号的存档。
export const chapters = [
  {id:'jiaxiu', name:'甲秀楼', city:'贵阳市', region:'guiyang', category:'culture',
    stages:[['浮玉桥','桥'], ['甲秀楼','楼'], ['翠微园','园']]},
  {id:'huangguoshu', name:'黄果树', city:'安顺市', region:'anshun', category:'nature'},
  {id:'xiaoqikong', name:'小七孔', city:'黔南州', region:'qiannan', category:'nature',
    stages:[['小七孔古桥','桥'], ['翠谷瀑布','瀑'], ['卧龙潭','潭']]},
];

const outfits = [
  ['mountain','云山拾光'], ['flower','花溪漫步'], ['d2','套装样例 2'],
  ['w2','套装样例 4'], ['t1','套装样例 5'], ['t2','套装样例 6'],
].map(([id,name]) => ({id,name}));
const slots = ['hair','top','bottom','shoes'];
const parts = outfits.flatMap(({id:outfit}) => slots.map(slot => ({id:`sample-${outfit}-${slot}`, outfit, slot})));
const extra = [
  ['smile','开心笑眼','expression'], ['wonder','惊喜睁眼','expression'], ['peace','安静微笑','expression'],
  ['wave','挥手问候','pose'], ['look','驻足眺望','pose'],
  ['falls','瀑前水雾','background'], ['ridge','层崖远望','background'], ['shallow','石桥浅滩','background'],
].map(([id,name,slot]) => ({id,name,slot}));
const pools = [
  {id:'duopotang', name:'陡坡塘卡池', outfits:['flower','d2'], points:['duopotang'], extras:['smile','wonder','wave','falls']},
  {id:'waterfall', name:'大瀑布卡池', outfits:['mountain','w2'], points:['waterfall','market'], extras:['smile','wave','look','falls','ridge']},
  {id:'tianxing', name:'天星桥卡池', outfits:['t1','t2'], points:['tianxing'], extras:['peace','look','shallow']},
].map(({extras,...pool}) => ({...pool, assets:[...parts.filter(item => pool.outfits.includes(item.outfit)).map(item => item.id),...extras]}));
const points = [
  {id:'duopotang', anchor:'gate', name:'陡坡塘', kind:'景点', pools:['duopotang'], reward:2},
  {id:'waterfall', anchor:'ridge', name:'大瀑布', kind:'景点', pools:['waterfall'], reward:2},
  {id:'tianxing', anchor:'brook', name:'天星桥', kind:'景点', pools:['tianxing'], reward:2},
  {id:'market', anchor:'shop', name:'手作铺', kind:'商家', pools:['waterfall'], reward:1},
];

export const huangguoshu = {
  scene:{id:'huangguoshu', name:'黄果树', label:'安顺市'}, points, pools, outfits,
  assets:[...parts,...extra], featured:['mountain','flower'],
};

export const chapterSample = {
  events:['duopotang','waterfall'].map(pointId => ({pointId})),
  claimed:['point:duopotang','point:waterfall'],
  unlocked:['duopotang','waterfall'],
  owned:[...parts.filter(item => ['mountain','flower'].includes(item.outfit)).map(item => item.id),
    'sample-d2-top','smile','look','ridge'],
};
