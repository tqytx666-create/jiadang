(()=>{
'use strict';
/* ============ 小工具 ============ */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
const DAY=864e5, pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>ymd(new Date());
const toDate=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const dayDiff=(a,b)=>Math.round((toDate(b)-toDate(a))/DAY);
const addDays=n=>ymd(new Date(Date.now()+n*DAY));
const daysFromNow=d=>d?dayDiff(today(),d):null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'¥'+Math.round(n).toLocaleString();
const fmtAge=n=>n<1?'今天':n<31?n+'天前':n<365?Math.round(n/30)+'个月前':(n/365).toFixed(1)+'年前';

const CATS={'电子数码':'📱','家电':'🔌','家具':'🪑','衣物鞋包':'👕','书籍文具':'📚','母婴玩具':'🧸','厨房餐具':'🍳','食品':'🍜','药品护肤':'💊','日用清洁':'🧴','运动户外':'⚽','工具杂物':'🔧','证件文件':'📄','其他':'📦'};
const KW={ // 关键词 → 类别（用来猜"这东西属于哪类"）
 '药品护肤':['药','创可贴','感冒','退烧','布洛芬','碘伏','棉签','体温计','口罩','面霜','精华','面膜','口红','护手霜','防晒','眼药水'],
 '电子数码':['充电','数据线','耳机','电池','插线板','手机','相机','平板','电脑','键盘','鼠标','移动硬盘','路由器','u盘'],
 '工具杂物':['螺丝','锤','钳','电钻','胶带','卷尺','扳手','钉','胶水','手电'],
 '证件文件':['证','保单','合同','发票','户口','护照','病历','保修卡','说明书'],
 '食品':['零食','饼干','茶叶','咖啡','调料','酱油','面粉','大米','罐头','坚果','干货'],
 '厨房餐具':['锅','碗','盘','筷','刀','杯','保温','餐具','砧板'],
 '衣物鞋包':['衣','裤','鞋','帽','围巾','袜','包','被','床单','毛巾'],
 '书籍文具':['书','笔','本','文具','胶水','订书','画'],
 '母婴玩具':['玩具','积木','奶瓶','尿','绘本','娃娃','拼图'],
 '日用清洁':['纸巾','洗衣','洗洁','垃圾袋','清洁','牙膏','牙刷','沐浴','洗发','卫生纸','抹布'],
 '运动户外':['球','拍','跑鞋','瑜伽','露营','帐篷','哑铃','球杆','台球'],
 '家电':['吹风','电饭','风扇','加湿','吸尘','烤箱','榨汁'],
};
const guessCat=n=>{n=(n||'').toLowerCase();for(const c in KW)if(KW[c].some(k=>n.includes(k)))return c;return null};
const ACTIVE=['use','idle'];
const STATUS={use:'在用',idle:'闲置',sold:'已卖掉',given:'已送人/捐',trashed:'已丢/回收'};

/* ============ 数据库(IndexedDB) ============ */
const DB={
 open(){return this._p||(this._p=new Promise((res,rej)=>{const r=indexedDB.open('jiadang',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))},
 async get(k){const db=await this.open();return new Promise(res=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>res(null)})},
 async set(k,v){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
};
let S=null,saveTimer=0;
const save=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>{DB.set('state',S).catch(e=>alert('保存失败：'+e));Sync.schedule(1500)},150)};

/* ============ 示范数据 ============ */
function demo(){
 const rooms=[
  {id:'r1',name:'客厅',cx:0,cz:0,w:5.5,d:4.5,color:'#f4e6cf'},
  {id:'r2',name:'厨房',cx:-4.35,cz:-0.75,w:3.2,d:3,color:'#e4efe6'},
  {id:'r3',name:'卫生间',cx:-4.35,cz:1.75,w:3.2,d:2,color:'#dbe9f2'},
  {id:'r4',name:'主卧',cx:4.35,cz:-0.5,w:3.2,d:4,color:'#efe0e6'},
  {id:'r5',name:'次卧',cx:4.35,cz:3,w:3.2,d:3,color:'#e9e4f3'},
  {id:'r6',name:'书房',cx:0,cz:3.5,w:3,d:2.5,color:'#ece9d6'},
  {id:'r7',name:'阳台',cx:0,cz:-3.1,w:5.5,d:1.6,color:'#e3ecd9'},
 ];
 const F=(id,roomId,name,x,z,w,d,h,color)=>({id,roomId,name,x,z,w,d,h,color});
 const furn=[
  F('f1','r1','电视柜',0,-1.9,2,.45,.5,'#b98d5f'),F('f2','r1','沙发',0,1.5,2.2,.9,.8,'#7a8fa6'),F('f3','r1','茶几',0,.1,1.2,.6,.4,'#a9825a'),F('f4','r1','斗柜',2.4,0,.45,1.6,1.1,'#c9a37a'),
  F('f5','r2','橱柜',-4.35,-2,3,.6,.9,'#d8d2c4'),F('f6','r2','冰箱',-5.6,-.9,.7,.7,1.8,'#cfd6dc'),
  F('f7','r3','浴室柜',-4.35,2.4,1,.5,.8,'#c8d6df'),
  F('f8','r4','衣柜',5.65,-.5,.6,2,2.2,'#b79b83'),F('f9','r4','床',4.1,-.5,1.8,2,.5,'#c9b8c0'),F('f10','r4','床头柜',4.1,-1.85,.5,.4,.5,'#a98c70'),
  F('f11','r5','书桌',4.35,4.2,1.4,.6,.75,'#b8a37e'),F('f12','r5','衣柜',5.65,3,.6,1.4,2,'#b79b83'),
  F('f13','r6','书柜',0,4.55,2.4,.35,2,'#9c7b57'),F('f14','r6','书桌',0,3.1,1.4,.7,.75,'#b8a37e'),
  F('f15','r7','储物箱',-1.8,-3.3,1,.5,.6,'#8da58f'),F('f16','r7','洗衣机',1.8,-3.3,.6,.6,.9,'#dfe3e6'),
 ];
 const Z=(id,furnId,name,purpose,cats,tags,count)=>({id,furnId,name,purpose,cats,tags,count:count||'',value:'',photos:[],note:'',checked:''});
 const zones=[
  Z('z1','f4','上层抽屉·常备药箱','全家常备药：感冒、肠胃、外伤，别的东西不放','药品护肤'.split(','),['感冒灵','布洛芬','创可贴','碘伏','体温计','藿香正气'],'约15件'),
  Z('z2','f4','下层抽屉·线材电池','所有充电线、电池、插线板、旧耳机','电子数码'.split(','),['充电线','五号电池','插线板','耳机'],'约20件'),
  Z('z3','f13','第3层·证件文件','房产证、保单、购房发票、保修卡','证件文件'.split(','),['房产证','保单','购房发票','保修卡'],'一个文件盒'),
  Z('z4','f5','吊柜·干货调料','调料、干货、面粉，不放锅具','食品,厨房餐具'.split(','),['生抽','面粉','红枣','木耳'],'约25件'),
  Z('z5','f15','工具箱','螺丝刀、锤子、电钻等修东西用的','工具杂物'.split(','),['螺丝刀','锤子','电钻','卷尺'],'约30件'),
  Z('z6','f8','上层·换季被褥','不当季的被子和厚衣服，整箱封存','衣物鞋包'.split(','),['羽绒被','冬季外套'],'3个收纳袋'),
 ];
 const I=(name,cat,o)=>Object.assign({id:uid(),name,cat,photo:null,value:'',buy:'',buyDate:'',buyFrom:'',roomId:'',furnId:'',zoneId:'',spot:'',qty:1,expiry:'',warrantyEnd:'',receipt:null,receiptNo:'',status:'use',lastUsed:today(),note:'',created:today(),log:[]},o);
 const items=[
  I('MacBook Air',  '电子数码',{value:5200,buy:8999,buyDate:addDays(-700),buyFrom:'苹果官网',furnId:'f14',spot:'桌面',warrantyEnd:addDays(-340),receiptNo:'W1029384',lastUsed:addDays(-1)}),
  I('旧款 iPhone 12','电子数码',{value:1100,buy:5499,buyDate:addDays(-1500),buyFrom:'京东',furnId:'f13',spot:'第2层盒子',status:'idle',lastUsed:addDays(-420)}),
  I('佳能单反+镜头','电子数码',{value:3500,buy:9800,buyDate:addDays(-1900),buyFrom:'线下',furnId:'f8',spot:'顶层防潮箱',lastUsed:addDays(-300)}),
  I('空气炸锅','家电',{value:120,buy:399,buyDate:addDays(-500),buyFrom:'天猫',furnId:'f5',spot:'下柜最里面',lastUsed:addDays(-210)}),
  I('智能扫地机器人','家电',{value:900,buy:2499,buyDate:addDays(-300),buyFrom:'京东',furnId:'f15',warrantyEnd:addDays(45),lastUsed:addDays(-6),receiptNo:'JD-77281'}),
  I('跑步机','运动户外',{value:600,buy:2800,buyDate:addDays(-900),buyFrom:'迪卡侬',roomId:'r7',spot:'阳台角落',status:'idle',lastUsed:addDays(-380)}),
  I('电动螺丝刀','工具杂物',{value:80,buy:199,buyDate:addDays(-800),buyFrom:'京东',furnId:'f15',zoneId:'z5',lastUsed:addDays(-30)}),
  I('感冒灵颗粒','药品护肤',{value:25,buy:25,buyDate:addDays(-200),furnId:'f4',zoneId:'z1',expiry:addDays(20),qty:2}),
  I('布洛芬缓释胶囊','药品护肤',{value:30,buy:30,buyDate:addDays(-500),furnId:'f4',zoneId:'z1',expiry:addDays(-15)}),
  I('面霜（开封）','药品护肤',{value:480,buy:480,buyDate:addDays(-400),furnId:'f7',expiry:addDays(60)}),
  I('空气净化器','家电',{value:450,buy:1599,buyDate:addDays(-1000),buyFrom:'天猫',furnId:'f9',spot:'床边',status:'idle',lastUsed:addDays(-250)}),
  I('童书绘本（一箱）','书籍文具',{value:150,buy:600,buyDate:addDays(-1200),furnId:'f12',spot:'顶层',lastUsed:addDays(-500),qty:30}),
  I('瑜伽垫','运动户外',{value:15,buy:129,buyDate:addDays(-800),furnId:'f8',spot:'底部',lastUsed:addDays(-400)}),
  I('咖啡机','家电',{value:260,buy:1299,buyDate:addDays(-600),buyFrom:'京东',furnId:'f5',warrantyEnd:addDays(25),lastUsed:addDays(-70)}),
  I('台球杆（备用）','运动户外',{value:2800,buy:3800,buyDate:addDays(-1100),buyFrom:'线下',furnId:'f1',spot:'侧面挂架',lastUsed:addDays(-120)}),
  I('旧U盘/硬盘','电子数码',{value:20,buy:150,buyDate:addDays(-1800),furnId:'f4',zoneId:'z2',status:'idle',lastUsed:addDays(-700)}),
 ];
 return {v:2,rooms,furn,zones,items,roomTidy:{},settings:{idleDays:90,tidyEvery:30,snapDays:90},tidyLog:[],demo:true};
}
const blank=()=>({v:2,rooms:[],furn:[],zones:[],items:[],roomTidy:{},settings:{idleDays:90,tidyEvery:30,snapDays:90},tidyLog:[]});

/* ============ 查询助手 ============ */
const roomById=id=>S.rooms.find(r=>r.id===id);
const furnById=id=>S.furn.find(f=>f.id===id);
const zoneById=id=>S.zones.find(z=>z.id===id);
const itemById=id=>S.items.find(i=>i.id===id);
const active=it=>ACTIVE.includes(it.status);
const est=it=>(it.value!==''&&it.value!=null)?+it.value:(it.buy?+it.buy*0.4:0);
function locOf(it){
 const z=it.zoneId?zoneById(it.zoneId):null;
 const f=z?furnById(z.furnId):furnById(it.furnId);
 const r=f?roomById(f.roomId):roomById(it.roomId);
 return {r,f,z};
}
const locText=it=>{const {r,f,z}=locOf(it);return [r?.name,f?.name,z?.name,it.spot].filter(Boolean).join(' › ')||'还没记位置'};
const zoneRoom=z=>{const f=furnById(z.furnId);return f?roomById(f.roomId):null};
const zoneText=z=>[zoneRoom(z)?.name,furnById(z.furnId)?.name,z.name].filter(Boolean).join(' › ');
const itemsInZone=zid=>S.items.filter(i=>i.zoneId===zid&&active(i));
const itemsInFurn=fid=>S.items.filter(i=>active(i)&&locOf(i).f?.id===fid);
const itemsInRoom=rid=>S.items.filter(i=>active(i)&&locOf(i).r?.id===rid);
const zonesInFurn=fid=>S.zones.filter(z=>z.furnId===fid);
const zonesInRoom=rid=>S.zones.filter(z=>furnById(z.furnId)?.roomId===rid);
const idleDays=it=>dayDiff(it.lastUsed||it.buyDate||it.created||today(),today());
const NOIDLE=['食品','药品护肤','证件文件','日用清洁'];
const isIdle=it=>active(it)&&(it.status==='idle'||(!NOIDLE.includes(it.cat)&&idleDays(it)>=S.settings.idleDays));
const latestSnap=z=>z.photos.length?z.photos.reduce((a,b)=>a.date>b.date?a:b):null;
const snapAge=z=>{const s=latestSnap(z);return s?dayDiff(s.date,today()):null};
const zonePhoto=zid=>{const z=zoneById(zid),sn=z&&latestSnap(z);return sn?sn.img:null};
const snapStale=z=>{const a=snapAge(z);return a==null?false:a>=S.settings.snapDays};

function flags(it){
 const f=[]; if(!active(it))return f;
 const e=daysFromNow(it.expiry);
 if(e!=null){if(e<0)f.push(['bad','已过期'+(-e)+'天']);else if(e<=30)f.push(['warn',e+'天后过期']);}
 const w=daysFromNow(it.warrantyEnd);
 if(w!=null&&w>=0&&w<=60)f.push(['warn','保修'+w+'天后到期']);
 if(isIdle(it))f.push(['idle','闲置'+idleDays(it)+'天']);
 return f;
}

/* ============ 处理建议 ============ */
const P={
 xianyu:{n:'闲鱼',u:'https://www.goofish.com',w:'人最多，什么都能挂；同城自提不用寄，最适合大件'},
 zhuan:{n:'转转',u:'https://www.zhuanzhuan.com',w:'数码、家电成交快，可以让平台验机'},
 aihui:{n:'爱回收',u:'https://www.aihuishou.com',w:'手机、电脑、相机：在线估价，快递或上门回收，省心但价格偏保守'},
 duozhua:{n:'多抓鱼',u:'https://www.duozhuayu.com',w:'二手书、绘本：寄过去按品相直接给价'},
 kongfz:{n:'孔夫子旧书网',u:'https://www.kongfz.com',w:'老书、绝版书、成套书能卖出好价'},
 hbl:{n:'红布林',u:'https://www.hongbulin.com',w:'品牌包、衣服、鞋：平台鉴定后寄卖，更放心'},
 community:{n:'小区群 / 同城送人',u:'',w:'发邻居群，当面给，今天就能清走，不用包装不用寄'},
 donate:{n:'捐赠 / 旧衣回收箱',u:'',w:'衣物、书、玩具：小区旧衣箱、公益捐赠点，干净的就能送'},
 bulky:{n:'以旧换新 / 上门回收',u:'',w:'买新家电时让商家旧机折价带走；或叫上门回收师傅，大件不用自己搬'},
 trash:{n:'分类回收 / 丢弃',u:'',w:'按小区垃圾分类扔；药品丢有害垃圾或药品回收箱；大件家具预约物业/街道大件清运'},
};
function advice(it){
 const v=est(it),c=it.cat;let tier,head,keys;
 if(c==='食品'||c==='药品护肤'&&it.expiry&&daysFromNow(it.expiry)<0){tier='直接处理';head='过期了就别留。药品放有害垃圾或药品回收箱。';keys=['trash'];}
 else if(v>=1000){tier='高价值';head='值钱，别随手送人。多挂几个平台、拍好照片、翻出发票和包装，能多卖不少。';
  keys=c==='电子数码'?['zhuan','aihui','xianyu']:c==='衣物鞋包'?['hbl','xianyu','zhuan']:c==='书籍文具'?['kongfz','duozhua','xianyu']:['xianyu','zhuan'];}
 else if(v>=200){tier='中等价值';head='挂闲鱼/转转就行，写清成色。一周没人问就降价一成。';
  keys=c==='书籍文具'?['duozhua','xianyu']:c==='衣物鞋包'?['xianyu','hbl']:['xianyu','zhuan'];}
 else if(v>=50){tier='小价值';head='卖不了几个钱，别花太多时间：同城面交、发邻居群，或者打包一起卖。';
  keys=c==='书籍文具'?['duozhua','community']:c==='衣物鞋包'||c==='母婴玩具'?['community','donate']:['xianyu','community'];}
 else{tier='基本不值钱';head='别纠结，送人或回收，腾出地方最值。';
  keys=c==='衣物鞋包'||c==='母婴玩具'||c==='书籍文具'?['community','donate','trash']:['community','trash'];}
 if((c==='家具'||c==='家电')&&v<200&&tier!=='直接处理')keys=['community','bulky','trash'];
 return {tier,head,keys:keys.map(k=>P[k]),list:Math.round(v*1.1),floor:Math.round(v*0.8),v};
}
const copyText=it=>`【转让】${it.name}\n${it.note?it.note+'\n':''}${it.buy?'当时买入 '+money(it.buy)+'，':''}现价 ${money(advice(it).list)}（可小刀）\n${it.buyDate?'购于 '+it.buyDate+'，':''}使用较少，功能正常，同城面交/自提优先。`;

/* ============ 弹窗/图片 ============ */
const box=$('#box'),modalEl=$('#modal');
const modal=html=>{box.innerHTML=html;modalEl.classList.add('on')};
const closeModal=()=>{modalEl.classList.remove('on');box.innerHTML='';TMP={}};
let TMP={};
modalEl.addEventListener('mousedown',e=>{if(e.target===modalEl)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#lightbox'))$('#lightbox').remove();else closeModal()}});
function compress(file,max=1000,q=.72){
 return new Promise((res,rej)=>{
  const fr=new FileReader();
  fr.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',q))};im.onerror=rej;im.src=fr.result};
  fr.onerror=rej;fr.readAsDataURL(file);
 });
}
function lightbox(src){const d=document.createElement('div');d.id='lightbox';d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99;display:flex;align-items:center;justify-content:center;padding:10px';d.innerHTML=`<img src="${src}" style="max-width:100%;max-height:100%;border-radius:8px">`;d.onclick=()=>d.remove();document.body.append(d)}
const thumb=(it,cls='')=>`<div class="thumb ${cls}">${it.photo?`<img src="${it.photo}">`:CATS[it.cat]||'📦'}</div>`;

/* ============ AI 看图（本地小服务）============ */
async function aiAnalyze(img,hint){
 const body={image:img,hint:hint||'',cats:Object.keys(CATS)};
 const local=/^(localhost|127\.)/.test(location.hostname);
 if(local){
  try{const r=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(r.ok)return await r.json()}catch(_){}
 }
 if(!Sync.code||!CFG.url)throw new Error('AI 看图需要先在「设置」里开启云同步');
 const r=await fetch(CFG.url+'/functions/v1/jd-analyze',{method:'POST',headers:{authorization:'Bearer '+CFG.anon,apikey:CFG.anon,'content-type':'application/json'},body:JSON.stringify({...body,code:Sync.code})});
 const t=await r.text();let j;try{j=JSON.parse(t)}catch(_){throw new Error(t.slice(0,150)||('错误 '+r.status))}
 if(!r.ok||j.error)throw new Error(j.error||('错误 '+r.status));
 return j;
}

/* ============ 位置选择 ============ */
function locSelect(name,cur,withZone=true){
 let h=`<select name="${name}"><option value="">（还没定位置）</option>`;
 for(const r of S.rooms){
  h+=`<optgroup label="${esc(r.name)}"><option value="r:${r.id}"${cur==='r:'+r.id?' selected':''}>${esc(r.name)}·地面/其他</option>`;
  for(const f of S.furn.filter(f=>f.roomId===r.id)){
   h+=`<option value="f:${f.id}"${cur==='f:'+f.id?' selected':''}>${esc(f.name)}</option>`;
   if(withZone)for(const z of zonesInFurn(f.id))h+=`<option value="z:${z.id}"${cur==='z:'+z.id?' selected':''}>　└ ${esc(z.name)}</option>`;
  }
  h+='</optgroup>';
 }
 return h+'</select>';
}
const parseLoc=v=>{const [t,id]=(v||'').split(':');return {roomId:t==='r'?id:'',furnId:t==='f'?id:t==='z'?zoneById(id)?.furnId||'':'',zoneId:t==='z'?id:''}};
const curLocVal=it=>it.zoneId?'z:'+it.zoneId:it.furnId?'f:'+it.furnId:it.roomId?'r:'+it.roomId:'';

/* ============ 视图切换 ============ */
let VIEW='home',Q='',SEL=null,EDIT=false,tidy=null;
let SELCELL=null;const openCells=new Set();
const FACE_ROT={S:0,N:Math.PI,E:Math.PI/2,W:-Math.PI/2};
function faceOf(f){if(f.face)return f.face;const r=roomById(f.roomId);if(!r)return 'S';const dx=r.cx-f.x,dz=r.cz-f.z;return Math.abs(dx)>Math.abs(dz)?(dx>0?'E':'W'):(dz>0?'S':'N')}
const CELLNAME={door:'柜门',drawer:'抽屉',open:'开放格',top:'台面'};
function setView(v){
 VIEW=v;
 $$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
 $$('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));
 renderAll();
 if(v==='home')setTimeout(()=>{V3.resize();},0);
}

/* ============ 渲染：头部 / 提醒 ============ */
function renderHead(){
 const act=S.items.filter(active);
 const idle=act.filter(isIdle), soon=act.filter(i=>flags(i).some(f=>f[0]==='bad'||f[1].includes('过期')));
 $('#stats').innerHTML=
  Sync.chip()+`<span class="chip">${act.length} 件单品</span><span class="chip">${S.zones.length} 个区域</span><span class="chip">估值 ${money(act.reduce((s,i)=>s+est(i)*(+i.qty||1),0))}</span>`+
  (idle.length?`<span class="chip idle">${idle.length} 件闲置</span>`:'')+(soon.length?`<span class="chip bad">${soon.length} 件到期</span>`:'');
 const A=[];
 if(soon.length)A.push(`<button data-act="tab" data-v="expire">⏰ ${soon.length} 件快过期/已过期</button>`);
 const war=act.filter(i=>flags(i).some(f=>f[1].startsWith('保修')));
 if(war.length)A.push(`<button data-act="tab" data-v="expire">🛠 ${war.length} 件保修快到期（有问题赶紧修）</button>`);
 if(idle.length)A.push(`<button data-act="tab" data-v="idle">💤 ${idle.length} 件闲置，估值 ${money(idle.reduce((s,i)=>s+est(i),0))}</button>`);
 const stale=S.zones.filter(snapStale);
 if(stale.length)A.push(`<button data-act="tab" data-v="tidy">📷 ${stale.length} 个区域的照片太旧了，对一下</button>`);
 const due=dueRooms();
 if(due.length)A.push(`<button data-act="tab" data-v="tidy">🧹 该整理：${due.slice(0,3).map(d=>d.r.name).join('、')}${due.length>3?'…':''}</button>`);
 $('#alerts').innerHTML=A.join('');
}
function dueRooms(){
 return S.rooms.map(r=>{const l=S.roomTidy[r.id];return {r,days:l?dayDiff(l,today()):9999,last:l}}).filter(x=>(itemsInRoom(x.r.id).length||zonesInRoom(x.r.id).length)&&x.days>=S.settings.tidyEvery).sort((a,b)=>b.days-a.days);
}

/* ============ 渲染：卡片 ============ */
function itemCard(it){
 const fl=flags(it).map(f=>`<span class="tag ${f[0]}">${esc(f[1])}</span>`).join('');
 const st=active(it)?'':`<span class="tag ok">${STATUS[it.status]}</span>`;
 return `<div class="item" data-act="openItem" data-id="${it.id}">${thumb(it)}<div style="min-width:0"><div class="t">${esc(it.name)}${it.qty>1?` ×${it.qty}`:''}</div><div class="m">${esc(locText(it))}</div><div class="m">${est(it)?money(est(it)):'未估价'}${it.buyDate?' · '+it.buyDate+'买':''}</div>${st}${fl}</div></div>`;
}
function zoneCard(z,big){
 const s=latestSnap(z),n=itemsInZone(z.id).length,age=snapAge(z);
 return `<div class="item" data-act="openZone" data-id="${z.id}">
  <div class="thumb" style="${big?'width:84px;height:84px':''}">${s?`<img src="${s.img}">`:'🗄️'}</div>
  <div style="min-width:0"><div class="t">${esc(z.name)}</div>
   <div class="m">${esc(z.purpose||'还没写用途')}</div>
   <div class="m">${z.tags.slice(0,6).map(t=>`<span class="tag ok">${esc(t)}</span>`).join('')||''}</div>
   <div class="m">${z.count?esc(z.count)+' · ':''}${n?n+' 件单独记录 · ':''}${s?'照片 '+fmtAge(age)+(snapStale(z)?' ⚠️可能过时':''):'📷 还没拍照'}</div></div></div>`;
}

/* ============ 渲染：3D 页侧栏 ============ */
function searchHits(q){
 q=q.trim().toLowerCase(); if(!q)return null;
 const m=s=>String(s||'').toLowerCase().includes(q);
 const items=S.items.filter(i=>active(i)&&(m(i.name)||m(i.note)||m(i.cat)||m(i.spot)||m(i.buyFrom)));
 const zones=S.zones.filter(z=>m(z.name)||m(z.purpose)||z.tags.some(m)||m(z.note));
 const furns=S.furn.filter(f=>m(f.name));
 return {items,zones,furns};
}
function renderSide(){
 const el=$('#side'); let h='';
 const hits=searchHits(Q);
 if(hits){
  h+=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">🔍 找「${esc(Q)}」</h2><button data-act="clearQ">清除</button></div>`;
  if(!hits.items.length&&!hits.zones.length&&!hits.furns.length)h+='<div class="empty">家里没记到。可能没录——区域里的“里面有什么”也可以补充关键词</div>';
  if(hits.zones.length)h+='<h3>在这些区域里</h3><div style="display:grid;gap:8px">'+hits.zones.map(z=>zoneCard(z)).join('')+'</div>';
  if(hits.items.length)h+='<h3>单品</h3><div style="display:grid;gap:8px">'+hits.items.map(itemCard).join('')+'</div>';
  if(hits.furns.length)h+='<h3>家具</h3>'+hits.furns.map(f=>`<button data-act="selFurn" data-id="${f.id}" style="margin:2px">${esc(f.name)}</button>`).join('');
  el.innerHTML=h;return;
 }
 if(!SEL){
  h=`<h2>👋 点一下家具看看</h2><div class="card"><p style="margin:0 0 8px">左边 3D 里点任意<b>家具</b>或<b>房间地面</b>，这里就会列出里面的区域和东西。</p><p class="sec" style="margin:0">没有的家具？点左上「编辑布局」→「＋家具」，可以拖着摆。</p></div>
  <div class="row" style="margin:10px 0"><button data-act="batchOpen">📸 一次拍多个区域</button></div><h2>房间</h2>`+S.rooms.map(r=>`<div class="roomrow"><div><b>${esc(r.name)}</b><div class="m sec">${zonesInRoom(r.id).length} 个区域 · ${itemsInRoom(r.id).length} 件单品</div></div><button data-act="selRoom" data-id="${r.id}">看看</button></div>`).join('');
  el.innerHTML=h;return;
 }
 if(SEL.t==='room'){
  const r=roomById(SEL.id); if(!r){SEL=null;return renderSide()}
  const its=itemsInRoom(r.id),zs=zonesInRoom(r.id);
  h=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(r.name)}</h2>${EDIT?`<button data-act="editRoom" data-id="${r.id}">✏️ 改房间</button>`:''}</div>
  <div class="sec">${S.furn.filter(f=>f.roomId===r.id).length} 件家具 · ${zs.length} 个区域 · ${its.length} 件单品 · 估值 ${money(its.reduce((s,i)=>s+est(i)*(+i.qty||1),0))}</div>
  <div class="row"><button class="pri" data-act="addItem" data-loc="r:${r.id}">＋记一件</button><button data-act="startTidy" data-id="${r.id}">🧹 整理这个房间</button></div>`;
  h+='<h3>里面的家具</h3>'+S.furn.filter(f=>f.roomId===r.id).map(f=>`<button data-act="selFurn" data-id="${f.id}" style="margin:2px">${esc(f.name)}</button>`).join('');
  if(zs.length)h+='<h3>区域</h3><div style="display:grid;gap:8px">'+zs.map(z=>zoneCard(z)).join('')+'</div>';
  const loose=its.filter(i=>!i.zoneId);
  if(loose.length)h+='<h3>单品</h3><div style="display:grid;gap:8px">'+loose.map(itemCard).join('')+'</div>';
  el.innerHTML=h;return;
 }
 const f=furnById(SEL.id); if(!f){SEL=null;return renderSide()}
 const zs=zonesInFurn(f.id),its=itemsInFurn(f.id),loose=its.filter(i=>!i.zoneId);
 h=`<div class="sec">${esc(roomById(f.roomId)?.name||'')}</div>
 <div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(f.name)}</h2>${EDIT?`<span class="row"><button data-act="rotFurn" data-id="${f.id}">↻转90°</button><button data-act="editFurn" data-id="${f.id}">✏️ 改</button></span>`:''}</div>
 <div class="sec">${zs.length} 个区域 · ${its.length} 件单品</div>
 <div class="row"><button class="pri" data-act="addZone" data-furn="${f.id}">＋加区域（抽屉/层/箱子）</button><button data-act="addItem" data-loc="f:${f.id}">＋记一件</button></div>`;
 if(f.cells&&f.cells.length){
  const groups=new Map();f.cells.forEach((c,i)=>{const k=c.z||c.g||('i'+i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i)});
  const nz=[...groups.keys()].filter(k=>!k.startsWith('i')||true).length;
  h+=`<div class="sec" style="margin-top:8px">共 ${f.cells.length} 个${f.cells.some(c=>c.k==='drawer')?'门/抽屉':'门/格'}，分 ${nz} 组 · 点 3D 里的门或抽屉就能打开</div>`;
 }
 if(SELCELL&&SELCELL.fid===f.id&&f.cells&&f.cells[SELCELL.idx]){
  const c=f.cells[SELCELL.idx],cz=c.z?zoneById(c.z):null,sn=cz&&latestSnap(cz),isOpen=openCells.has(f.id+':'+SELCELL.idx);
  h+=`<div class="card" style="margin:10px 0;border-color:var(--pri)"><div class="sec">第 ${SELCELL.idx+1} 个${CELLNAME[c.k]||'格'}${isOpen?' · 已打开':' · 已关上'} <button data-act="toggleCellBtn" data-furn="${f.id}" data-idx="${SELCELL.idx}" style="padding:0 8px;margin-left:6px">${isOpen?'关上':'打开'}</button></div>`+
   (cz?`${sn?`<img src="${sn.img}" data-act="lb" style="width:100%;border-radius:10px;margin:6px 0;cursor:zoom-in">`:'<div class="empty" style="padding:14px">这格还没有照片</div>'}
    <div><b>${esc(cz.name)}</b></div><div class="m sec">${esc(cz.purpose||'')}</div>
    <div>${cz.tags.slice(0,10).map(t=>`<span class="tag ok">${esc(t)}</span>`).join('')}</div>
    <div class="sec">${sn?'照片 '+fmtAge(snapAge(cz)):'📷 还没拍照'}${cz.count?' · '+esc(cz.count):''}</div>
    <div class="row" style="margin-top:6px"><button class="pri" data-act="openZone" data-id="${cz.id}">看详情 / 换照片</button></div>`
   :`<div class="empty" style="padding:14px">这一格还没记里面有什么</div><div class="row"><button class="pri" data-act="addZoneCell" data-furn="${f.id}" data-idx="${SELCELL.idx}">📷 给这格建区域（拍照）</button></div>`)+`</div>`;
 }
 h+='<h3>区域</h3>'+(zs.length?'<div style="display:grid;gap:8px">'+zs.map(z=>zoneCard(z,true)).join('')+'</div>':'<div class="empty">还没分区域。打开抽屉/柜门拍一张，就算一个区域</div>');
 if(loose.length)h+='<h3>没分区域的单品</h3><div style="display:grid;gap:8px">'+loose.map(itemCard).join('')+'</div>';
 el.innerHTML=h;
}

/* ============ 渲染：全部物品 ============ */
let F_ITEMS={room:'',cat:'',st:'act',sort:'new'};
function renderItems(){
 const q=Q.trim().toLowerCase();
 let list=S.items.filter(i=>{
  if(F_ITEMS.st==='act'&&!active(i))return false;
  if(F_ITEMS.st==='idle'&&!isIdle(i))return false;
  if(F_ITEMS.st==='done'&&active(i))return false;
  if(F_ITEMS.room&&locOf(i).r?.id!==F_ITEMS.room)return false;
  if(F_ITEMS.cat&&i.cat!==F_ITEMS.cat)return false;
  if(q&&![i.name,i.note,i.cat,i.spot,i.buyFrom].some(s=>String(s||'').toLowerCase().includes(q)))return false;
  return true;
 });
 const so={new:(a,b)=>(b.created+b.id).localeCompare(a.created+a.id),val:(a,b)=>est(b)-est(a),idle:(a,b)=>idleDays(b)-idleDays(a),buy:(a,b)=>(b.buyDate||'').localeCompare(a.buyDate||'')};
 list.sort(so[F_ITEMS.sort]);
 const sel=(k,opts)=>`<select data-flt="${k}">${opts.map(o=>`<option value="${esc(o[0])}"${F_ITEMS[k]===o[0]?' selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
 const done=S.items.filter(i=>i.status==='sold');
 $('#v-items').innerHTML=`<div class="row" style="justify-content:space-between;margin-bottom:10px"><h2 style="margin:0">全部物品 <small style="color:var(--mut);font-weight:400">${list.length} 件</small></h2><button class="pri big" data-act="addItem">＋记一件</button></div>
 <div class="filters">${sel('st',[['act','在家的'],['idle','只看闲置'],['done','已处理掉的'],['all','全部']])}
 ${sel('room',[['','所有房间'],...S.rooms.map(r=>[r.id,r.name])])}
 ${sel('cat',[['','所有类别'],...Object.keys(CATS).map(c=>[c,CATS[c]+' '+c])])}
 ${sel('sort',[['new','最近添加'],['val','价值高→低'],['idle','闲置久→短'],['buy','买入时间']])}</div>
 ${(()=>{const h=searchHits(Q);return h&&h.zones.length?`<h3>匹配的区域</h3><div class="grid">${h.zones.map(z=>zoneCard(z)).join('')}</div><h3>匹配的单品</h3>`:''})()}
 ${list.length?`<div class="grid">${list.map(itemCard).join('')}</div>`:'<div class="empty">这里还没有东西。细碎的东西不用单独记，建个「区域」拍张照就行</div>'}
 ${F_ITEMS.st==='done'&&done.length?`<p class="sec">已卖出共回血 ${money(done.reduce((s,i)=>s+(+i.sale?.price||0),0))}</p>`:''}`;
}

/* ============ 渲染：闲置 ============ */
function renderIdle(){
 const list=S.items.filter(isIdle).sort((a,b)=>est(b)-est(a));
 const tot=list.reduce((s,i)=>s+est(i)*(+i.qty||1),0);
 const g={hi:list.filter(i=>est(i)>=500),mid:list.filter(i=>est(i)>=50&&est(i)<500),lo:list.filter(i=>est(i)<50)};
 const sect=(t,sub,arr)=>arr.length?`<h2>${t} <small style="color:var(--mut);font-weight:400">${sub}</small></h2><div class="grid">${arr.map(i=>`<div>${itemCard(i)}<div class="row" style="margin:4px 0 8px"><button class="pri" data-act="dispose" data-id="${i.id}">怎么处理？</button><button data-act="useToday" data-id="${i.id}">其实还在用</button></div></div>`).join('')}</div>`:'';
 $('#v-idle').innerHTML=`<h2>💤 闲置处理</h2><div class="card"><b>${list.length}</b> 件东西超过 <b>${S.settings.idleDays}</b> 天没动（或你标了闲置），估值约 <b>${money(tot)}</b>。<div class="sec">先卖贵的，一件值钱的抵一堆小东西。吃的/药/证件不算闲置。</div></div>`+
 (list.length?sect('💰 值钱的，优先出手','≥ ¥500，二手平台好卖',g.hi)+sect('🙂 中等的','¥50~500，挂闲鱼/同城',g.mid)+sect('🧺 小东西','< ¥50，送人或回收就好',g.lo):'<div class="empty">🎉 没有闲置，家里都在用</div>');
}

/* ============ 渲染：到期 ============ */
function renderExpire(){
 const rows=[];
 S.items.filter(active).forEach(i=>{
  if(i.expiry)rows.push({i,k:'过期',d:daysFromNow(i.expiry),date:i.expiry});
  if(i.warrantyEnd)rows.push({i,k:'保修',d:daysFromNow(i.warrantyEnd),date:i.warrantyEnd});
 });
 rows.sort((a,b)=>a.d-b.d);
 const grp=[['已过期/已出保',r=>r.d<0],['30天内',r=>r.d>=0&&r.d<=30],['90天内',r=>r.d>30&&r.d<=90],['更久之后',r=>r.d>90]];
 let h='<h2>⏰ 到期提醒</h2>';
 grp.forEach(([t,fn])=>{
  const a=rows.filter(fn); if(!a.length)return;
  h+=`<h3>${t}</h3><div class="grid">`+a.map(r=>`<div class="item" data-act="openItem" data-id="${r.i.id}">${thumb(r.i)}<div><div class="t">${esc(r.i.name)}</div><div class="m">${r.k==='过期'?'保质期':'保修期'}至 ${r.date}</div><span class="tag ${r.d<0?'bad':r.d<=30?'warn':'ok'}">${r.d<0?'已'+(r.k==='过期'?'过期':'出保')+(-r.d)+'天':r.d+'天后'}</span>${r.i.receiptNo?`<span class="tag ok">有发票/订单号</span>`:''}</div></div>`).join('')+'</div>';
 });
 if(!rows.length)h+='<div class="empty">还没有填过保质期/保修期的东西</div>';
 const zs=S.zones.filter(snapStale);
 if(zs.length)h+='<h3>📷 照片过时的区域</h3><div class="grid">'+zs.map(z=>zoneCard(z)).join('')+'</div>';
 $('#v-expire').innerHTML=h;
}

/* ============ 渲染：该放哪 ============ */
let PUT={name:'',res:null,img:null,busy:false,msg:''};
function putResults(name,catHint){
 const n=name.trim().toLowerCase(); if(!n)return null;
 const cat=catHint||guessCat(n);
 const sc=S.zones.map(z=>{
  let s=0,why=[];
  if(cat&&z.cats.includes(cat)){s+=4;why.push('这个区域放「'+cat+'」类');}
  if(z.tags.some(t=>t&&(n.includes(t.toLowerCase())||t.toLowerCase().includes(n)))){s+=6;why.push('里面已经有类似的东西');}
  if(z.purpose&&n.split('').length>=2&&[...new Set(n.match(/[一-龥]{2}|[a-z]{3,}/g)||[])].some(w=>z.purpose.toLowerCase().includes(w))){s+=2;why.push('和用途描述相关');}
  if(snapStale(z)||!z.photos.length)s-=0;
  return {z,s,why};
 }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
 return {cat,list:sc.slice(0,4)};
}
function renderPut(){
 const r=PUT.res;
 let out='';
 if(r){
  out+=`<h3>${PUT.name?`「${esc(PUT.name)}」`:'这东西'}${r.cat?` · 看起来是 ${CATS[r.cat]||''}${esc(r.cat)}`:''}</h3>`;
  if(r.list.length)out+=r.list.map(x=>`<div class="plat"><div style="min-width:0"><b>${esc(zoneText(x.z))}</b><span>${esc(x.z.purpose||'')}</span><br><span>👉 ${esc(x.why.join('；'))}</span></div><div class="row"><button data-act="openZone" data-id="${x.z.id}">看照片</button><button class="pri" data-act="putHere" data-id="${x.z.id}">就放这</button></div></div>`).join('');
  else out+=`<div class="adv">没有合适的区域。${r.cat?`家里还没有专门放「${esc(r.cat)}」的区域`:'没认出类别'}，建议找个抽屉/盒子，<a href="#" data-act="addZone" data-cat="${esc(r.cat||'')}">新开一个区域</a>，以后同类都放那。</div>`;
 }
 $('#v-put').innerHTML=`<h2>📍 这东西该放哪？</h2>
 <div class="card"><label>东西叫什么（或拍张照让 AI 认）</label>
  <div class="row" style="flex-wrap:nowrap"><input id="putName" value="${esc(PUT.name)}" placeholder="例：创可贴、充电线、螺丝刀…"><button class="pri" data-act="putGo">找位置</button><button data-act="putPhoto">📷 拍照认</button></div>
  <input type="file" id="putFile" accept="image/*" style="display:none">
  ${PUT.busy?'<div class="sec" style="margin-top:8px">🤖 AI 看图中…</div>':''}${PUT.msg?`<div class="sec" style="margin-top:8px;color:var(--bad)">${esc(PUT.msg)}</div>`:''}
  ${PUT.img?`<img src="${PUT.img}" style="margin-top:8px;max-height:140px;border-radius:10px">`:''}
 </div>${out}
 <h2>各区域用途一览</h2>
 <p class="sec">这就是「家里的收纳规则」：每个区域管一类东西，新东西进门照这张表放。</p>
 <div class="grid">${S.zones.map(z=>zoneCard(z)).join('')||'<div class="empty">还没有区域</div>'}</div>`;
}

/* ============ 渲染：整理 ============ */
function renderTidy(){
 if(tidy&&tidy.q)return renderTidySession();
 const rows=S.rooms.filter(r=>itemsInRoom(r.id).length||zonesInRoom(r.id).length).map(r=>{const l=S.roomTidy[r.id];return {r,days:l?dayDiff(l,today()):null}}).sort((a,b)=>(b.days??9999)-(a.days??9999));
 $('#v-tidy').innerHTML=`<h2>🧹 定期整理</h2>
 <div class="card">原则：<b>一次只整理一个房间，10 分钟</b>。系统按「最久没整理」排队。对着每个区域的照片看一眼，不一样就重拍；闲置的当场决定去向。<div class="sec">每 ${S.settings.tidyEvery} 天一轮，在设置里可改。</div></div>
 <h2>排队</h2>`+(rows.length?rows.map(x=>{
  const due=x.days==null||x.days>=S.settings.tidyEvery;
  return `<div class="roomrow"><div><b>${esc(x.r.name)}</b> ${due?'<span class="tag bad">该整理了</span>':'<span class="tag ok">不急</span>'}<div class="sec">${x.days==null?'从没整理过':'上次 '+fmtAge(x.days)} · ${zonesInRoom(x.r.id).length} 个区域 · ${itemsInRoom(x.r.id).length} 件单品</div></div><button class="${due?'pri':''}" data-act="startTidy" data-id="${x.r.id}">开始 →</button></div>`}).join(''):'<div class="empty">先去记一些区域或东西</div>')+
 (S.tidyLog.length?`<h2>最近整理</h2>`+S.tidyLog.slice(-5).reverse().map(l=>`<div class="sec">${l.date} · ${esc(l.room)}：确认 ${l.ok} · 重拍/移位 ${l.fix} · 处理 ${l.out}</div>`).join(''):'');
}
function startTidy(rid){
 const r=roomById(rid); if(!r)return;
 const q=[];
 zonesInRoom(rid).forEach(z=>q.push({t:'zone',id:z.id}));
 itemsInRoom(rid).filter(i=>!i.zoneId).sort((a,b)=>idleDays(b)-idleDays(a)).forEach(i=>q.push({t:'item',id:i.id}));
 tidy={rid,q,i:0,ok:0,fix:0,out:0};
 setView('tidy');
}
function renderTidySession(){
 const T=tidy,r=roomById(T.rid);
 if(T.i>=T.q.length){
  $('#v-tidy').innerHTML=`<div class="card big-card"><div style="font-size:54px">🎉</div><h2>${esc(r.name)} 整理完了</h2><p>确认没问题 ${T.ok} · 重拍/移位 ${T.fix} · 处理掉 ${T.out}</p><p class="sec">顺手看看：这个房间里有没有「没记过」的抽屉或箱子？</p><div class="row" style="justify-content:center"><button data-act="addZoneRoom" data-id="${r.id}">＋再加一个区域</button><button class="pri" data-act="endTidy">完成</button></div></div>`;return;
 }
 const cur=T.q[T.i];let card='';
 if(cur.t==='zone'){
  const z=zoneById(cur.id);if(!z){T.i++;return renderTidySession()}
  const s=latestSnap(z);
  card=`<div class="card big-card"><div class="sec">📍 ${esc(zoneText(z))}</div>
  ${s?`<img src="${s.img}" data-act="lb" data-src="" style="max-width:100%;max-height:320px;border-radius:12px;cursor:zoom-in" id="tidyImg">`:'<div class="thumb">🗄️</div>'}
  <h2 style="margin-top:12px">${esc(z.name)}</h2><p>${esc(z.purpose||'')}</p><p class="sec">${s?'这张照片是 '+fmtAge(snapAge(z))+' 拍的':'还没有照片'} · ${z.tags.slice(0,8).map(esc).join('、')}</p>
  <p><b>打开看一眼：现在还是这样吗？</b></p>
  <div class="actions"><button class="pri big" data-act="tzOk">✅ 一样，没变</button><button class="big" data-act="tzRe">📷 变了，重拍一张</button><button class="big" data-act="openZone" data-id="${z.id}">✏️ 看看/改改</button><button class="big" data-act="tzSkip">⏭ 跳过</button></div></div>`;
 }else{
  const it=itemById(cur.id);if(!it){T.i++;return renderTidySession()}
  card=`<div class="card big-card">${thumb(it)}<h2>${esc(it.name)}</h2><p class="sec">${esc(locText(it))} · 上次用 ${fmtAge(idleDays(it))}${est(it)?' · '+money(est(it)):''}</p>${flags(it).map(f=>`<span class="tag ${f[0]}">${esc(f[1])}</span>`).join('')}
  <div class="actions"><button class="pri big" data-act="tiUse">✅ 还在用</button><button class="big" data-act="tiMove">📍 位置变了</button><button class="big" data-act="tiIdle">💤 闲置了</button><button class="big" data-act="tiDisp">💸 处理掉</button></div><p><button data-act="tzSkip">⏭ 跳过</button></p></div>`;
 }
 $('#v-tidy').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">🧹 整理：${esc(r.name)}</h2><button data-act="endTidy">先到这儿</button></div><div class="progress"><i style="width:${Math.round(T.i/T.q.length*100)}%"></i></div><div class="sec">第 ${T.i+1} / ${T.q.length} 项</div>`+card;
 const img=$('#tidyImg');if(img){const z=zoneById(cur.id);img.dataset.src='';img.onclick=()=>lightbox(latestSnap(z).img)}
}

/* ============ 渲染：设置 ============ */
function renderSet(){
 const st=S.settings,sold=S.items.filter(i=>i.status==='sold');
 $('#v-set').innerHTML=`<h2>⚙️ 设置</h2>
 <div class="card"><div class="form">
  <div><label>多少天没动算「闲置」</label><input type="number" data-set="idleDays" value="${st.idleDays}"></div>
  <div><label>每个房间多少天整理一轮</label><input type="number" data-set="tidyEvery" value="${st.tidyEvery}"></div>
  <div><label>区域照片多少天算「可能过时」</label><input type="number" data-set="snapDays" value="${st.snapDays}"></div>
 </div></div>
 ${syncPanel()}
 <h2>回血账</h2><div class="card">已卖出 ${sold.length} 件，共回血 <b>${money(sold.reduce((s,i)=>s+(+i.sale?.price||0),0))}</b></div>
 <h2>备份</h2><div class="card"><p class="sec" style="margin-top:0">数据存在这台电脑的这个浏览器里。换电脑或清缓存前先导出备份。</p><div class="row"><button data-act="exportData">⬇️ 导出备份</button><button data-act="importData">⬆️ 导入备份</button></div></div>
 <h2>数据</h2><div class="card"><div class="row"><button data-act="loadDemo">载入示范数据</button><button class="danger" data-act="clearAll">清空全部（从头建自己的家）</button></div></div>`;
}

function renderAll(){
 renderHead();if(typeof renderChips==='function'&&$('#chips'))renderChips();
 if(VIEW==='home'){renderSide();V3.rebuild();}
 else if(VIEW==='items')renderItems();
 else if(VIEW==='idle')renderIdle();
 else if(VIEW==='expire')renderExpire();
 else if(VIEW==='put')renderPut();
 else if(VIEW==='tidy')renderTidy();
 else if(VIEW==='set')renderSet();
}

/* ============ 表单：单品 ============ */
function itemForm(it,preset={}){
 const isNew=!it;
 const d=it?JSON.parse(JSON.stringify(it)):{id:uid(),name:preset.name||'',cat:preset.cat||'其他',photo:null,value:'',buy:'',buyDate:today(),buyFrom:'',roomId:'',furnId:'',zoneId:'',spot:'',qty:1,expiry:'',warrantyEnd:'',receipt:null,receiptNo:'',status:'use',lastUsed:today(),note:'',created:today(),log:[]};
 if(isNew&&preset.loc)Object.assign(d,parseLoc(preset.loc));
 if(isNew&&preset.zoneId){d.zoneId=preset.zoneId;d.furnId=zoneById(preset.zoneId)?.furnId||''}
 TMP={it:d,isNew};
 const fld=(l,n,v,type='text',ph='')=>`<div><label>${l}</label><input name="${n}" type="${type}" value="${esc(v??'')}" placeholder="${esc(ph)}"></div>`;
 modal(`<h2>${isNew?'＋ 记一件东西':'📦 '+esc(d.name)}</h2>
 <div class="photos" style="margin-bottom:12px">
  <div class="photobox" data-act="pickPhoto" id="pbPhoto">${d.photo?`<img src="${d.photo}">`:'📷<br>东西的照片'}</div>
  <div class="photobox" data-act="pickReceipt" id="pbReceipt">${d.receipt?`<img src="${d.receipt}">`:'🧾<br>发票/小票照片'}</div>
  <div style="flex:1;display:flex;flex-direction:column;gap:6px">
    <div><label>名字 *</label><input name="name" value="${esc(d.name)}"></div>
    <div><label>类别</label><select name="cat">${Object.keys(CATS).map(c=>`<option${c===d.cat?' selected':''}>${c}</option>`).join('')}</select></div>
  </div>
 </div>
 <input type="file" accept="image/*" id="fPhoto" style="display:none"><input type="file" accept="image/*" id="fReceipt" style="display:none">
 <div class="form">
  <div class="full"><label>放在哪</label>${locSelect('loc',curLocVal(d))}</div>
  ${fld('具体位置（可不填）','spot',d.spot,'text','例：左边第二格')}
  ${fld('数量','qty',d.qty,'number')}
  ${fld('现在大概值多少 ¥','value',d.value,'number','二手能卖多少')}
  ${fld('买入价 ¥','buy',d.buy,'number')}
  ${fld('买入日期','buyDate',d.buyDate,'date')}
  ${fld('在哪买的','buyFrom',d.buyFrom,'text','京东/线下店…')}
  ${fld('保质期到','expiry',d.expiry,'date')}
  ${fld('保修期到','warrantyEnd',d.warrantyEnd,'date')}
  ${fld('发票/订单号','receiptNo',d.receiptNo)}
  ${fld('上次用是','lastUsed',d.lastUsed,'date')}
  <div class="full"><label>备注</label><textarea name="note" rows="2">${esc(d.note)}</textarea></div>
 </div>
 <div class="row" style="margin-top:14px;justify-content:space-between">
  <div class="row"><button class="pri big" data-act="saveItem">保存</button><button class="big" data-act="closeModal">取消</button></div>
  ${isNew?'':`<div class="row"><button data-act="dispose" data-id="${d.id}">💸 处理掉</button><button data-act="useToday" data-id="${d.id}">✅ 今天用了</button><button class="danger" data-act="delItem" data-id="${d.id}">删除</button></div>`}
 </div>
 ${d.log?.length?`<div class="sec" style="margin-top:10px">${d.log.slice(-5).reverse().map(l=>l.d+' '+esc(l.e)).join(' · ')}</div>`:''}`);
}
function collectItem(){
 const d=TMP.it,g=n=>$(`[name="${n}"]`,box).value;
 ['name','cat','spot','buyFrom','receiptNo','note','buyDate','expiry','warrantyEnd','lastUsed'].forEach(k=>d[k]=g(k).trim?g(k).trim():g(k));
 d.qty=+g('qty')||1;d.value=g('value')===''?'':+g('value');d.buy=g('buy')===''?'':+g('buy');
 Object.assign(d,parseLoc(g('loc')));
 return d;
}

/* ============ 表单：区域 ============ */
function zoneForm(z,preset={}){
 const isNew=!z;
 const d=z?JSON.parse(JSON.stringify(z)):{id:uid(),furnId:preset.furnId||'',name:'',purpose:'',cats:preset.cat?[preset.cat]:[],tags:[],count:'',value:'',photos:[],note:'',checked:''};
 TMP={z:d,isNew,pend:null,cellRef:preset.cellIdx!=null?{fid:preset.furnId,idx:preset.cellIdx}:null};
 const its=isNew?[]:itemsInZone(d.id);
 const furnOpts=S.rooms.map(r=>`<optgroup label="${esc(r.name)}">`+S.furn.filter(f=>f.roomId===r.id).map(f=>`<option value="${f.id}"${f.id===d.furnId?' selected':''}>${esc(f.name)}</option>`).join('')+'</optgroup>').join('');
 modal(`<h2>${isNew?'＋ 新区域':'🗄️ '+esc(d.name)}</h2>
 <div class="sec" style="margin:-6px 0 10px">区域 = 一个抽屉 / 一层 / 一个箱子。不用一件件记，拍张照、写下它是干什么的就行。</div>
 <div class="form">
  <div><label>叫什么 *</label><input name="name" value="${esc(d.name)}" placeholder="例：药箱、第二个抽屉"></div>
  <div><label>在哪个家具里</label><select name="furnId">${furnOpts}</select></div>
  <div class="full"><label>这个区域是干什么用的？（这是「该放哪」的规则）</label><textarea name="purpose" rows="2" placeholder="例：全家常备药，感冒/肠胃/外伤；别的东西不放">${esc(d.purpose)}</textarea></div>
  <div class="full"><label>适合放哪几类</label><div class="row">${Object.keys(CATS).map(c=>`<label style="display:flex;gap:4px;align-items:center;margin:0;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:8px;padding:3px 8px"><input type="checkbox" style="width:auto" name="cat" value="${c}"${d.cats.includes(c)?' checked':''}>${CATS[c]}${c}</label>`).join('')}</div></div>
 </div>
 <h3>📷 里面的照片 <span class="sec">（开着盖子拍；以后不用打开就能看）</span></h3>
 <div class="row" id="snaps"></div>
 <div class="row" style="margin-top:8px"><button data-act="addSnap">＋拍/选照片</button><button data-act="aiZone" id="aiBtn">🤖 AI 看图，识别里面有什么</button><span class="sec" id="aiMsg"></span></div>
 <input type="file" accept="image/*" id="fSnap" style="display:none">
 <div class="form" style="margin-top:12px">
  <div class="full"><label>里面有什么（关键词，逗号隔开，搜索会用到）</label><input name="tags" value="${esc(d.tags.join('，'))}"></div>
  <div><label>大概多少件</label><input name="count" value="${esc(d.count)}" placeholder="约20件 / 一整箱"></div>
  <div><label>整体大概值多少 ¥</label><input name="value" type="number" value="${esc(d.value)}"></div>
  <div class="full"><label>备注</label><textarea name="note" rows="2">${esc(d.note)}</textarea></div>
 </div>
 ${isNew?'':`<h3>单独记录的东西（${its.length}）<button data-act="addItem" data-zone="${d.id}" style="margin-left:6px">＋记一件</button></h3>${its.length?'<div style="display:grid;gap:8px">'+its.map(itemCard).join('')+'</div>':'<div class="sec">只有贵重/有保修/会过期的才需要单独记，其余靠照片就行</div>'}`}
 <div class="row" style="margin-top:14px;justify-content:space-between">
  <div class="row"><button class="pri big" data-act="saveZone">保存</button><button class="big" data-act="closeModal">取消</button></div>
  ${isNew?'':`<button class="danger" data-act="delZone" data-id="${d.id}">删除区域</button>`}
 </div>`);
 renderSnaps();
}
function renderSnaps(){
 const z=TMP.z,el=$('#snaps');if(!el)return;
 el.innerHTML=z.photos.length?z.photos.map((p,i)=>`<div style="position:relative"><img src="${p.img}" data-act="lb" data-src-i="${i}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;cursor:zoom-in"><div class="sec" style="text-align:center">${p.date}</div><button data-act="delSnap" data-i="${i}" style="position:absolute;top:2px;right:2px;padding:0 6px">✕</button></div>`).join(''):'<div class="sec">还没有照片</div>';
}
function collectZone(){
 const d=TMP.z,g=n=>$(`[name="${n}"]`,box).value;
 d.name=g('name').trim();d.furnId=g('furnId');d.purpose=g('purpose').trim();d.count=g('count').trim();d.note=g('note').trim();
 d.value=g('value')===''?'':+g('value');
 d.tags=g('tags').split(/[,，、\s]+/).map(s=>s.trim()).filter(Boolean);
 d.cats=$$('input[name=cat]:checked',box).map(x=>x.value);
 return d;
}

/* ============ 批量：进门一拍 ============ */
function batchForm(furnId){
 TMP={batch:[],furnId};
 modal(`<h2>📸 一次拍多个区域</h2><div class="sec" style="margin-top:-6px">一次选多张照片（每个抽屉/层一张，开着拍）。每张变成一个区域，你只需补名字和用途；点「AI 全部识别」帮你猜。</div>
 <div class="row"><div style="flex:1"><label>这些都在哪个家具里</label><select id="bFurn">${S.rooms.map(r=>`<optgroup label="${esc(r.name)}">`+S.furn.filter(f=>f.roomId===r.id).map(f=>`<option value="${f.id}"${f.id===furnId?' selected':''}>${esc(f.name)}</option>`).join('')+'</optgroup>').join('')}</select></div></div>
 <input type="file" accept="image/*" multiple id="fBatch" style="display:none">
 <div class="row" style="margin:10px 0"><button class="pri" data-act="batchPick">📷 选照片（可多选）</button><button data-act="batchAI">🤖 AI 全部识别</button><span class="sec" id="bMsg"></span></div>
 <div id="bList"></div>
 <div class="row" style="margin-top:12px"><button class="pri big" data-act="batchSave">建好这些区域</button><button class="big" data-act="closeModal">取消</button></div>`);
}
function renderBatch(){
 $('#bList').innerHTML=TMP.batch.map((b,i)=>`<div class="card" style="margin-bottom:8px;display:flex;gap:10px"><img src="${b.img}" style="width:96px;height:96px;object-fit:cover;border-radius:10px;flex:none">
 <div style="flex:1;display:grid;gap:6px"><input data-b="${i}" data-k="name" placeholder="这个区域叫什么" value="${esc(b.name)}"><input data-b="${i}" data-k="purpose" placeholder="用途（干什么用的）" value="${esc(b.purpose)}"><input data-b="${i}" data-k="tags" placeholder="里面有什么（逗号隔开）" value="${esc(b.tags)}"><div class="sec">${b.cats.length?'类别：'+b.cats.map(esc).join('、'):''} <button data-act="batchDel" data-i="${i}" style="padding:0 6px">移除</button></div></div></div>`).join('');
}

/* ============ 动作 ============ */
const A={};
A.tab=el=>{tidy=el.dataset.v==='tidy'?tidy:tidy;setView(el.dataset.v)};
A.closeModal=closeModal;
A.clearQ=()=>{Q='';$('#q').value='';renderAll()};
A.selRoom=el=>{SEL={t:'room',id:el.dataset.id};if(VIEW!=='home')setView('home');else renderAll();V3.focusRoom(el.dataset.id)};
A.selFurn=el=>{SEL={t:'furn',id:el.dataset.id};SELCELL=null;if(VIEW!=='home')setView('home');else renderAll();V3.focusFurn(el.dataset.id)};
A.addItem=el=>{const p={};if(el.dataset.loc)p.loc=el.dataset.loc;if(el.dataset.zone)p.zoneId=el.dataset.zone;itemForm(null,p)};
A.openItem=el=>itemForm(itemById(el.dataset.id));
A.pickPhoto=()=>$('#fPhoto').click();
A.pickReceipt=()=>$('#fReceipt').click();
A.saveItem=()=>{
 const d=collectItem(); if(!d.name){alert('先给它起个名字');return}
 if(TMP.isNew){d.log=[{d:today(),e:'记录入库'}];S.items.push(d);}
 else{const i=S.items.findIndex(x=>x.id===d.id);S.items[i]=d;}
 save();closeModal();renderAll();
};
A.delItem=el=>{if(!confirm('确定删除这条记录？（卖掉/送人请用「处理掉」，这样能记回血）'))return;S.items=S.items.filter(i=>i.id!==el.dataset.id);save();closeModal();renderAll()};
A.useToday=el=>{const it=itemById(el.dataset.id);if(!it)return;it.lastUsed=today();if(it.status==='idle')it.status='use';it.log.push({d:today(),e:'今天用了/确认还在用'});save();closeModal();renderAll()};
A.dispose=el=>{
 const it=itemById(el.dataset.id);if(!it)return;
 const a=advice(it);
 modal(`<h2>💸 怎么处理「${esc(it.name)}」</h2>
 <div class="row"><div style="flex:1"><label>现在大概值多少 ¥（改了建议会跟着变）</label><input id="dpVal" type="number" value="${esc(it.value)}" placeholder="${it.buy?'买入 '+it.buy:''}"></div><button data-act="dpRe" data-id="${it.id}" style="margin-top:18px">重新建议</button></div>
 <div class="adv"><b>${a.tier}</b>${a.v?` · 估价 ${money(a.v)}`:''}<br>${esc(a.head)}${a.v>=50?`<br><span class="sec">挂牌价建议 ${money(a.list)}，底价别低于 ${money(a.floor)}</span>`:''}</div>
 ${a.keys.map(k=>`<div class="plat"><div style="min-width:0"><b>${esc(k.n)}</b><span>${esc(k.w)}</span></div>${k.u?`<a href="${k.u}" target="_blank" rel="noopener"><button>打开</button></a>`:''}</div>`).join('')}
 ${a.v>=50?`<h3>📝 发布文案（复制去挂）</h3><textarea id="dpTxt" rows="5">${esc(copyText(it))}</textarea><div class="row" style="margin-top:6px"><button data-act="cpTxt">复制文案</button></div>`:''}
 <p class="sec">小提示：卖之前翻出发票/包装盒，拍清楚瑕疵，能多卖、少扯皮。平台功能以各 App 为准。</p>
 <h3>处理完了，记一下结果</h3>
 <div class="row"><input id="dpPrice" type="number" placeholder="卖了多少钱 ¥" style="width:140px"><button class="pri" data-act="dpDone" data-id="${it.id}" data-st="sold">💰 已卖出</button><button data-act="dpDone" data-id="${it.id}" data-st="given">🎁 送人/捐了</button><button data-act="dpDone" data-id="${it.id}" data-st="trashed">🗑 丢了/回收了</button></div>
 <div class="row" style="margin-top:10px"><button data-act="dpIdle" data-id="${it.id}">先标「待出手」（还没处理）</button><button class="big" data-act="closeModal">关闭</button></div>`);
};
A.dpRe=el=>{const it=itemById(el.dataset.id),v=$('#dpVal').value;it.value=v===''?'':+v;save();A.dispose(el)};
A.cpTxt=()=>{const t=$('#dpTxt');t.select();navigator.clipboard?.writeText(t.value).catch(()=>document.execCommand('copy'))};
A.dpDone=el=>{
 const it=itemById(el.dataset.id),st=el.dataset.st;it.status=st;
 if(st==='sold'){const p=+$('#dpPrice').value||0;it.sale={price:p,date:today()};it.log.push({d:today(),e:'卖出 '+money(p)})}
 else it.log.push({d:today(),e:STATUS[st]});
 if(tidy&&tidy.q&&tidy.q[tidy.i]?.id===it.id){tidy.out++;tidy.i++}
 save();closeModal();renderAll();
};
A.dpIdle=el=>{const it=itemById(el.dataset.id);it.status='idle';it.log.push({d:today(),e:'标记待出手'});save();closeModal();renderAll()};
/* 区域 */
A.addZone=el=>{if(el.tagName==='A'&&event)event.preventDefault();const furnId=el.dataset.furn||(SEL?.t==='furn'?SEL.id:S.furn[0]?.id);if(!furnId){alert('先去「3D 我的家」里建个家具');return}zoneForm(null,{furnId,cat:el.dataset.cat||''})};
A.addZoneRoom=el=>{const f=S.furn.find(f=>f.roomId===el.dataset.id);if(!f){alert('这个房间里还没有家具');return}zoneForm(null,{furnId:f.id})};
A.openZone=el=>zoneForm(zoneById(el.dataset.id));
A.addSnap=()=>$('#fSnap').click();
A.delSnap=el=>{TMP.z.photos.splice(+el.dataset.i,1);renderSnaps()};
A.lb=el=>{const i=el.dataset.srcI;lightbox(i!=null?TMP.z.photos[+i].img:el.src)};
A.saveZone=()=>{
 const d=collectZone();if(!d.name){alert('给区域起个名字');return}if(!d.furnId){alert('选一下在哪个家具里');return}
 if(TMP.isNew){S.zones.push(d);if(TMP.cellRef){const ff=furnById(TMP.cellRef.fid);if(ff&&ff.cells&&ff.cells[TMP.cellRef.idx])ff.cells[TMP.cellRef.idx].z=d.id}}else{const i=S.zones.findIndex(z=>z.id===d.id);S.zones[i]=d;
  S.items.filter(it=>it.zoneId===d.id).forEach(it=>it.furnId=d.furnId);}
 save();closeModal();renderAll();
};
A.delZone=el=>{const n=itemsInZone(el.dataset.id).length;if(!confirm('删除这个区域？'+(n?`里面 ${n} 件单品会保留，只是不再属于这个区域。`:'')))return;S.items.forEach(i=>{if(i.zoneId===el.dataset.id)i.zoneId=''});S.zones=S.zones.filter(z=>z.id!==el.dataset.id);save();closeModal();renderAll()};
A.aiZone=async()=>{
 const d=collectZone(),s=latestSnap(d);if(!s){alert('先加一张照片');return}
 const msg=$('#aiMsg'),btn=$('#aiBtn');btn.disabled=true;msg.textContent='🤖 看图中，约10秒…';
 try{
  const r=await aiAnalyze(s.img,d.name);
  const cur=new Set($('[name=tags]',box).value.split(/[,，、\s]+/).filter(Boolean));
  (r.items||[]).forEach(t=>cur.add(t));$('[name=tags]',box).value=[...cur].join('，');
  if(r.count&&!$('[name=count]',box).value)$('[name=count]',box).value=r.count;
  if(r.name&&!$('[name=name]',box).value)$('[name=name]',box).value=r.name;
  if(r.purpose&&!$('[name=purpose]',box).value)$('[name=purpose]',box).value=r.purpose;
  (r.cats||[]).forEach(c=>{const x=$(`input[name=cat][value="${c}"]`,box);if(x)x.checked=true});
  msg.textContent='✅ 识别好了，看看对不对，再保存';
 }catch(e){msg.textContent='❌ '+e.message}
 btn.disabled=false;
};
/* 批量 */
A.batchPick=()=>$('#fBatch').click();
A.batchDel=el=>{TMP.batch.splice(+el.dataset.i,1);renderBatch()};
A.batchAI=async()=>{
 const msg=$('#bMsg');let n=0;
 for(const b of TMP.batch){
  msg.textContent=`🤖 识别中 ${++n}/${TMP.batch.length}…`;
  try{const r=await aiAnalyze(b.img,b.name);
   if(!b.name)b.name=r.name||'';if(!b.purpose)b.purpose=r.purpose||'';
   b.tags=[...new Set([...(b.tags?b.tags.split(/[,，、\s]+/):[]),...(r.items||[])])].filter(Boolean).join('，');
   b.cats=r.cats||[];b.count=r.count||'';renderBatch();
  }catch(e){msg.textContent='❌ '+e.message;return}
 }
 msg.textContent='✅ 全部识别完，核对一下名字和用途';
};
A.batchSave=()=>{
 const furnId=$('#bFurn').value;let n=0;
 TMP.batch.forEach((b,i)=>{
  if(!b.name.trim())b.name='区域'+(i+1);
  S.zones.push({id:uid(),furnId,name:b.name.trim(),purpose:b.purpose.trim(),cats:b.cats||[],tags:b.tags.split(/[,，、\s]+/).filter(Boolean),count:b.count||'',value:'',photos:[{img:b.img,date:today()}],note:'',checked:today()});n++;
 });
 save();closeModal();renderAll();
};
/* 该放哪 */
A.putGo=()=>{PUT.name=$('#putName').value;PUT.res=putResults(PUT.name);PUT.msg='';renderPut()};
A.putPhoto=()=>$('#putFile').click();
A.putHere=el=>{
 const z=zoneById(el.dataset.id);
 if(PUT.name&&!z.tags.includes(PUT.name)){z.tags.push(PUT.name);save();}
 alert(`好，放进「${zoneText(z)}」。\n已把「${PUT.name||'它'}」加进这个区域的关键词，以后搜得到。`);renderAll();
};
/* 整理 */
A.startTidy=el=>startTidy(el.dataset.id);
A.endTidy=()=>{
 if(tidy){const r=roomById(tidy.rid);S.roomTidy[tidy.rid]=today();S.tidyLog.push({date:today(),room:r?.name||'',ok:tidy.ok,fix:tidy.fix,out:tidy.out});save();}
 tidy=null;renderAll();
};
A.tzOk=()=>{const z=zoneById(tidy.q[tidy.i].id);z.checked=today();const s=latestSnap(z);if(s)s.date=today();tidy.ok++;tidy.i++;save();renderTidy()};
A.tzSkip=()=>{tidy.i++;renderTidy()};
A.tzRe=()=>{TMP={reshoot:tidy.q[tidy.i].id};$('#reshoot').click()};
A.tiUse=()=>{const it=itemById(tidy.q[tidy.i].id);it.lastUsed=today();if(it.status==='idle')it.status='use';tidy.ok++;tidy.i++;save();renderTidy()};
A.tiIdle=()=>{const it=itemById(tidy.q[tidy.i].id);it.status='idle';tidy.fix++;tidy.i++;save();renderTidy()};
A.tiDisp=el=>{el.dataset.id=tidy.q[tidy.i].id;A.dispose(el)};
A.tiMove=()=>{
 const it=itemById(tidy.q[tidy.i].id);
 modal(`<h2>📍 「${esc(it.name)}」现在放在哪？</h2>${locSelect('loc',curLocVal(it))}<div class="row" style="margin-top:12px"><button class="pri big" data-act="tiMoveOk" data-id="${it.id}">确定</button><button class="big" data-act="closeModal">取消</button></div>`);
};
A.tiMoveOk=el=>{const it=itemById(el.dataset.id);Object.assign(it,parseLoc($('[name=loc]',box).value));it.lastUsed=today();tidy.fix++;tidy.i++;save();closeModal();renderTidy();renderHead()};
/* 布局编辑 */
A.toggleEdit=()=>{EDIT=!EDIT;renderAll();renderToolbar()};
A.addRoom=()=>roomForm(null);
A.editRoom=el=>roomForm(roomById(el.dataset.id));
A.addFurn=()=>furnForm(null);
A.editFurn=el=>furnForm(furnById(el.dataset.id));
A.rotFurn=el=>{const f=furnById(el.dataset.id);[f.w,f.d]=[f.d,f.w];const o=['S','W','N','E'];f.face=o[(o.indexOf(faceOf(f))+1)%4];save();renderAll()};
A.addZoneCell=el=>{zoneForm(null,{furnId:el.dataset.furn,cellIdx:+el.dataset.idx})};
A.toggleCellBtn=el=>{V3.toggle(el.dataset.furn,+el.dataset.idx);renderSide()};
A.batchOpen=()=>batchForm(SEL?.t==='furn'?SEL.id:S.furn[0]?.id);
A.saveRoom=()=>{
 const g=n=>$(`[name=${n}]`,box).value,d=TMP.r;
 d.name=g('name').trim()||'新房间';d.cx=+g('cx')||0;d.cz=+g('cz')||0;d.w=Math.max(.8,+g('w')||3);d.d=Math.max(.8,+g('d')||3);d.color=g('color');
 if(TMP.isNew)S.rooms.push(d);save();closeModal();renderAll();
};
A.delRoom=el=>{const r=el.dataset.id;if(!confirm('删除房间会同时删除里面的家具和区域，单品保留但失去位置。确定？'))return;
 const fs=S.furn.filter(f=>f.roomId===r).map(f=>f.id);
 S.zones=S.zones.filter(z=>!fs.includes(z.furnId));S.furn=S.furn.filter(f=>f.roomId!==r);S.rooms=S.rooms.filter(x=>x.id!==r);
 S.items.forEach(i=>{if(fs.includes(i.furnId)){i.furnId='';i.zoneId=''}if(i.roomId===r)i.roomId=''});SEL=null;save();closeModal();renderAll()};
A.saveFurn=()=>{
 const g=n=>$(`[name=${n}]`,box).value,d=TMP.f;
 d.name=g('name').trim()||'家具';d.roomId=g('roomId');d.w=Math.max(.2,+g('w')||1);d.d=Math.max(.2,+g('d')||.5);d.h=Math.max(.1,+g('h')||.8);d.color=g('color');
 if(TMP.isNew){const r=roomById(d.roomId);d.x=r.cx;d.z=r.cz;S.furn.push(d);}
 save();closeModal();renderAll();
};
A.delFurn=el=>{const f=el.dataset.id;if(!confirm('删除这件家具和它的区域？'))return;
 const zs=zonesInFurn(f).map(z=>z.id);S.items.forEach(i=>{if(i.furnId===f||zs.includes(i.zoneId)){i.furnId='';i.zoneId=''}});
 S.zones=S.zones.filter(z=>z.furnId!==f);S.furn=S.furn.filter(x=>x.id!==f);SEL=null;save();closeModal();renderAll()};
function roomForm(r){
 const isNew=!r,mx=S.rooms.length?Math.max(...S.rooms.map(x=>x.cx+x.w/2)):0;
 const d=r?{...r}:{id:uid(),name:'',cx:+(mx+1.7).toFixed(2),cz:0,w:3,d:3,color:'#eee6d6'};
 TMP={r:d,isNew};
 modal(`<h2>${isNew?'＋ 新房间':'✏️ 改房间'}</h2><div class="form">
 <div><label>名字</label><input name="name" value="${esc(d.name)}"></div>
 <div><label>地面颜色</label><input name="color" type="color" value="${d.color}"></div>
 <div><label>中心位置 x（米，右为正）</label><input name="cx" type="number" step="0.05" value="${d.cx}"></div>
 <div><label>中心位置 z（米，下为正）</label><input name="cz" type="number" step="0.05" value="${d.cz}"></div>
 <div><label>宽（米）</label><input name="w" type="number" step="0.1" value="${d.w}"></div>
 <div><label>深（米）</label><input name="d" type="number" step="0.1" value="${d.d}"></div></div>
 <div class="row" style="margin-top:14px;justify-content:space-between"><div class="row"><button class="pri big" data-act="saveRoom">保存</button><button class="big" data-act="closeModal">取消</button></div>${isNew?'':`<button class="danger" data-act="delRoom" data-id="${d.id}">删除房间</button>`}</div>`);
}
function furnForm(f){
 const isNew=!f;
 const d=f?{...f}:{id:uid(),roomId:SEL?.t==='room'?SEL.id:S.furn.find(x=>x.id===SEL?.id)?.roomId||S.rooms[0]?.id,name:'',x:0,z:0,w:1,d:.5,h:.8,color:'#c9a37a'};
 if(!S.rooms.length){alert('先建一个房间');return}
 TMP={f:d,isNew};
 modal(`<h2>${isNew?'＋ 新家具':'✏️ 改家具'}</h2><div class="form">
 <div><label>名字</label><input name="name" value="${esc(d.name)}" placeholder="衣柜 / 床 / 书桌"></div>
 <div><label>在哪个房间</label><select name="roomId">${S.rooms.map(r=>`<option value="${r.id}"${r.id===d.roomId?' selected':''}>${esc(r.name)}</option>`).join('')}</select></div>
 <div><label>宽（米）</label><input name="w" type="number" step="0.05" value="${d.w}"></div>
 <div><label>深（米）</label><input name="d" type="number" step="0.05" value="${d.d}"></div>
 <div><label>高（米）</label><input name="h" type="number" step="0.05" value="${d.h}"></div>
 <div><label>颜色</label><input name="color" type="color" value="${d.color}"></div></div>
 <div class="sec">新家具会放在房间中央，保存后在 3D 里拖到位置。</div>
 <div class="row" style="margin-top:14px;justify-content:space-between"><div class="row"><button class="pri big" data-act="saveFurn">保存</button><button class="big" data-act="closeModal">取消</button></div>${isNew?'':`<button class="danger" data-act="delFurn" data-id="${d.id}">删除家具</button>`}</div>`);
}
/* 设置 */
A.exportData=()=>{const b=new Blob([JSON.stringify(S)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='家当备份-'+today()+'.json';a.click()};
A.importData=()=>$('#importFile').click();
A.loadDemo=()=>{if(!confirm('用示范数据替换当前全部内容？'))return;S=demo();save();SEL=null;renderAll()};
A.clearAll=()=>{if(!confirm('清空全部房间、家具、区域和物品？不可恢复（建议先导出备份）'))return;S=blank();save();SEL=null;renderAll()};

/* ============ 事件总线 ============ */
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-act]');if(!el)return;
 const f=A[el.dataset.act];if(f){e.preventDefault();f(el)}
});
document.addEventListener('change',async e=>{
 const t=e.target;
 if(t.dataset.flt){F_ITEMS[t.dataset.flt]=t.value;renderItems()}
 else if(t.dataset.set){S.settings[t.dataset.set]=Math.max(1,+t.value||1);save();renderHead()}
 else if(t.id==='fPhoto'&&t.files[0]){TMP.it.photo=await compress(t.files[0],720);$('#pbPhoto').innerHTML=`<img src="${TMP.it.photo}">`}
 else if(t.id==='fReceipt'&&t.files[0]){TMP.it.receipt=await compress(t.files[0],1100);$('#pbReceipt').innerHTML=`<img src="${TMP.it.receipt}">`}
 else if(t.id==='fSnap'&&t.files[0]){collectZone();TMP.z.photos.push({img:await compress(t.files[0],1100),date:today()});renderSnaps();t.value=''}
 else if(t.id==='fBatch'){for(const f of t.files){TMP.batch.push({img:await compress(f,1000),name:'',purpose:'',tags:'',cats:[],count:''})}renderBatch();t.value=''}
 else if(t.id==='reshoot'&&t.files[0]){
  const z=zoneById(TMP.reshoot);z.photos.push({img:await compress(t.files[0],1100),date:today()});z.checked=today();
  if(z.photos.length>6)z.photos.shift();
  tidy.fix++;tidy.i++;save();t.value='';renderTidy();
 }
 else if(t.id==='putFile'&&t.files[0]){
  PUT.img=await compress(t.files[0],900);PUT.busy=true;PUT.msg='';renderPut();
  try{const r=await aiAnalyze(PUT.img,'');PUT.name=r.name||(r.items||[])[0]||'';PUT.res=putResults(PUT.name,(r.cats||[])[0]);}
  catch(err){PUT.msg=err.message}
  PUT.busy=false;t.value='';renderPut();
 }
 else if(t.id==='importFile'&&t.files[0]){
  try{const j=JSON.parse(await t.files[0].text());if(!j.rooms||!j.items)throw 0;S=Object.assign(blank(),j);S.zones=S.zones||[];save();SEL=null;renderAll();alert('导入成功')}catch(_){alert('这个文件不是家当的备份')}
  t.value='';
 }
});
document.addEventListener('input',e=>{
 const t=e.target;
 if(t.dataset.b!=null&&TMP.batch)TMP.batch[+t.dataset.b][t.dataset.k]=t.value;
});
$('#q').addEventListener('input',e=>{Q=e.target.value;if(Q&&VIEW!=='home'&&VIEW!=='items')setView('items');else renderAll();if(VIEW==='home')V3.highlight(hlSet())});
$('#q').addEventListener('keydown',e=>{if(e.key==='Enter'&&Q.trim()){if(VIEW!=='home')setView('home');const h=hlSet();V3.highlight(h);const f=[...h.furn][0];if(f)V3.focusFurn(f)}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='putName')A.putGo()});
function hlSet(){
 const h=searchHits(Q),furn=new Set();
 if(!h)return {furn};
 h.items.forEach(i=>{const f=locOf(i).f;if(f)furn.add(f.id)});
 h.zones.forEach(z=>furn.add(z.furnId));h.furns.forEach(f=>furn.add(f.id));
 return {furn};
}

/* ============ 工具条 ============ */
function renderToolbar(){
 const room=V3.mode==='room',tb=$('#tb');
 if(room){
  const r=roomById(V3.curRoom);
  tb.innerHTML=`<button class="on" data-act="exitRoom">⬆ 回到总览</button><span class="crumb">📍 ${esc(r?r.name:'')}</span><button data-act="toggleMute" title="开关柜门声音">${MUTED?'🔇':'🔊'}</button>`;
 }else{
  tb.innerHTML=`<button class="on" data-act="enterSel">🚶 走进房间</button>`+
   `<button data-act="viewTop" title="俯视">⬇</button><button data-act="viewIso" title="斜视">◩</button>`+
   `<button data-act="wallMode" title="墙体显示方式">🧱 ${{auto:'自动',full:'全高',low:'矮墙'}[WALLMODE]}</button>`+
   `<button class="${EDIT?'on':''}" data-act="toggleEdit">${EDIT?'✅ 完成':'✏️ 布局'}</button>`+
   (EDIT?`<button data-act="addRoom">＋房间</button><button data-act="addFurn">＋家具</button>`:'')+
   `<button data-act="toggleMute" title="开关柜门声音">${MUTED?'🔇':'🔊'}</button>`;
 }
 const h=$('#hint');if(h)h.textContent=room?'拖动环顾 · 点地面走过去 · 点柜门/抽屉打开 · 点门去隔壁 · Esc 回总览':'拖动旋转 · 滚轮缩放 · 点柜门打开 · 双击房间走进去';
 renderChips();
}
function renderChips(){
 const el=$('#chips');if(!el)return;
 const room=V3.mode==='room',cur=room?V3.curRoom:(SEL&&SEL.t==='room'?SEL.id:null);
 el.innerHTML=S.rooms.filter(r=>r.id!=='vr13'||true).map(r=>`<button class="${r.id===cur?'on':''}" data-act="chipRoom" data-id="${r.id}">${esc(r.name)}</button>`).join('');
}
A.enterSel=()=>{
 let id=null;
 if(SEL&&SEL.t==='room')id=SEL.id;
 else if(SEL&&SEL.t==='furn')id=furnById(SEL.id)?.roomId;
 if(!id){const t=V3.ctl.target;const r=S.rooms.find(r=>Math.abs(t.x-r.cx)<=r.w/2&&Math.abs(t.z-r.cz)<=r.d/2);id=(r||S.rooms.find(r=>r.name.includes('客厅'))||S.rooms[0]).id}
 V3.enterRoom(id);
};
A.exitRoom=()=>V3.exitRoom();
A.chipRoom=el=>{
 const id=el.dataset.id;
 if(V3.mode==='room')V3.enterRoom(id);
 else{SEL={t:'room',id};SELCELL=null;V3.focusRoom(id);renderSide();renderChips()}
};
A.toggleMute=()=>{V3.setMute(!MUTED);renderToolbar()};
A.viewTop=()=>V3.preset('top');A.viewIso=()=>V3.preset('iso');
A.wallMode=()=>{const o=['auto','full','low'];V3.setWall(o[(o.indexOf(WALLMODE)+1)%3]);renderToolbar()};

/* ============ 云同步 ============ */
const CFG=window.JD_CONFIG||{};
const canon=o=>Array.isArray(o)?'['+o.map(canon).join(',')+']':o&&typeof o==='object'?'{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canon(o[k])).join(',')+'}':JSON.stringify(o);
const hcache=new Map();
function hstr(d){let h=hcache.get(d);if(h)return h;let h1=0x811c9dc5,h2=0x1000193^d.length;for(let i=0;i<d.length;i++){const c=d.charCodeAt(i);h1=Math.imul(h1^c,16777619);h2=Math.imul(h2+c,2246822519)^(h2>>>13)}
 h=(h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0')+d.length.toString(16);hcache.set(d,h);return h}
function mapImgs(st,fn){for(const i of st.items||[]){if(i.photo)i.photo=fn(i.photo);if(i.receipt)i.receipt=fn(i.receipt)}for(const z of st.zones||[])for(const p of z.photos||[])p.img=fn(p.img)}
function serialize(){const c=JSON.parse(JSON.stringify(S));const imgs={};mapImgs(c,d=>{if(typeof d!=='string'||!d.startsWith('data:'))return d;const h=hstr(d);imgs[h]=d;return 'img:'+h});return {data:c,imgs}}
function localImgMap(){const m={};const add=d=>{if(typeof d==='string'&&d.startsWith('data:'))m[hstr(d)]=d};for(const i of S.items){add(i.photo);add(i.receipt)}for(const z of S.zones)for(const p of z.photos)add(p.img);return m}
function applyState(ser,imgs){
 const c=JSON.parse(JSON.stringify(ser));
 mapImgs(c,r=>typeof r==='string'&&r.startsWith('img:')?(imgs[r.slice(4)]||null):r);
 c.zones=(c.zones||[]).map(z=>({...z,photos:(z.photos||[]).filter(p=>p.img)}));
 S=Object.assign(blank(),c);S.settings=Object.assign({idleDays:90,tidyEvery:30,snapDays:90},S.settings);
 DB.set('state',S).catch(()=>{});
}
function mergeArr(b,l,r){
 const idx=a=>new Map((a||[]).map(x=>[x.id,x])),B=idx(b),L=idx(l),R=idx(r),same=(x,y)=>canon(x)===canon(y),out=[],seen=new Set();
 const take=id=>{if(seen.has(id))return;seen.add(id);const lv=L.get(id),rv=R.get(id),bv=B.get(id);
  if(lv&&rv)out.push(bv&&same(lv,bv)?rv:lv);
  else if(lv){if(!bv||!same(lv,bv))out.push(lv)}
  else if(rv){if(!bv||!same(rv,bv))out.push(rv)}};
 (r||[]).forEach(x=>take(x.id));(l||[]).forEach(x=>take(x.id));return out;
}
function merge3(b,l,r){
 const same=(x,y)=>canon(x)===canon(y),o=Object.assign({},r);
 ['rooms','furn','zones','items'].forEach(k=>o[k]=mergeArr(b[k],l[k],r[k]));
 o.roomTidy=Object.assign({},r.roomTidy);for(const k in l.roomTidy||{})if(!o.roomTidy[k]||l.roomTidy[k]>o.roomTidy[k])o.roomTidy[k]=l.roomTidy[k];
 o.settings=same(l.settings,b.settings)?r.settings:l.settings;
 const seen=new Set();o.tidyLog=[...(r.tidyLog||[]),...(l.tidyLog||[])].filter(x=>{const k=x.date+x.room+x.ok+x.fix+x.out;if(seen.has(k))return false;seen.add(k);return true}).sort((a,c)=>a.date.localeCompare(c.date));
 return o;
}
const Sync={
 code:null,base:null,busy:false,again:false,timer:0,st:'off',msg:'',
 init(){
  try{const m=location.hash.match(/k=([A-Za-z0-9_-]{16,})/);if(m){localStorage.setItem('jd_code',m[1]);history.replaceState(null,'',location.pathname+location.search)}
   this.code=localStorage.getItem('jd_code')||null}catch(_){}
  if(this.code)this.st='idle';
 },
 chip(){
  if(!this.code)return `<span class="chip warn" data-act="tab" data-v="set" style="cursor:pointer">☁️ 未同步</span>`;
  const m={idle:['','☁️ 等待同步'],syncing:['','⏳ 同步中…'],ok:['','☁️ 已同步'],err:['bad','⚠️ 同步失败']}[this.st]||['','☁️'];
  return `<span class="chip ${m[0]}" data-act="syncNow" style="cursor:pointer" title="${esc(this.msg)}">${m[1]}</span>`;
 },
 setStatus(s,m=''){this.st=s;this.msg=m;if(S)renderHead();if(VIEW==='set')renderSet()},
 async rpc(fn,args){
  const ac=new AbortController(),to=setTimeout(()=>ac.abort(),30000);
  try{
   const r=await fetch(CFG.url+'/rest/v1/rpc/'+fn,{method:'POST',signal:ac.signal,headers:{apikey:CFG.anon,authorization:'Bearer '+CFG.anon,'content-type':'application/json'},body:JSON.stringify(args)});
   const t=await r.text();if(!r.ok)throw new Error(fn+' '+r.status+' '+t.slice(0,120));return t?JSON.parse(t):null;
  }catch(e){throw new Error(e.name==='AbortError'?'网络太慢，超时了（点一下重试）':e.message)}
  finally{clearTimeout(to)}
 },
 schedule(ms=1500){if(!this.code)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.run(),ms)},
 async pull(){
  const res=await this.rpc('jd_get',{p_code:this.code});
  if(!res||!res.version||!res.data)return {version:0,data:null,imgs:{}};
  const need=new Set();mapImgs(JSON.parse(JSON.stringify(res.data)),r=>{if(typeof r==='string'&&r.startsWith('img:'))need.add(r.slice(4));return r});
  const have=localImgMap(),want=[...need].filter(h=>!have[h]);
  const chunks=[];for(let i=0;i<want.length;i+=4)chunks.push(want.slice(i,i+4));
  for(let i=0;i<chunks.length;i+=3){
   const part=await Promise.all(chunks.slice(i,i+3).map(h=>this.rpc('jd_img_get',{p_code:this.code,p_hashes:h})));
   part.forEach(rows=>(rows||[]).forEach(x=>have[x.hash]=x.data));
  }
  return {version:res.version,data:res.data,imgs:have};
 },
 async push(ser,expected){
  const hs=Object.keys(ser.imgs);
  if(hs.length){const miss=await this.rpc('jd_img_missing',{p_code:this.code,p_hashes:hs});for(const h of miss||[])await this.rpc('jd_img_put',{p_code:this.code,p_hash:h,p_data:ser.imgs[h]})}
  const r=await this.rpc('jd_put',{p_code:this.code,p_data:ser.data,p_expected:expected});
  if(r.ok){this.base={version:r.version,data:ser.data};await DB.set('base',this.base);return true}
  return false;
 },
 async run(){
  if(!this.code||!CFG.url)return;
  if(this.busy){this.again=true;return}
  this.busy=true;this.setStatus('syncing');let changed=false;
  try{
   for(let n=0;n<5;n++){
    const rv=await this.rpc('jd_ver',{p_code:this.code});
    const L=serialize(),base=this.base;
    if(base&&rv===base.version){
     if(canon(L.data)===canon(base.data))break;
     if(await this.push(L,rv))break;continue;
    }
    if(rv===0){if(await this.push(L,0))break;continue}
    const R=await this.pull();
    let merged;
    if(!base&&S.demo)merged=R.data;
    else merged=merge3(base?base.data:{rooms:[],furn:[],zones:[],items:[],roomTidy:{},tidyLog:[],settings:{}},L.data,R.data);
    const before=S.rooms.map(r=>r.id).join();
    applyState(merged,Object.assign({},localImgMap(),R.imgs));changed=true;
    if(before!==S.rooms.map(r=>r.id).join()){SEL=null;setTimeout(()=>V3.preset('iso'),50)}
    this.base={version:R.version,data:R.data};await DB.set('base',this.base);
    const M=serialize();
    if(canon(M.data)===canon(R.data))break;
    if(await this.push(M,R.version))break;
   }
   this.setStatus('ok');
  }catch(e){this.setStatus('err',e.message)}
  this.busy=false;
  if(changed)renderAll();
  if(this.again){this.again=false;this.schedule(500)}
 },
 async start(code){
  this.code=code;try{localStorage.setItem('jd_code',code)}catch(_){}
  this.base=null;await DB.set('base',null);this.st='idle';await this.run();
 },
 link(){return (CFG.pages||location.origin+location.pathname)+'#k='+this.code}
};
function syncPanel(){
 if(!CFG.url)return '';
 if(!Sync.code)return `<h2>☁️ 云同步 / 手机使用</h2><div class="card"><p style="margin-top:0">开启后，电脑和手机用同一份数据：手机现场拍照，电脑上看 3D。</p><div class="row"><button class="pri big" data-act="syncOn">开启云同步</button></div><div class="row" style="margin-top:10px"><input id="syncCode" placeholder="已有口令？粘贴到这里" style="max-width:320px"><button data-act="syncJoin">用这个口令</button></div></div>`;
 return `<h2>☁️ 云同步 / 手机使用</h2><div class="card"><p style="margin-top:0">状态：<b>${{idle:'等待同步',syncing:'同步中…',ok:'已同步',err:'失败：'+esc(Sync.msg)}[Sync.st]||''}</b></p>
 <label>手机打开这个链接（发给自己微信文件传输助手，手机点开就是同一个家）</label>
 <input readonly value="${esc(Sync.link())}" onclick="this.select()"><div class="row" style="margin-top:8px"><button data-act="copyLink">复制链接</button><button data-act="syncNow">立即同步</button></div>
 <p class="sec">链接里带着你家的口令，谁拿到谁就能看和改，别公开发。</p></div>`;
}
A.syncNow=()=>Sync.run();
A.syncOn=()=>{const a=new Uint8Array(18);crypto.getRandomValues(a);const code=[...a].map(b=>'abcdefghjkmnpqrstuvwxyz23456789'[b%31]).join('');Sync.start(code).then(()=>{renderSet()})};
A.syncJoin=()=>{const v=($('#syncCode').value||'').trim();const m=v.match(/k=([A-Za-z0-9_-]{16,})/);const code=m?m[1]:v;if(!/^[A-Za-z0-9_-]{16,}$/.test(code)){alert('口令不对（至少16位）');return}Sync.start(code)};
A.copyLink=()=>{navigator.clipboard?.writeText(Sync.link()).then(()=>alert('已复制，发到手机上打开'),()=>alert(Sync.link()))};

/* ============ 3D ============ */
let WALLMODE='auto';try{WALLMODE=localStorage.getItem('jd_wall')||'auto'}catch(_){}
let MUTED=false;try{MUTED=localStorage.getItem('jd_mute')==='1'}catch(_){}
const V3=(()=>{
 let R,scene,cam,ctl,grp,ceilG,sun,roomLight,labels={},furnG={},meshR={},picks=[],infos=[],lbs=[],walls=[],rlabels=[],hl={furn:new Set()};
 let mode='dollhouse',curRoom=null,transit=false,hoverKey=null,lastT=0;
 const eye={x:0,z:0,yaw:0,pitch:0,fov:72};
 const tweens=[];
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),-0.06);
 let drag=null,down=null,look=null;
 const imgCache=new Map(),texCache={};
 const getImg=src=>{let im=imgCache.get(src);if(!im){im=new Image();im.src=src;imgCache.set(src,im)}return im};
 const MT=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8},o||{}));
 const ease=u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
 /* ---------- 声音：门/抽屉的"咚、吱" ---------- */
 let AC=null;
 function audio(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(_){}}return AC}
 function sound(kind){
  if(MUTED)return;const a=audio();if(!a)return;if(a.state==='suspended')a.resume();
  const t=a.currentTime,o=a.createOscillator(),g=a.createGain();
  o.type='sine';o.frequency.setValueAtTime(kind==='drawer'?150:120,t);o.frequency.exponentialRampToValueAtTime(55,t+.14);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.3,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.2);
  o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+.22);
  const n=a.createBufferSource(),len=Math.floor(a.sampleRate*.28),buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.2);
  n.buffer=buf;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=kind==='drawer'?1100:420;f.Q.value=.8;
  const g2=a.createGain();g2.gain.value=kind==='drawer'?.16:.1;n.connect(f);f.connect(g2);g2.connect(a.destination);n.start(t);
 }
 /* ---------- 贴图 ---------- */
 function tileTex(col,seam,tile,dark){
  const key=col+seam+dark;let base=texCache[key];
  if(!base){
   const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
   x.fillStyle=col;x.fillRect(0,0,256,256);
   for(let i=0;i<40;i++){x.strokeStyle=dark?`rgba(255,255,255,${.02+Math.random()*.05})`:`rgba(120,120,125,${.03+Math.random()*.06})`;x.lineWidth=1+Math.random()*2;
    x.beginPath();let px=Math.random()*256,py=Math.random()*256;x.moveTo(px,py);for(let k=0;k<4;k++){px+=Math.random()*80-30;py+=Math.random()*80-30;x.lineTo(px,py)}x.stroke()}
   x.strokeStyle=seam;x.lineWidth=4;x.strokeRect(0,0,256,256);
   base=new THREE.CanvasTexture(c);base.wrapS=base.wrapT=THREE.RepeatWrapping;base.anisotropy=4;texCache[key]=base;
  }
  return base;
 }
 function photoMesh(src,w,h){
  const im=getImg(src),tex=new THREE.Texture(im);
  const apply=()=>{const ia=im.naturalWidth/im.naturalHeight,ca=w/h;
   if(ca>ia){tex.repeat.set(1,ia/ca);tex.offset.set(0,(1-ia/ca)/2)}else{tex.repeat.set(ca/ia,1);tex.offset.set((1-ca/ia)/2,0)}tex.needsUpdate=true};
  if(im.complete&&im.naturalWidth)apply();else im.addEventListener('load',apply,{once:true});
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
 }
 function label(text,{scale=1,bg='rgba(255,255,255,.88)',fg='#2b2a28'}={}){
  const key=text+bg+fg;if(labels[key]){const s=labels[key].clone();s.material=labels[key].material;return s}
  const c=document.createElement('canvas'),x=c.getContext('2d'),fs=40,font=`600 ${fs}px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
  x.font=font;const w=Math.ceil(x.measureText(text).width)+36;c.width=w;c.height=fs+26;
  x.font=font;x.fillStyle=bg;const r=18;x.beginPath();x.moveTo(r,0);x.arcTo(w,0,w,c.height,r);x.arcTo(w,c.height,0,c.height,r);x.arcTo(0,c.height,0,0,r);x.arcTo(0,0,w,0,r);x.fill();
  x.fillStyle=fg;x.textBaseline='middle';x.fillText(text,18,c.height/2+2);
  const t=new THREE.CanvasTexture(c),s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));
  s.scale.set(c.width/190*scale,c.height/190*scale,1);s.renderOrder=10;labels[key]=s;return s.clone();
 }
 /* ---------- 初始化 ---------- */
 function init(){
  const cv=$('#cv');
  R=new THREE.WebGLRenderer({canvas:cv,antialias:true});R.setPixelRatio(Math.min(2,devicePixelRatio));
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0xe9eef2);
  cam=new THREE.PerspectiveCamera(42,1,.05,200);cam.position.set(0,13,10);
  ctl=new THREE.OrbitControls(cam,cv);ctl.target.set(0,0,0.3);ctl.maxPolarAngle=1.5;ctl.minDistance=1.0;ctl.maxDistance=40;ctl.enableDamping=true;ctl.dampingFactor=.1;ctl.rotateSpeed=.7;ctl.zoomSpeed=.8;
  scene.add(new THREE.HemisphereLight(0xffffff,0xb9bdc2,.62));
  sun=new THREE.DirectionalLight(0xffffff,.42);sun.position.set(5,14,7);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-10;sc.right=10;sc.top=10;sc.bottom=-10;sc.near=1;sc.far=40;sun.shadow.bias=-.0006;
  scene.add(sun);
  roomLight=new THREE.PointLight(0xfff2dd,0,9,1.6);roomLight.position.set(0,2.3,0);scene.add(roomLight);
  const g=new THREE.GridHelper(40,40,0xcdd5db,0xdbe1e6);g.position.y=-.01;scene.add(g);g.name='grid';
  grp=new THREE.Group();scene.add(grp);ceilG=new THREE.Group();scene.add(ceilG);ceilG.visible=false;
  cv.addEventListener('pointerdown',onDown,true);
  cv.addEventListener('pointermove',onHover);
  window.addEventListener('pointermove',onMove);
  window.addEventListener('pointerup',onUp);
  cv.addEventListener('wheel',onWheel,{passive:false});
  window.addEventListener('keydown',onKey);
  new ResizeObserver(resize).observe($('#stage'));
  (function loop(now){requestAnimationFrame(loop);
   const dt=Math.min(.05,(now-(lastT||now))/1000);lastT=now;
   stepTweens(now);
   if(mode==='dollhouse'&&!transit&&ctl.enabled)ctl.update();
   else if(mode==='room'&&!transit)applyEye();
   // 高亮
   const pulse=.35+.35*Math.sin(now/220);
   for(const id in furnG){const sel=SEL&&SEL.t==='furn'&&SEL.id===id;
    furnG[id].mats.forEach(m=>{
     if(hl.furn.has(id)){m.emissive.setHex(0xffa000);m.emissiveIntensity=.4+pulse}
     else if(sel&&mode==='dollhouse'){m.emissive.setHex(0x2f7d6b);m.emissiveIntensity=.28}
     else m.emissiveIntensity=0})}
   // 标签：总览里只显示被选中/悬停的家具名
   lbs.forEach(l=>{l.sp.visible=mode==='dollhouse'&&((SEL&&SEL.t==='furn'&&SEL.id===l.fid)||hoverKey===l.fid)});
   // 外墙：朝向镜头的那几面自动隐藏；隔墙压低；室内模式全部立起
   const room=mode==='room';
   walls.forEach(w=>{
    let tg=1;
    if(!room){
     if(WALLMODE==='low')tg=.12;
     else if(WALLMODE==='auto'){
      if(w.ext){const dx=cam.position.x-w.x,dz=cam.position.z-w.z;tg=(w.nx*dx+w.nz*dz>0.05)?0:1}
      else tg=.4;
     }
    }
    const s=w.g.scale.y+(tg-w.g.scale.y)*Math.min(1,dt*9);
    w.g.scale.y=Math.max(.001,s);w.g.visible=s>.02;
   });
   ceilG.visible=room&&!transit;
   rlabels.forEach(l=>{l.visible=!room});
   // 柜门/抽屉：弹簧动画（有一点点回弹，像真的）
   infos.forEach(c=>{
    const tg=c.open?1:0,k=130,dmp=15;
    const a=k*(tg-c.t)-dmp*c.v;c.v+=a*dt;c.t+=c.v*dt;
    if(Math.abs(tg-c.t)<.0008&&Math.abs(c.v)<.01){c.t=tg;c.v=0}
    if(c.k==='door')c.pivot.rotation.y=(c.hinge==='L'?-1:1)*1.78*c.t;
    else if(c.k==='drawer')c.slideG.position.z=c.baseZ+c.slide*c.t;
   });
   R.render(scene,cam)})(0);
 }
 function resize(){const s=$('#stage');if(!s||!R)return;const w=s.clientWidth,h=s.clientHeight;if(!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
 /* ---------- 补间动画 ---------- */
 function stepTweens(now){
  for(let i=tweens.length-1;i>=0;i--){
   const t=tweens[i];if(t.t0==null)t.t0=now;
   const u=Math.min(1,(now-t.t0)/t.dur);t.fn(t.ease(u));
   if(u>=1){tweens.splice(i,1);t.done&&t.done()}
  }
 }
 const addTween=(dur,fn,done,ez)=>tweens.push({dur,fn,done,ease:ez||ease,t0:null});
 const V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const bez=(a,b,c,d,u)=>{const m=1-u;return a.clone().multiplyScalar(m*m*m).addScaledVector(b,3*m*m*u).addScaledVector(c,3*m*u*u).addScaledVector(d,u*u*u)};
 function eyeDir(){const cp=Math.cos(eye.pitch);return V(Math.sin(eye.yaw)*cp,Math.sin(eye.pitch),-Math.cos(eye.yaw)*cp)}
 function applyEye(){
  cam.position.set(eye.x,1.55,eye.z);
  const d=eyeDir();cam.lookAt(cam.position.x+d.x,cam.position.y+d.y,cam.position.z+d.z);
  if(Math.abs(cam.fov-eye.fov)>.01){cam.fov=eye.fov;cam.updateProjectionMatrix()}
 }
 function setFov(f){cam.fov=f;cam.updateProjectionMatrix()}
 /* 飞：位置走三次贝塞尔曲线，视线点平滑插值，视野同时变化 */
 function fly({from,via1,via2,to,lookFrom,lookTo,fovFrom,fovTo,dur,done}){
  transit=true;ctl.enabled=false;
  addTween(dur,u=>{
   cam.position.copy(bez(from,via1,via2,to,u));
   const l=lookFrom.clone().lerp(lookTo,u);cam.lookAt(l);
   const f=fovFrom+(fovTo-fovFrom)*u;if(Math.abs(cam.fov-f)>.01){cam.fov=f;cam.updateProjectionMatrix()}
  },()=>{transit=false;done&&done()});
 }
 const curLook=()=>mode==='room'?cam.position.clone().addScaledVector(eyeDir(),3):ctl.target.clone();
 /* ---------- 房间外壳 ---------- */
 const OUT={N:[0,-1],S:[0,1],W:[-1,0],E:[1,0]};
 function isInterior(r,side,mid){
  const o=OUT[side],px=mid.x+o[0]*.25,pz=mid.z+o[1]*.25;
  return S.rooms.some(q=>q.id!==r.id&&Math.abs(px-q.cx)<q.w/2-.01&&Math.abs(pz-q.cz)<q.d/2-.01);
 }
 function buildRoom(r){
  const tile=/卫|厨/.test(r.name)?.45:.8;
  const tx=tileTex(r.floor||r.color,r.gloss?'rgba(60,60,60,.35)':'rgba(70,70,70,.28)',tile,/卫/.test(r.name)).clone();tx.needsUpdate=true;tx.repeat.set(r.w/tile,r.d/tile);
  const floorM=MT('#ffffff',{map:tx,roughness:r.gloss?.22:.8,metalness:r.gloss?.12:0});
  const fl=new THREE.Mesh(new THREE.BoxGeometry(r.w,.05,r.d),floorM);
  fl.position.set(r.cx,.025,r.cz);fl.userData={roomId:r.id};fl.receiveShadow=true;grp.add(fl);meshR[r.id]=fl;
  const sel=SEL&&SEL.t==='room'&&SEL.id===r.id;
  const wallM=MT(sel?'#bfe3d8':(r.wall||'#f2efe8'),{roughness:.95});
  const glassM=MT('#bcd7e6',{transparent:true,opacity:.22,roughness:.08,depthWrite:false});
  const trim=MT('#f4f2ee',{roughness:.7});
  const T=.1,HWALL=2.6;
  ['N','S','W','E'].forEach(side=>{
   const horiz=side==='N'||side==='S',len=horiz?r.w:r.d,o=OUT[side];
   const base={x:horiz?r.cx:r.cx+o[0]*r.w/2,z:horiz?r.cz+o[1]*r.d/2:r.cz};
   const interior=isInterior(r,side,base);
   const at=(along)=>horiz?{x:r.cx-r.w/2+along,z:base.z}:{x:base.x,z:r.cz-r.d/2+along};
   const wg=new THREE.Group();grp.add(wg);
   const piece=(a,b,y0,y1,m=wallM)=>{
    y1=Math.min(y1,HWALL);if(y1-y0<.02||b-a<.02)return;
    const l=b-a,h=y1-y0,c=at((a+b)/2);
    const me=new THREE.Mesh(new THREE.BoxGeometry(horiz?l:T,h,horiz?T:l),m);
    me.position.set(c.x,y0+h/2,c.z);wg.add(me);return me;
   };
   const ops=[];
   (r.doors||[]).filter(d=>d.s===side).forEach(d=>{const c=d.p*len;ops.push({a:Math.max(0,c-d.w/2),b:Math.min(len,c+d.w/2),y0:0,y1:d.t==='open'?2.25:2.05,d})});
   (r.windows||[]).filter(w=>w.s===side).forEach(w=>{const c=w.p*len,sl=w.sill==null?.9:w.sill;ops.push({a:Math.max(0,c-w.w/2),b:Math.min(len,c+w.w/2),y0:sl,y1:sl+w.h,w})});
   ops.sort((x,y)=>x.a-y.a);
   let cur=0;
   ops.forEach(op=>{
    piece(cur,op.a,0,HWALL);cur=Math.max(cur,op.b);
    if(op.y0>.02)piece(op.a,op.b,0,op.y0);
    piece(op.a,op.b,op.y1,HWALL);
    const cx=(op.a+op.b)/2,c=at(cx),w=op.b-op.a;
    const bar=(l,h,dx,y,m,th)=>{const mm=new THREE.Mesh(new THREE.BoxGeometry(horiz?l:th,h,horiz?th:l),m);mm.position.set(c.x+(horiz?dx:0),y,c.z+(horiz?0:dx));wg.add(mm);return mm};
    if(op.w){ // 窗
     const win=op.w,fm=MT(win.fc||'#ececea',{roughness:.5}),hh=op.y1-op.y0,yc=(op.y0+op.y1)/2;
     const gl=new THREE.Mesh(new THREE.BoxGeometry(horiz?w:.02,hh,horiz?.02:w),glassM);gl.position.set(c.x,yc,c.z);gl.renderOrder=2;wg.add(gl);
     bar(w,.06,0,op.y1,fm,.12);bar(w,.06,0,op.y0,fm,.12);bar(.06,hh,-w/2,yc,fm,.12);bar(.06,hh,w/2,yc,fm,.12);
     if(win.mid||w>1.4)bar(.045,hh,0,yc,fm,.1);
     bar(w+.16,.04,0,op.y0-.02,trim,.22);                                    // 窗台板
     if(win.cur){
      const cc=win.cur,top=cc.top||2.5,bot=cc.bot==null?.08:cc.bot,span=w+(cc.ext==null?.55:cc.ext);
      // 纱帘（半透明白）
      const sh=new THREE.Mesh(new THREE.BoxGeometry(horiz?w+.2:.01,top-bot,horiz?.01:w+.2),MT('#ffffff',{transparent:true,opacity:.35,roughness:1,depthWrite:false}));
      sh.position.set(c.x-o[0]*.1,(top+bot)/2,c.z-o[1]*.1);wg.add(sh);
      // 帘杆
      const rod=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,span+.2,8),MT('#555',{metalness:.6}));
      rod.rotation.z=horiz?Math.PI/2:0;rod.rotation.x=horiz?0:Math.PI/2;rod.position.set(c.x-o[0]*.16,top+.02,c.z-o[1]*.16);wg.add(rod);
      const cm=MT(cc.c||'#cdbfa9',{roughness:1}),covers=cc.open?[[-span/2,-span/2+span*.3],[span/2-span*.3,span/2]]:[[-span/2,span/2]];
      covers.forEach(([s0,s1])=>{
       const n=Math.max(3,Math.round((s1-s0)/.1));
       for(let k=0;k<n;k++){
        const u=s0+(k+.5)*(s1-s0)/n,off=Math.sin(k*1.3)*.035;
        const m=new THREE.Mesh(new THREE.BoxGeometry(horiz?(s1-s0)/n+.005:.045,top-bot,horiz?.045:(s1-s0)/n+.005),cm);
        m.position.set(c.x+(horiz?u:0)-o[0]*(.14+off),(top+bot)/2,c.z+(horiz?0:u)-o[1]*(.14+off));wg.add(m);
       }
      });
      if(cc.val){const m=new THREE.Mesh(new THREE.BoxGeometry(horiz?span:.14,.24,horiz?.14:span),MT(cc.val,{roughness:.9}));m.position.set(c.x-o[0]*.12,top-.12,c.z-o[1]*.12);wg.add(m)}
     }
    }else{ // 门
     const d=op.d,t=d.t||'open';
     if(t==='slide'){
      const fm=MT(d.fc||'#222',{roughness:.5});
      const gl=new THREE.Mesh(new THREE.BoxGeometry(horiz?w:.02,2.0,horiz?.02:w),glassM);gl.position.set(c.x,1.0,c.z);gl.renderOrder=2;wg.add(gl);
      bar(w,.07,0,2.03,fm,.09);bar(w,.06,0,.03,fm,.09);bar(.06,2.0,-w/2,1.0,fm,.09);bar(.06,2.0,w/2,1.0,fm,.09);bar(.05,2.0,0,1.0,fm,.09);
      bar(.05,2.0,w*.12,1.0,fm,.1);
      if(d.cur){const cm=MT(d.cur,{roughness:1}),span=w+.5,n=Math.round(span/.1);
       for(let k=0;k<n;k++){const u=-span/2+(k+.5)*span/n,off=Math.sin(k*1.3)*.035;
        const m=new THREE.Mesh(new THREE.BoxGeometry(horiz?span/n+.005:.045,2.45,horiz?.045:span/n+.005),cm);
        m.position.set(c.x+(horiz?u:0)-o[0]*(.16+off),1.25,c.z+(horiz?0:u)-o[1]*(.16+off));wg.add(m)}}
     }else if(t==='door'){
      const dm=MT(d.c||'#f5f5f2',{roughness:.55}),lh=2.0;
      // 门套
      bar(w+.1,.06,0,2.07,trim,T*1.25);bar(.05,2.05,-w/2-.02,1.02,trim,T*1.25);bar(.05,2.05,w/2+.02,1.02,trim,T*1.25);
      const pv=new THREE.Group(),hingeAlong=d.h==='R'?op.b:op.a,hp=at(hingeAlong);
      pv.position.set(hp.x,0,hp.z);
      const leaf=new THREE.Mesh(new THREE.BoxGeometry(horiz?w-.03:.04,lh,horiz?.04:w-.03),dm);
      const sgn=d.h==='R'?-1:1;
      leaf.position.set(horiz?sgn*(w-.03)/2:0,lh/2,horiz?0:sgn*(w-.03)/2);pv.add(leaf);
      const pan=new THREE.Mesh(new THREE.BoxGeometry(horiz?(w-.03)*.7:.05,lh*.78,horiz?.05:(w-.03)*.7),MT(new THREE.Color(d.c||'#f5f5f2').multiplyScalar(.96),{roughness:.6}));
      pan.position.copy(leaf.position);pv.add(pan);
      const kn=new THREE.Mesh(new THREE.SphereGeometry(.035),MT('#b9b9b9',{metalness:.7,roughness:.3}));
      kn.position.set(horiz?sgn*(w-.12):0,1.0,horiz?.04:sgn*(w-.12));pv.add(kn);
      const ang=1.15*(horiz?(side==='N'?1:-1)*(d.h==='R'?-1:1):(side==='W'?1:-1)*(d.h==='R'?-1:1));
      pv.rotation.y=ang;wg.add(pv);
      const th=new THREE.Mesh(new THREE.BoxGeometry(horiz?w:T*1.7,.03,horiz?T*1.7:w),MT('#8a7a6a'));th.position.set(c.x,.02,c.z);th.userData={door:{rid:r.id,x:c.x,z:c.z,nx:o[0],nz:o[1]}};picks.push(th);wg.add(th);
      leaf.userData={door:{rid:r.id,x:c.x,z:c.z,nx:o[0],nz:o[1]}};picks.push(leaf);
     }else{
      const th=new THREE.Mesh(new THREE.BoxGeometry(horiz?w:T*1.7,.03,horiz?T*1.7:w),MT('#b08a62'));th.position.set(c.x,.02,c.z);
      th.userData={door:{rid:r.id,x:c.x,z:c.z,nx:o[0],nz:o[1]}};picks.push(th);wg.add(th);
     }
    }
   });
   piece(cur,len,0,HWALL);
   const bl=new THREE.Mesh(new THREE.BoxGeometry(horiz?len:T*1.25,.1,horiz?T*1.25:len),trim);
   const bc=at(len/2);bl.position.set(bc.x,.05,bc.z);wg.add(bl);
   walls.push({g:wg,x:base.x,z:base.z,nx:o[0],nz:o[1],ext:!interior});
  });
  /* 天花板 + 灯 */
  const ce=new THREE.Mesh(new THREE.BoxGeometry(r.w,.05,r.d),MT('#f8f8f6',{roughness:1}));ce.position.set(r.cx,2.62,r.cz);ceilG.add(ce);
  const lampM=new THREE.MeshBasicMaterial({color:0xfff8e6});
  const spot=(x,z,rad=.07)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,.02,16),lampM);m.position.set(x,2.595,z);ceilG.add(m)};
  const nx=Math.max(1,Math.round(r.w/1.6)),nz=Math.max(1,Math.round(r.d/1.6));
  if(r.id==='vr8'){ // 客厅：吊扇灯 + 吊灯 + 射灯
   const m=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.07,28),lampM);m.position.set(r.cx+.9,2.56,r.cz+1.6);ceilG.add(m);
   const ch=new THREE.Group();ch.position.set(r.cx-.6,2.45,r.cz-1.4);
   for(let k=0;k<6;k++){const a=k*Math.PI/3,arm=new THREE.Mesh(new THREE.BoxGeometry(.4,.02,.025),MT('#222'));arm.position.set(Math.cos(a)*.2,0,Math.sin(a)*.2);arm.rotation.y=-a;ch.add(arm);
    const b=new THREE.Mesh(new THREE.SphereGeometry(.045),lampM);b.position.set(Math.cos(a)*.4,-.04,Math.sin(a)*.4);ch.add(b)}
   ceilG.add(ch);
   for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)spot(r.cx-r.w/2+(i+.5)*r.w/nx,r.cz-r.d/2+(j+.5)*r.d/nz);
  }else if(/卫|厨/.test(r.name)){
   const m=new THREE.Mesh(new THREE.BoxGeometry(.6,.03,.6),lampM);m.position.set(r.cx,2.595,r.cz);ceilG.add(m);
  }else if(/过道|玄关/.test(r.name)){
   for(let j=0;j<Math.max(1,Math.round(r.d/1.3));j++)spot(r.cx,r.cz-r.d/2+(j+.5)*r.d/Math.max(1,Math.round(r.d/1.3)));
  }else{
   const m=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.05,24),lampM);m.position.set(r.cx,2.575,r.cz);ceilG.add(m);
  }
  const lb=label(r.name,{scale:.7,bg:'rgba(47,125,107,.9)',fg:'#fff'});lb.position.set(r.cx,.12,r.cz+(r.d>1.5?-r.d*.3:0));lb.renderOrder=11;lb.userData.room=r.id;grp.add(lb);
  rlabels.push(lb);
 }
 /* ---------- 装饰件 ---------- */
 function buildDeco(d){
  const g=new THREE.Group();g.position.set(d.x,(d.y||0)+.05,d.z);g.rotation.y=FACE_ROT[d.face||'S'];
  const w=d.w||.5,h=d.h||.5,dp=d.d||.5,c=d.c||'#cccccc';
  const bx=(W,H,D,col,x,y,z,o)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(W,H,D),MT(col,o));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};
  const cy=(r0,r1,H,col,x,y,z,o)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r0,r1,H,20),MT(col,o));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};
  const k=d.k;
  if(k==='tv'){bx(w,h,.05,'#0d0d0f',0,h/2,0,{roughness:.15,metalness:.4});bx(w-.05,h-.05,.01,'#16181d',0,h/2,.03,{roughness:.05,metalness:.2});bx(.3,.03,.03,'#222',0,-.01,0)}
  else if(k==='ac'){bx(w,h,dp,'#f4f4f2',0,h/2,0,{roughness:.4});bx(w-.1,.025,.02,'#bfc4c8',0,.05,dp/2);bx(w-.08,.01,.02,'#e9e9e6',0,h-.04,dp/2)}
  else if(k==='art'){bx(w+.06,h+.06,.04,'#c9b48a',0,h/2,0);bx(w,h,.045,c,0,h/2,.005);bx(w*.5,h*.18,.047,'#ffffff',-w*.1,h*.62,.005,{roughness:.6})}
  else if(k==='poster'){bx(w,h,.012,c,0,h/2,0)}
  else if(k==='mirror'){bx(w+.05,h+.05,.025,'#b9b5ab',0,h/2,0);bx(w,h,.03,'#a9c1cc',0,h/2,0,{roughness:.05,metalness:.6})}
  else if(k==='stool'){bx(w,.05,dp,c,0,h-.025,0);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>bx(.035,h,.035,c,a*(w/2-.04),h/2,b*(dp/2-.04)))}
  else if(k==='chair'){bx(w,.05,dp,c,0,.45,0);bx(w,.5,.04,c,0,.72,-dp/2+.03);bx(.05,.45,.05,'#aaa',0,.22,0);bx(.4,.03,.4,'#ccc',0,.02,0)}
  else if(k==='fan'){cy(.012,.012,h,'#e8e8e8',0,h/2,0);const m=new THREE.Mesh(new THREE.CylinderGeometry(w/2,w/2,.05,28),MT('#f7f7f7'));m.rotation.x=Math.PI/2;m.position.set(0,h,0);g.add(m);cy(.14,.16,.03,'#d9d9d9',0,.015,0)}
  else if(k==='bike'){
   const wm=MT('#1c1c1c');[-.5,.5].forEach(x=>{const t=new THREE.Mesh(new THREE.TorusGeometry(.26,.022,8,24),wm);t.rotation.y=Math.PI/2;t.position.set(0,.28,x);t.castShadow=true;g.add(t)});
   bx(.035,.035,1.0,'#f2f2f2',0,.5,0);bx(.035,.35,.035,'#f2f2f2',0,.35,.2);bx(.26,.06,.2,'#111',0,.74,.2);bx(.035,.5,.035,'#222',0,.72,-.45);bx(.4,.03,.03,'#222',0,.98,-.45);bx(.34,.25,.2,'#222',0,1.0,-.2)}
  else if(k==='toilet'){bx(.38,.38,.52,'#fafafa',0,.19,.06,{roughness:.25});bx(.37,.34,.18,'#fafafa',0,.55,-.2,{roughness:.25});bx(.36,.03,.5,'#f0f0f0',0,.4,.06)}
  else if(k==='tub'){bx(w,h,dp,'#e6dcc8',0,h/2,0);bx(w-.1,h*.8,dp-.1,'#f7f1e4',0,h/2+.04,0)}
  else if(k==='shower'){
   const gm='#bcd7e6',fm='#1c1c1c',o={transparent:true,opacity:.2,roughness:.05};
   bx(w,2.0,.02,gm,0,1.0,dp/2,o);bx(.02,2.0,dp,gm,w/2,1.0,0,o);
   bx(w,.04,.04,fm,0,2.0,dp/2);bx(.04,2.0,.04,fm,-w/2,1.0,dp/2);bx(.04,2.0,.04,fm,w/2,1.0,dp/2);bx(.04,.04,dp,fm,w/2,2.0,0);bx(.04,2.0,.04,fm,w/2,1.0,-dp/2);bx(w,.02,dp,'#8b8b8b',0,.01,0);
   cy(.01,.01,.3,'#bbb',-w*.2,1.75,-dp/2+.05,{metalness:.8});bx(.14,.03,.14,'#c9c9c9',-w*.2,1.92,-dp/2+.08,{metalness:.8})}
  else if(k==='washer'){bx(w,h,dp,'#d6d6d4',0,h/2,0,{metalness:.35,roughness:.4});const m=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.04,28),MT('#3b3f44',{metalness:.5}));m.rotation.x=Math.PI/2;m.position.set(0,h*.5,dp/2+.01);g.add(m);bx(.5,.07,.02,'#9aa0a6',0,h-.06,dp/2+.01)}
  else if(k==='rug'){bx(w,.012,dp,c,0,.008,0)}
  else if(k==='bench'){bx(w,h,dp,c,0,h/2,0);bx(w-.02,.05,dp+.02,'#efe7d8',0,h+.02,0)}
  else if(k==='lamp'){cy(.015,.015,h,'#444',0,h/2,0);cy(.12,.18,.2,c,0,h,0)}
  else if(k==='plant'){cy(.12,.09,.3,'#b87b5a',0,.15,0);const m=new THREE.Mesh(new THREE.SphereGeometry(.28,14,12),MT('#5a9a62'));m.position.set(0,.62,0);m.castShadow=true;g.add(m)}
  else{bx(w,h,dp,c,0,h/2,0)}
  g.traverse(o=>{if(o.isMesh&&k!=='tv'&&k!=='mirror')o.receiveShadow=true});
  grp.add(g);
 }
 /* ---------- 一件家具 ---------- */
 function buildFurn(f){
  const face=faceOf(f),NS=face==='N'||face==='S',Wf=NS?f.w:f.d,Df=NS?f.d:f.w,H=f.h,zf=Df/2;
  const rm0=roomById(f.roomId);let gx=f.x,gz=f.z;
  if(rm0&&f.kind!=='fence'){ // 贴墙放，但不能埋进墙里（墙厚 10cm）
   const hx=f.w/2,hz=f.d/2,m=.055;
   if(f.w+2*m<rm0.w)gx=Math.min(Math.max(gx,rm0.cx-rm0.w/2+m+hx),rm0.cx+rm0.w/2-m-hx);
   if(f.d+2*m<rm0.d)gz=Math.min(Math.max(gz,rm0.cz-rm0.d/2+m+hz),rm0.cz+rm0.d/2-m-hz);
  }
  const g=new THREE.Group();g.position.set(gx,.05,gz);g.rotation.y=FACE_ROT[face];
  const base=MT(f.color,{roughness:.7}),panelM=MT(new THREE.Color(f.color).multiplyScalar(1.05),{roughness:.55});
  const inner=MT(new THREE.Color(f.color).lerp(new THREE.Color('#efe6d4'),.7),{roughness:.9});
  const handleM=MT('#3b3b3b',{roughness:.35,metalness:.5});
  const edgeM=new THREE.LineBasicMaterial({color:0x4a4036,transparent:true,opacity:.5});
  const mats=[base,panelM],kind=f.kind||'cab';
  const tag=(m,cell)=>{m.userData=cell==null?{furnId:f.id}:{furnId:f.id,cell};picks.push(m)};
  const box=(w,h,d,m,x,y,z,pk=true,parent=g)=>{const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);me.position.set(x,y,z);me.castShadow=true;me.receiveShadow=true;parent.add(me);if(pk)tag(me);return me};
  const edges=(mesh)=>mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),edgeM));
  const cells=f.cells||[];
  const hollow=(kind==='cab'||kind==='glass'||kind==='fridge')&&cells.some(c=>c.k!=='top'&&(c.s||'F')==='F');
  if(kind==='bed'){
   const bedM=MT(f.c2||'#e9e6df',{roughness:.95});mats.push(bedM);
   [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>box(.06,.14,.06,base,a*(Wf/2-.05),.07,b*(Df/2-.05),false));
   box(Wf,.14,Df,base,0,.21,0);                                                // 床框
   box(Wf*.95,.2,Df*.95,MT('#f1efe9',{roughness:.9}),0,.38,.02,false);        // 床垫
   const du=box(Wf*.98,.1,Df*.72,bedM,0,.5,Df*.12,false);                      // 被子
   box(Wf*.98,.04,Df*.2,bedM,0,.58,Df*.3,false);                               // 被角翻折
   box(Wf,Math.max(.55,H+.15),.08,base,0,Math.max(.55,H+.15)/2,-zf+.04);       // 床头板
   const np=Wf>1.3?2:1;for(let i=0;i<np;i++)box(Wf*(np>1?.4:.7),.12,.34,MT('#ffffff',{roughness:1}),(np>1?(i?.24:-.24)*Wf:0),.6,-zf+.3,false);
  }else if(kind==='sofa'){
   box(Wf,.34,Df,base,0,.17,0);
   box(Wf*.94,.16,Df*.72,panelM,0,.42,Df*.1,false);
   box(Wf,.5,.2,base,0,.62,-zf+.1);box(.2,.5,Df,base,-Wf/2+.1,.5,0);box(.2,.5,Df,base,Wf/2-.1,.5,0);
   const cu=MT('#f08a2e',{roughness:.9});box(.4,.4,.14,cu,Wf*.2,.62,-zf+.28,false);
  }else if(kind==='table'||kind==='desk'){
   box(Wf,.045,Df,MT(f.color,{roughness:.25}),0,H-.022,0);
   const lm=MT(f.c2||'#2a2a2a',{roughness:.5});
   [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>box(.055,H,.055,lm,sx*(Wf/2-.06),H/2,sz*(Df/2-.06)));
   if(kind==='desk'){box(.55,.34,.03,MT('#111'),0,H+.25,-zf+.2,false);box(.05,.18,.05,MT('#111'),0,H+.1,-zf+.2,false);box(.38,.012,.14,MT('#222'),0,H+.012,-zf+.5,false);box(Wf*.9,.55,.22,MT('#efe3c6'),0,H+.3,-zf+.11,false)}
   else{const cm=MT('#3e4a44',{roughness:.8});
    [-.3,.3].forEach(k=>{[[0,Df/2+.32,0],[0,-Df/2-.32,Math.PI]].forEach(([_,z,rot])=>{
     const ch=new THREE.Group();ch.position.set(k*Wf,0,z);ch.rotation.y=rot;g.add(ch);
     box(.42,.05,.42,cm,0,.45,0,false,ch);box(.42,.45,.04,cm,0,.7,-.19,false,ch);
     [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>box(.03,.43,.03,MT('#222'),a*.18,.215,b*.18,false,ch))})});
    [-1,1].forEach(sx=>{const ch=new THREE.Group();ch.position.set(sx*(Wf/2+.32),0,0);ch.rotation.y=sx*Math.PI/2;g.add(ch);box(.42,.05,.42,cm,0,.45,0,false,ch);box(.42,.45,.04,cm,0,.7,-.19,false,ch)});
    box(.2,.1,.12,MT('#e8e0d0'),0,H+.05,0,false)}
  }else if(kind==='fence'){
   box(Wf,.03,Df,MT('#f0e4b8',{roughness:1}),0,.02,0,false);
   const fm=MT('#cfd3d6',{transparent:true,opacity:.65});mats.push(fm);
   box(Wf,H,.05,fm,0,H/2,-zf+.025);box(Wf,H,.05,fm,0,H/2,zf-.025);box(.05,H,Df,fm,-Wf/2+.025,H/2,0);box(.05,H,Df,fm,Wf/2-.025,H/2,0);
  }else if(kind==='pile'){
   [[0,0,.5,.6,.5,0xc9a37a],[.12,.5,.4,.4,.4,0xb87b5a],[-.18,.05,.3,.55,.35,0x9fb8c0],[.2,0.0,.25,.35,.3,0xd9d2bd]].forEach(([dx,y0,w,h,d,c],k)=>{
    const m=box(w*Wf/.8,h,d*Df/.8,MT(c,{roughness:.8}),dx*Wf,y0+h/2,(k%2?.1:-.1)*Df);mats.push(m.material)});
  }else if(hollow){
   /* 空心柜体：背板 + 两侧 + 顶底 + 隔板（每组格子的边界）+ 每格的门/抽屉 */
   const t=.022;
   box(Wf,H,.015,inner,0,H/2,-zf+.0075);
   box(t,H,Df,base,-Wf/2+t/2,H/2,0);box(t,H,Df,base,Wf/2-t/2,H/2,0);
   box(Wf,t,Df,base,0,t/2,0);box(Wf,t,Df,base,0,H-t/2,0);
   const gk=new Map();
   cells.forEach((c,i)=>{if(c.k==='top'||(c.s||'F')!=='F')return;const k=c.z||c.g||('i'+i);const o=gk.get(k)||{x0:9,x1:-9,y0:9,y1:-9};
    o.x0=Math.min(o.x0,c.x0);o.x1=Math.max(o.x1,c.x1);o.y0=Math.min(o.y0,c.y0);o.y1=Math.max(o.y1,c.y1);gk.set(k,o)});
   const hs=new Set(),vs=new Set();
   gk.forEach(o=>{
    [o.y0,o.y1].forEach(y=>{if(y>.01&&y<.99)hs.add(Math.round(y*1000)+':'+Math.round(o.x0*1000)+':'+Math.round(o.x1*1000))});
    [o.x0,o.x1].forEach(x=>{if(x>.01&&x<.99)vs.add(Math.round(x*1000)+':'+Math.round(o.y0*1000)+':'+Math.round(o.y1*1000))});
   });
   hs.forEach(s=>{const [y,a,b]=s.split(':').map(Number);box((b-a)/1000*Wf,t,Df-.03,base,((a+b)/2000-.5)*Wf,y/1000*H,.0,false)});
   vs.forEach(s=>{const [x,a,b]=s.split(':').map(Number);box(t,(b-a)/1000*H,Df-.03,base,(x/1000-.5)*Wf,((a+b)/2000)*H,.0,false)});
   if(kind==='fridge'){const hm=MT('#9aa0a6',{metalness:.8,roughness:.3});[-.04,.04].forEach(dx=>box(.02,.55,.03,hm,dx*Wf*5,H*.62,zf+.04,false))}
  }else{
   box(Wf,H,Df,base,0,H/2,0);
  }
  /* 格子：门 / 抽屉 / 开放格 / 台面 */
  const grpIdx=new Map();
  cells.forEach((c,idx)=>{const k=c.z||c.g||('i'+idx);if(!grpIdx.has(k))grpIdx.set(k,[]);grpIdx.get(k).push(idx)});
  cells.forEach((c,idx)=>{
   const side=c.s||'F',W2=side==='F'?Wf:Df,D2=side==='F'?Df:Wf,zf2=D2/2;
   const key=f.id+':'+idx,gap=.012,cw=(c.x1-c.x0)*W2,ch=(c.y1-c.y0)*H,cx=((c.x0+c.x1)/2-.5)*W2,cy=((c.y0+c.y1)/2)*H;
   const pg=new THREE.Group();g.add(pg);if(side==='R')pg.rotation.y=Math.PI/2;else if(side==='L')pg.rotation.y=-Math.PI/2;
   const tagc=m=>{m.userData={furnId:f.id,cell:idx};picks.push(m)};
   const info={key,k:c.k,open:openCells.has(key),t:openCells.has(key)?1:0,v:0,hinge:c.h||'L',slide:Math.min(D2*.78,.6),furnId:f.id,idx};
   if(c.k==='top'){
    const sl=new THREE.Mesh(new THREE.PlaneGeometry(Wf*.92,Df*.92),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    sl.rotation.x=-Math.PI/2;sl.position.set(0,H+.015,0);g.add(sl);tagc(sl);
    const ring=new THREE.Mesh(new THREE.RingGeometry(Math.min(Wf,Df)*.14,Math.min(Wf,Df)*.18,28),new THREE.MeshBasicMaterial({color:0x2f7d6b,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.set(0,H+.02,0);g.add(ring);
   }else{
    if(!hollow||side!=='F'){ // 没有空心柜体时，给格子垫一块深色凹面
     const rec=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(.02,cw-gap*2),Math.max(.02,ch-gap*2)),MT('#2e2a26',{roughness:1}));
     rec.position.set(cx,cy,zf2+.002);pg.add(rec);if(c.k==='open')tagc(rec);
    }
    if(c.k==='open'){
     const hit=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(.02,cw-gap*2),Math.max(.02,ch-gap*2)),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
     hit.position.set(cx,cy,zf2+.004);pg.add(hit);tagc(hit);
    }else if(c.k==='door'){
     const hx=c.h==='R'?cx+cw/2-gap/2:cx-cw/2+gap/2;
     const pivot=new THREE.Group();pivot.position.set(hx,cy,zf2+.013);pg.add(pivot);
     const pm=new THREE.Mesh(new THREE.BoxGeometry(cw-gap,ch-gap,.024),panelM);pm.castShadow=true;
     pm.position.set((c.h==='R'?-1:1)*(cw-gap)/2,0,0);pivot.add(pm);edges(pm);tagc(pm);
     const hh=Math.min(.3,ch*.4);
     const hd=new THREE.Mesh(new THREE.BoxGeometry(.016,hh,.028),handleM);
     hd.position.set((c.h==='R'?-1:1)*(cw-gap-.05),0,.025);pivot.add(hd);
     info.pivot=pivot;
    }else if(c.k==='drawer'){
     const sg=new THREE.Group();sg.position.set(cx,cy,zf2+.014);pg.add(sg);
     const pm=new THREE.Mesh(new THREE.BoxGeometry(cw-gap,ch-gap,.028),panelM);pm.castShadow=true;sg.add(pm);edges(pm);tagc(pm);
     const hd=new THREE.Mesh(new THREE.BoxGeometry(Math.min(.3,cw*.32),.018,.03),handleM);hd.position.set(0,ch*.1,.028);sg.add(hd);
     // 抽屉盒：底 + 四边，拉出来能看到
     const dd=Math.max(.15,D2*.78),dh=Math.max(.05,ch*.7),tray=MT('#e9e0cf',{roughness:.9});
     const tb=(w,h,d,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),tray);m.position.set(x,y,z);sg.add(m)};
     tb(cw-.05,.012,dd,0,-ch/2+.04,-dd/2-.014);tb(.012,dh,dd,-(cw-.05)/2,-ch/2+.04+dh/2,-dd/2-.014);tb(.012,dh,dd,(cw-.05)/2,-ch/2+.04+dh/2,-dd/2-.014);
     tb(cw-.05,dh,.012,0,-ch/2+.04+dh/2,-dd-.014);
     info.slideG=sg;info.baseZ=zf2+.014;info.trayW=cw-.07;info.trayD=dd;info.trayY=-ch/2+.048;
    }
   }
   info.pg=pg;info.W2=W2;info.D2=D2;info.zf2=zf2;
   infos.push(info);
  });
  /* 每组格子对应一张照片：门/开放格 → 贴在柜体最里面（开门就看到）；抽屉 → 平放在抽屉底；台面 → 立牌 */
  grpIdx.forEach((idxs,key)=>{
   const zid=cells[idxs[0]].z,im=zid&&zonePhoto(zid);if(!im)return;
   const cs=idxs.map(i=>cells[i]),x0=Math.min(...cs.map(c=>c.x0)),x1=Math.max(...cs.map(c=>c.x1)),y0=Math.min(...cs.map(c=>c.y0)),y1=Math.max(...cs.map(c=>c.y1));
   const first=infos.find(n=>n.furnId===f.id&&n.idx===idxs[0]),side=cs[0].s||'F',W2=side==='F'?Wf:Df,zf2=(side==='F'?Df:Wf)/2;
   const k0=cs[0].k,isTop=cs.every(c=>c.k==='top'),w=(x1-x0)*W2-.05,h=(y1-y0)*H-.05;
   let pm;
   if(isTop){pm=photoMesh(im,.6,.6*1.78);pm.position.set(0,H+.35+.53,0);g.add(pm)}
   else if(k0==='drawer'){
    pm=photoMesh(im,Math.max(.1,first.trayW),Math.max(.1,first.trayD-.03));
    pm.rotation.x=-Math.PI/2;pm.position.set(0,first.trayY+.01,-first.trayD/2-.014);first.slideG.add(pm);
   }else{
    pm=photoMesh(im,Math.max(.1,w),Math.max(.1,h));
    const back=hollow&&side==='F'?-zf2+.03:zf2+.005;
    pm.position.set(((x0+x1)/2-.5)*W2,((y0+y1)/2)*H,back);first.pg.add(pm);
   }
   const hidden=isTop||k0==='open';
   const members=idxs.map(i=>infos.find(n=>n.furnId===f.id&&n.idx===i));
   const upd=()=>{if(hidden)pm.visible=members.some(m=>m&&m.open)};
   members.forEach(m=>{if(m)(m.photoUpd=m.photoUpd||[]).push(upd)});upd();
  });
  const nz=zonesInFurn(f.id).length,ni=itemsInFurn(f.id).filter(i=>!i.zoneId).length;
  const sub=(nz?nz+'区':'')+(nz&&ni?' ':'')+(ni?ni+'件':'');
  const lb=label(f.name+(sub?' · '+sub:''),{scale:.6});lb.position.set(gx,.05+f.h+.25,gz);
  return {g,mats,lb};
 }
 function rebuild(){
  if(!R)return;
  while(grp.children.length){const o=grp.children.pop();o.traverse?.(c=>{if(c.geometry)c.geometry.dispose()})}
  while(ceilG.children.length){const o=ceilG.children.pop();o.traverse?.(c=>{if(c.geometry)c.geometry.dispose()})}
  furnG={};meshR={};picks=[];infos=[];lbs=[];walls=[];rlabels=[];
  S.rooms.forEach(buildRoom);
  (S.deco||[]).forEach(buildDeco);
  S.furn.forEach(f=>{const b=buildFurn(f);grp.add(b.g);grp.add(b.lb);b.lb.visible=false;lbs.push({sp:b.lb,fid:f.id});furnG[f.id]=b});
  if(mode==='room'&&curRoom){const r=roomById(curRoom);if(r)roomLight.position.set(r.cx,2.3,r.cz)}
 }
 /* ---------- 拾取 ---------- */
 function setRay(e){const rc=$('#cv').getBoundingClientRect();mouse.set((e.clientX-rc.left)/rc.width*2-1,-((e.clientY-rc.top)/rc.height)*2+1);ray.setFromCamera(mouse,cam)}
 function pick(e){
  setRay(e);
  let hits=ray.intersectObjects(picks,false);
  if(mode==='room'){ // 墙挡住的东西不能点
   const wm=[];walls.forEach(w=>{if(w.g.children)w.g.children.forEach(c=>{if(c.isMesh&&!c.userData.door)wm.push(c)})});
   const wh=ray.intersectObjects(wm,false)[0];
   if(wh)hits=hits.filter(h=>h.distance<wh.distance);
  }
  const fh=hits[0];
  if(fh){
   const u=fh.object.userData;
   if(u.door)return {t:'door',door:u.door,pt:fh.point};
   return {t:'furn',id:u.furnId,cell:u.cell,pt:fh.point};
  }
  const rh=ray.intersectObjects(Object.values(meshR))[0];
  if(rh)return {t:'room',id:rh.object.userData.roomId,pt:rh.point};
  return null;
 }
 function planePt(e){setRay(e);const p=new THREE.Vector3();return ray.ray.intersectPlane(ground,p)?p:null}
 const tip=()=>$('#tip');
 let hoverBusy=0;
 function onHover(e){
  if(down||drag)return;
  const now=performance.now();if(now-hoverBusy<70)return;hoverBusy=now;
  const h=pick(e),tp=tip();if(!tp)return;
  let txt='',cur='';
  if(h&&h.t==='furn'){
   const f=furnById(h.id);hoverKey=h.id;
   if(h.cell!=null&&f.cells&&f.cells[h.cell]){const c=f.cells[h.cell],z=c.z?zoneById(c.z):null;
    txt=`${f.name} · ${z?z.name:'这格还没记'}　<small>${openCells.has(f.id+':'+h.cell)?'点一下关上':'点一下打开'}</small>`;cur='pointer'}
   else txt=f.name;
  }else if(h&&h.t==='door'){hoverKey=null;txt='🚪 点一下走过去';cur='pointer'}
  else if(h&&h.t==='room'){hoverKey=null;const r=roomById(h.id);txt=mode==='room'?'点地面走过去':`${r.name}　<small>双击走进去</small>`;cur=mode==='room'?'crosshair':'pointer'}
  else{hoverKey=null}
  $('#cv').style.cursor=cur||(mode==='room'?'grab':'');
  if(txt){const rc=$('#stage').getBoundingClientRect();tp.innerHTML=txt;tp.style.display='block';tp.style.left=Math.min(rc.width-20,e.clientX-rc.left+14)+'px';tp.style.top=(e.clientY-rc.top+16)+'px'}
  else tp.style.display='none';
 }
 /* ---------- 在房间里走 ---------- */
 const yawTo=(dx,dz)=>Math.atan2(dx,-dz);
 const inRoom=(r,x,z,m=0)=>Math.abs(x-r.cx)<=r.w/2-m&&Math.abs(z-r.cz)<=r.d/2-m;
 const roomAt=(x,z)=>S.rooms.find(r=>inRoom(r,x,z,.0));
 function blocked(x,z){
  return S.furn.some(f=>f.roomId===curRoom&&f.kind!=='fence'&&Math.abs(x-f.x)<f.w/2+.25&&Math.abs(z-f.z)<f.d/2+.25);
 }
 function walkTo(x,z){
  const r=roomById(curRoom);if(!r||transit)return;
  x=Math.max(r.cx-r.w/2+.32,Math.min(r.cx+r.w/2-.32,x));z=Math.max(r.cz-r.d/2+.32,Math.min(r.cz+r.d/2-.32,z));
  let tx=eye.x,tz=eye.z;const steps=24;
  for(let i=1;i<=steps;i++){const px=eye.x+(x-eye.x)*i/steps,pz=eye.z+(z-eye.z)*i/steps;if(blocked(px,pz)&&!blocked(eye.x,eye.z))break;tx=px;tz=pz}
  const sx=eye.x,sz=eye.z,dist=Math.hypot(tx-sx,tz-sz);if(dist<.05)return;
  const dur=Math.max(350,dist/1.6*1000);
  tweens.length=0;
  addTween(dur,u=>{eye.x=sx+(tx-sx)*u;eye.z=sz+(tz-sz)*u},null,u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2);
 }
 function turnTo(yaw,pitch,dur=500){
  const y0=eye.yaw,p0=eye.pitch;let dy=yaw-y0;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;
  addTween(dur,u=>{eye.yaw=y0+dy*u;eye.pitch=p0+(pitch-p0)*u});
 }
 function stepMove(fwd,right){
  const nx=eye.x+Math.sin(eye.yaw)*fwd+Math.cos(eye.yaw)*right,nz=eye.z-Math.cos(eye.yaw)*fwd+Math.sin(eye.yaw)*right;
  walkTo(nx,nz);
 }
 function goDoor(d){
  if(transit)return;
  const T=V(d.x+d.nx*1.0,0,d.z+d.nz*1.0),nb=roomAt(T.x,T.z);
  if(!nb||nb.id===curRoom)return;
  const sx=eye.x,sz=eye.z,ex=T.x,ez=T.z,dist=Math.hypot(ex-sx,ez-sz);
  const yaw1=yawTo(d.nx,d.nz),y0=eye.yaw;let dy=yaw1-y0;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;
  tweens.length=0;transit=true;
  addTween(Math.max(700,dist/1.5*1000),u=>{eye.x=sx+(ex-sx)*u;eye.z=sz+(ez-sz)*u;eye.yaw=y0+dy*Math.min(1,u*1.6);applyEye()},()=>{
   transit=false;curRoom=nb.id;roomLight.position.set(nb.cx,2.3,nb.cz);SEL={t:'room',id:nb.id};renderSide();api.onMode&&api.onMode();
  });
 }
 /* ---------- 进入 / 离开 / 换房间 ---------- */
 function entryFor(r){
  const ds=(r.doors||[]).filter(d=>d.t!=='open');const d=ds[0]||(r.doors||[])[0];
  if(!d)return {x:r.cx,z:r.cz+r.d*.25,out:{x:r.cx,z:r.cz+r.d/2+1.2}};
  const horiz=d.s==='N'||d.s==='S',o=OUT[d.s],len=horiz?r.w:r.d;
  const dx=horiz?r.cx-r.w/2+d.p*len:r.cx+o[0]*r.w/2,dz=horiz?r.cz+o[1]*r.d/2:r.cz-r.d/2+d.p*len;
  const m=Math.min(.9,(horiz?r.d:r.w)*.3);
  return {x:dx-o[0]*m,z:dz-o[1]*m,out:{x:dx+o[0]*1.2,z:dz+o[1]*1.2}};
 }
 function enterRoom(id,faceFurn){
  const r=roomById(id);if(!r||transit)return;
  tweens.length=0;
  const en=entryFor(r),to=V(en.x,1.55,en.z),from=cam.position.clone();
  const wasRoom=mode==='room';
  curRoom=id;SEL={t:'room',id};SELCELL=null;
  const yaw=faceFurn?yawTo(faceFurn.x-en.x,faceFurn.z-en.z):yawTo(r.cx-en.x,r.cz-en.z);
  const lookTo=V(en.x+Math.sin(yaw)*3,1.35,en.z-Math.cos(yaw)*3);
  roomLight.position.set(r.cx,2.3,r.cz);roomLight.intensity=.7;
  const lookFrom=curLook();
  mode='room';ctl.enabled=false;
  const fin=()=>{eye.x=en.x;eye.z=en.z;eye.yaw=yaw;eye.pitch=-.05;eye.fov=72;transit=false;applyEye();renderSide();api.onMode&&api.onMode()};
  if(wasRoom){
   fly({from,via1:V(from.x,5.2,from.z),via2:V(en.x,5.2,en.z),to,lookFrom,lookTo,fovFrom:cam.fov,fovTo:72,dur:2000,done:fin});
  }else{
   fly({from,via1:from.clone().lerp(V(en.out.x,3,en.out.z),.45).setY(Math.max(4,from.y*.6)),via2:V(en.out.x,1.7,en.out.z),to,lookFrom,lookTo,fovFrom:cam.fov,fovTo:72,dur:2100,done:fin});
  }
  api.onMode&&api.onMode();
 }
 function exitRoom(){
  if(mode!=='room'||transit)return;
  const r=roomById(curRoom)||S.rooms[0];tweens.length=0;
  const t=V(r.cx,0,r.cz),s=Math.max(r.w,r.d),to=t.clone().add(V(0,s*1.3+3.2,s*.9+3.8)),from=cam.position.clone();
  const lookFrom=curLook();
  mode='dollhouse';roomLight.intensity=0;
  fly({from,via1:from.clone().add(V(0,2.5,0)),via2:to.clone().lerp(from,.25).setY(to.y+1),to,lookFrom,lookTo:t,fovFrom:cam.fov,fovTo:42,dur:1700,done:()=>{
   cam.fov=42;cam.updateProjectionMatrix();ctl.target.copy(t);cam.position.copy(to);ctl.enabled=true;ctl.update();api.onMode&&api.onMode()}});
  api.onMode&&api.onMode();
 }
 /* ---------- 指针 / 键盘 ---------- */
 function onDown(e){
  down={x:e.clientX,y:e.clientY,moved:false,lx:e.clientX,ly:e.clientY,t:performance.now()};
  const a=audio();if(a&&a.state==='suspended')a.resume();
  if(mode==='room'){look={};return}
  if(!EDIT)return;
  const h=pick(e);if(!h||h.t==='door')return;
  const p=planePt(e);if(!p)return;
  ctl.enabled=false;
  if(h.t==='furn'){const f=furnById(h.id);drag={t:'furn',id:h.id,ox:f.x-p.x,oz:f.z-p.z};SEL={t:'furn',id:h.id}}
  else{const r=roomById(h.id);drag={t:'room',id:h.id,ox:r.cx-p.x,oz:r.cz-p.z,last:{x:r.cx,z:r.cz}};SEL={t:'room',id:h.id}}
 }
 const snap=v=>Math.round(v*20)/20;
 function onMove(e){
  if(down&&(Math.abs(e.clientX-down.x)+Math.abs(e.clientY-down.y))>5)down.moved=true;
  if(mode==='room'&&down&&look&&!transit&&down.moved){
   const dx=e.clientX-down.lx,dy=e.clientY-down.ly;down.lx=e.clientX;down.ly=e.clientY;
   eye.yaw-=dx*.0042*(eye.fov/72);eye.pitch=Math.max(-1.25,Math.min(1.25,eye.pitch+dy*.0034*(eye.fov/72)));
   $('#cv').style.cursor='grabbing';return;
  }
  if(!drag)return;
  const p=planePt(e);if(!p)return;
  if(drag.t==='furn'){const f=furnById(drag.id);f.x=snap(p.x+drag.ox);f.z=snap(p.z+drag.oz);const b=furnG[f.id];if(b){b.g.position.set(f.x,.05,f.z);b.lb.position.set(f.x,.05+f.h+.25,f.z)}}
  else{const r=roomById(drag.id),nx=snap(p.x+drag.ox),nz=snap(p.z+drag.oz),dx=nx-r.cx,dz=nz-r.cz;
   if(dx||dz){r.cx=nx;r.cz=nz;S.furn.filter(f=>f.roomId===r.id).forEach(f=>{f.x=+(f.x+dx).toFixed(3);f.z=+(f.z+dz).toFixed(3)});(S.deco||[]).filter(d=>d.roomId===r.id).forEach(d=>{d.x=+(d.x+dx).toFixed(3);d.z=+(d.z+dz).toFixed(3)});drag.moved=true;rebuild()}}
 }
 let lastClick=0;
 function onUp(e){
  if(drag){
   if(drag.t==='furn'){const f=furnById(drag.id);
    const r=S.rooms.find(r=>Math.abs(f.x-r.cx)<=r.w/2&&Math.abs(f.z-r.cz)<=r.d/2);if(r)f.roomId=r.id;}
   drag=null;ctl.enabled=true;save();rebuild();renderSide();renderHead();return;
  }
  if(down&&!down.moved&&e.target===$('#cv')){
   const h=pick(e),prev=SEL&&SEL.t==='furn'?SEL.id:null,now=performance.now(),dbl=now-lastClick<380;lastClick=now;
   if(mode==='room'){
    if(h&&h.t==='furn'){
     SEL={t:'furn',id:h.id};
     if(h.cell!=null){SELCELL={fid:h.id,idx:h.cell};toggle(h.id,h.cell)}else SELCELL=null;
     renderSide();
    }else if(h&&h.t==='door')goDoor(h.door);
    else if(h&&h.t==='room'){walkTo(h.pt.x,h.pt.z)}
   }else{
    if(h&&h.t==='furn'){
     SEL={t:'furn',id:h.id};
     if(h.cell!=null&&!EDIT){SELCELL={fid:h.id,idx:h.cell};toggle(h.id,h.cell)}else SELCELL=null;
     if(prev!==h.id)focusFurn(h.id);
    }else if(h&&h.t==='room'){
     const same=SEL&&SEL.t==='room'&&SEL.id===h.id;SEL={t:'room',id:h.id};SELCELL=null;
     if(dbl&&same&&!EDIT){down=null;look=null;enterRoom(h.id);return}
     focusRoom(h.id);
    }else{SEL=null;SELCELL=null}
    if(Q){Q='';$('#q').value='';hl={furn:new Set()}}
    renderSide();api.onMode&&api.onMode();
   }
  }
  down=null;look=null;
  if(mode==='room')$('#cv').style.cursor='grab';
 }
 function onWheel(e){
  if(mode!=='room')return;
  e.preventDefault();
  if(e.ctrlKey||e.metaKey){eye.fov=Math.max(40,Math.min(100,eye.fov+e.deltaY*.05));return}
  if(transit)return;
  stepMove(e.deltaY<0?.5:-.5,0);
 }
 function onKey(e){
  const tg=e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT')return;
  if(e.key==='Escape'&&mode==='room'&&!$('#modal').classList.contains('on')){exitRoom();return}
  if(mode!=='room'||transit)return;
  const k=e.key.toLowerCase();
  if(k==='w'||k==='arrowup'){e.preventDefault();stepMove(.6,0)}
  else if(k==='s'||k==='arrowdown'){e.preventDefault();stepMove(-.6,0)}
  else if(k==='a'){stepMove(0,-.6)}else if(k==='d'){stepMove(0,.6)}
  else if(k==='arrowleft'||k==='q'){turnTo(eye.yaw-.5,eye.pitch,260)}
  else if(k==='arrowright'||k==='e'){turnTo(eye.yaw+.5,eye.pitch,260)}
 }
 /* ---------- 柜门 ---------- */
 function groupOf(fid,idx){
  const f=furnById(fid);if(!f||!f.cells)return [idx];
  const c=f.cells[idx],k=c.z||c.g;if(!k)return [idx];
  return f.cells.map((x,i)=>(x.z||x.g)===k?i:-1).filter(i=>i>=0);
 }
 function toggle(fid,idx){
  const idxs=groupOf(fid,idx),key=fid+':'+idx,willOpen=!openCells.has(key);
  let kind='door';
  idxs.forEach(i=>{const k=fid+':'+i;if(willOpen)openCells.add(k);else openCells.delete(k);
   const inf=infos.find(n=>n.key===k);if(inf){inf.open=willOpen;if(inf.k==='drawer')kind='drawer';(inf.photoUpd||[]).forEach(u=>u())}});
  sound(kind);
 }
 /* ---------- 镜头 ---------- */
 function focusFurn(id){
  const f=furnById(id);if(!f||transit)return;
  if(mode==='room'){const r=roomById(f.roomId);if(r&&r.id!==curRoom)enterRoom(r.id,f);else{turnTo(yawTo(f.x-eye.x,f.z-eye.z),-.05,600)}return}
  const fv={S:[0,0,1],N:[0,0,-1],E:[1,0,0],W:[-1,0,0]}[faceOf(f)],t=V(f.x,Math.min(1,f.h*.5),f.z);
  const dist=Math.max(3.0,Math.max(f.w,f.d)*1.7),to=V(f.x+fv[0]*dist,f.h*.5+dist*.55+.4,f.z+fv[2]*dist);
  smoothTo(to,t,900);
 }
 function focusRoom(id){
  const r=roomById(id);if(!r||transit)return;
  if(mode==='room'){if(id!==curRoom)enterRoom(id);return}
  const t=V(r.cx,0,r.cz),s=Math.max(r.w,r.d);
  smoothTo(t.clone().add(V(0,s*1.3+3,s*.9+3.5)),t,900);
 }
 function preset(k){
  if(!S.rooms.length)return;
  if(mode==='room'){exitRoom();return}
  const x0=Math.min(...S.rooms.map(r=>r.cx-r.w/2)),x1=Math.max(...S.rooms.map(r=>r.cx+r.w/2)),z0=Math.min(...S.rooms.map(r=>r.cz-r.d/2)),z1=Math.max(...S.rooms.map(r=>r.cz+r.d/2));
  const c=V((x0+x1)/2,0,(z0+z1)/2),span=Math.max(x1-x0,z1-z0);
  smoothTo(k==='top'?c.clone().add(V(0,span*1.25+2,.01)):c.clone().add(V(0,span*.95+3,span*.8+3)),c,1000);
 }
 function smoothTo(pos,target,dur){
  const p0=cam.position.clone(),t0=ctl.target.clone();
  tweens.length=0;
  addTween(dur,u=>{
   cam.position.lerpVectors(p0,pos,u);cam.position.y+=Math.sin(u*Math.PI)*Math.min(2,p0.distanceTo(pos)*.08);
   ctl.target.lerpVectors(t0,target,u);
  });
 }
 function setWall(m){WALLMODE=m;try{localStorage.setItem('jd_wall',m)}catch(_){}}
 function setMute(m){MUTED=m;try{localStorage.setItem('jd_mute',m?'1':'0')}catch(_){}}
 const api={init,resize,rebuild,focusFurn,focusRoom,preset,toggle,setWall,setMute,enterRoom,exitRoom,highlight:h=>{hl=h},
  get mode(){return mode},get curRoom(){return curRoom},get cam(){return cam},get ctl(){return ctl},get eye(){return eye},get scene(){return scene},onMode:null};
 return api;
})();

/* ============ 启动 ============ */
(async()=>{
 V3.init();
 let st=null;try{st=await DB.get('state')}catch(_){}
 S=st||demo();
 S.zones=S.zones||[];S.settings=Object.assign({idleDays:90,tidyEvery:30,snapDays:90},S.settings);S.roomTidy=S.roomTidy||{};S.tidyLog=S.tidyLog||[];
 if(!st)save();
 const fr=document.createElement('input');fr.type='file';fr.accept='image/*';fr.id='reshoot';fr.style.display='none';document.body.append(fr);
 try{Sync.base=await DB.get('base')}catch(_){}
 Sync.init();
 V3.onMode=()=>{renderToolbar();if(VIEW==='home')renderSide()};
 renderToolbar();renderAll();V3.resize();V3.preset('iso');
 if(Sync.code){Sync.run();setInterval(()=>{if(!document.hidden)Sync.run()},45000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)Sync.run()})}
 window.JD={get S(){return S},renderAll,setView,V3};
})();
})();
