const BASE=[];
const CATEGORIES=['Все','События','Выставки','Дизайн','Ресейл','Магазины','Спорт','Кофе','Еда и бары','Районы','Природа'];
const PROGRESS_KEY='bkk-curated-2026-checklist-v1',FEED_KEY='bkk-curated-feed-url-v2',CACHE_KEY='bkk-curated-feed-cache-v2',ORIGIN_KEY='bkk-curated-origin-v2';
const O0='TRIBE Living Bangkok Sukhumvit 39, 122 Soi Sukhumvit 39, Bangkok, Thailand';
const S={cat:'Все',query:'',area:'',date:'',hide:false,priority:false,newOnly:false,planned:false,rejected:false,sort:'rank'};
let progress={fav:[],planned:[],visited:[],seen:[],rejected:[],rejectedMeta:{}},incoming=[],origin=O0,feedUrl='./updates.json',lastSynced='';
const el=id=>document.getElementById(id);const h=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getLS(k){try{return localStorage.getItem(k)}catch(e){return null}}
function putLS(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function safeLink(u){if(!u)return '';try{let p=new URL(u,location.href);return ['https:','http:'].includes(p.protocol)?p.href:''}catch(e){return ''}}
function pathFeed(s){return s==='./updates.json'||/^https:\/\//.test(s)}
const cleanIds=a=>Array.isArray(a)?[...new Set(a.filter(x=>typeof x==='string'&&/^[a-z0-9_-]{2,65}$/.test(x)))]:[];
function unifyStars(p){
  const starred=cleanIds([...(p.fav||[]),...(p.planned||[])]).filter(id=>!p.rejected.includes(id));
  p.fav=starred;p.planned=starred.filter(id=>!p.visited.includes(id));
  const newPicked=starred.filter(id=>{const x=items().find(x=>x.id===id);return x&&(x.new||x.addedAt)});
  p.seen=cleanIds([...(p.seen||[]),...newPicked]);
  return p;
}
function initSaved(){try{const p=JSON.parse(getLS(PROGRESS_KEY));if(Array.isArray(p?.fav)&&Array.isArray(p?.visited))progress={fav:cleanIds(p.fav),planned:cleanIds(p.planned),visited:cleanIds(p.visited),seen:cleanIds(p.seen),rejected:cleanIds(p.rejected),rejectedMeta:p.rejectedMeta&&typeof p.rejectedMeta==='object'&&!Array.isArray(p.rejectedMeta)?p.rejectedMeta:{}}}catch(e){};origin=(!getLS(ORIGIN_KEY)||getLS(ORIGIN_KEY)==='Sukhumvit 39, Bangkok, Thailand')?O0:getLS(ORIGIN_KEY);feedUrl=getLS(FEED_KEY)||'./updates.json';try{const f=JSON.parse(getLS(CACHE_KEY));incoming=validFeed(f)}catch(e){};el('feedUrl').value=feedUrl==='./updates.json'?'':feedUrl;el('originInput').value=origin;el('feedSource').textContent=feedUrl;unifyStars(progress);putLS(PROGRESS_KEY,JSON.stringify(progress));}
const fs=iso=>{if(!iso)return '';const m=['','янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];let a=iso.split('-');return Number(a[2])+' '+m[Number(a[1])]};
const dateLabel=x=>!x.dates?'Постоянное место':x.days?.length?x.days.map(fs).join(', '):x.dates[0]===x.dates[1]?fs(x.dates[0]):fs(x.dates[0])+' — '+fs(x.dates[1]);
const liveOn=(x,day)=>!day||!x.dates||(x.days?.length?x.days.includes(day):x.dates[0]<=day&&x.dates[1]>=day);
function validFeed(o){if(!o||o.version!==1||!Array.isArray(o.items))throw Error('Формат updates.json неверен');return o.items.filter(x=>x&&typeof x.id==='string'&&/^[a-z0-9_-]{2,65}$/.test(x.id)&&typeof x.title==='string'&&x.title.length<200&&CATEGORIES.includes(x.kind)&&x.kind!=='Все'&&typeof x.area==='string').map(x=>({...x,id:x.id,title:x.title.slice(0,160),blurb:String(x.blurb||'').slice(0,800),source:String(x.source||'источник'),notes:String(x.notes||'').slice(0,400),url:safeLink(x.url),venue:String(x.venue||'').slice(0,300),mapQuery:String(x.mapQuery||'').slice(0,250),addedAt:/^20\d\d-\d\d-\d\d$/.test(x.addedAt)?x.addedAt:'',dates:Array.isArray(x.dates)&&x.dates.length===2?x.dates:null,days:Array.isArray(x.days)?x.days:null,priority:Number.isFinite(x.priority)?x.priority:2,eta:(Number.isFinite(x.eta?.min)&&Number.isFinite(x.eta?.max)&&x.eta?.via)?x.eta:{min:null,max:null,via:'Время уточняется для новой площадки'},status:x.status==='cancelled'?'cancelled':'active',new:true}));}
function items(){let z=new Map(BASE.map(x=>[x.id,x]));for(let x of incoming)z.set(x.id,{...z.get(x.id),...x});return [...z.values()]}
function isNew(x){return (x.new||x.addedAt)&&!progress.seen.includes(x.id)}
function markSeen(id){progress.seen=[...new Set([...progress.seen,id])];save();draw()}
function toggleStar(id){
  if(progress.rejected.includes(id))return;
  const active=progress.fav.includes(id)||progress.planned.includes(id);
  progress.fav=progress.fav.filter(x=>x!==id);progress.planned=progress.planned.filter(x=>x!==id);
  if(!active){
    progress.fav.push(id);
    if(!progress.visited.includes(id))progress.planned.push(id);
    if(isNew(items().find(x=>x.id===id)||{}))progress.seen=[...new Set([...progress.seen,id])];
  }
  save();draw();
}
function save(){putLS(PROGRESS_KEY,JSON.stringify(progress));captureGhChanges()}
function reject(id){let x=items().find(x=>x.id===id);if(!x)return;progress.fav=progress.fav.filter(p=>p!==id);progress.planned=progress.planned.filter(p=>p!==id);progress.rejected=[...new Set([...progress.rejected,id])];progress.rejectedMeta[id]={title:x.title,kind:x.kind,area:x.area,reason:'Не интересует',note:'',hiddenAt:new Date().toISOString()};save();draw()}
function restore(id){progress.rejected=progress.rejected.filter(x=>x!==id);delete progress.rejectedMeta[id];save();draw()}
const reasons=['Не интересует','Скучно','Не нравится ассортимент','Слишком далеко','Слишком дорого','Уже был','Другое'];
function rejections(){let catalog=new Map(items().map(x=>[x.id,x]));return progress.rejected.map(id=>{let meta=progress.rejectedMeta[id]||{},place=catalog.get(id)||{};return {id,title:String(meta.title||place.title||id),kind:String(meta.kind||place.kind||''),area:String(meta.area||place.area||''),reason:reasons.includes(meta.reason)?meta.reason:'Не интересует',note:String(meta.note||'')}})}
function rejectionText(){let lines=rejections().map(x=>'- '+x.title+' ('+x.kind+(x.area?', '+x.area:'')+'): '+x.reason+(x.note?'; '+x.note:''));return 'Обнови мой профиль путешественника: больше не рекомендуй перечисленные ниже места и события. Причины указаны отдельно; не считай, что отказ от одного места означает отказ от всей категории.\n\n'+lines.join('\n')}
function download(text,name,mime){let blob=new Blob([text],{type:mime}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function copyFeedback(){let content=rejectionText();try{if(!navigator.clipboard?.writeText)throw Error('No clipboard');await navigator.clipboard.writeText(content)}catch(e){let ta=document.createElement('textarea');ta.value=content;ta.style.position='fixed';ta.style.left='-9999px';document.body.append(ta);ta.select();let ok=document.execCommand('copy');ta.remove();if(!ok){download(content,'bangkok_feedback_for_chatgpt.txt','text/plain;charset=utf-8');el('copyStatus').textContent='Скачан файл — вставь его содержимое в чат';el('copyStatus').classList.add('visible');return}}el('copyStatus').textContent='Скопировано — вставь текст в чат';el('copyStatus').classList.add('visible')}
function setStatus(s,cls=''){el('syncStatus').className='status '+cls;el('syncStatus').textContent=s;el('syncStatus').title=s;}
async function fetchUpdates(){
  setStatus('Лента: проверка…');
  try{
    let o,src;
    if(feedUrl==='./updates.json' && ghConf && ghToken && location.protocol==='file:'){
      const endpoint='/repos/'+encodeURIComponent(ghConf.owner)+'/'+encodeURIComponent(ghConf.repo)+'/contents/updates.json';
      const {rsp,data}=await ghRequest(endpoint);
      if(!rsp.ok)throw Error('GitHub: HTTP '+rsp.status+' · проверь updates.json');
      if(data.encoding!=='base64'||typeof data.content!=='string')throw Error('GitHub: неверный формат updates.json');
      o=JSON.parse(d64(data.content));src='Приватный GitHub: '+ghConf.owner+'/'+ghConf.repo+'/updates.json';
    }else if(feedUrl==='./updates.json' && location.protocol==='file:'){
      setStatus('Лента: подключи GitHub','pending');
      el('feedSource').textContent='GitHub: после подключения ☁ Облако';draw();return;
    }else{
      if(!pathFeed(feedUrl))throw Error('Нужна HTTPS-ссылка');
      const response=await fetch(feedUrl,{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      o=await response.json();src=feedUrl;
    }
    const fresh=validFeed(o);
    incoming=fresh;putLS(CACHE_KEY,JSON.stringify(o));const beforeSeen=progress.seen.join(',');unifyStars(progress);if(progress.seen.join(',')!==beforeSeen)save();
    lastSynced=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
    setStatus('Лента: обновлена · '+lastSynced,'ok');el('feedSource').textContent=src;draw();
  }catch(e){
    setStatus('Лента: нет связи'+(incoming.length?' · кэш':''),'fail');
    el('syncStatus').title=String(e.message||e);draw();
  }
}
function makeSelects(){el('categories').innerHTML=CATEGORIES.map(c=>`<button class="chip ${c===S.cat?'active':''}" data-cat="${h(c)}">${h(c)}</button>`).join('');const ar=[...new Set(items().map(x=>x.area))].sort((a,b)=>a.localeCompare(b,'ru'));el('area').innerHTML='<option value="">Все районы</option>'+ar.map(a=>`<option value="${h(a)}">${h(a)}</option>`).join('');let dateArray=Array.from({length:9},(_,i)=>new Date(Date.UTC(2026,9,2+i)).toISOString().slice(0,10));el('date').innerHTML='<option value="">Все даты</option>'+dateArray.map(v=>`<option value="${v}">${fs(v)}</option>`).join('');document.querySelectorAll('[data-cat]').forEach(n=>n.addEventListener('click',()=>{S.cat=n.dataset.cat;draw()}));}
function card(x){let fav=progress.fav.includes(x.id),want=progress.planned.includes(x.id),vis=progress.visited.includes(x.id),fresh=isNew(x),cancel=x.status==='cancelled',eta=x.eta?.min==null?'Время не рассчитано':`≈ ${x.eta.min}–${x.eta.max} мин`;let multi=x.id==='bkcaw'||/^(разные площадки|multiple venues)$/i.test((x.venue||'').trim());let to=x.mapQuery||(x.title+' '+(x.venue||'')+' Bangkok Thailand'),mapPin='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(to),maps='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+'&destination='+encodeURIComponent(to)+'&travelmode=transit';let url=safeLink(x.url);return `<article class="card ${vis?'visited':''}" data-id="${h(x.id)}"><div class="titleline"><div class="pillrow"><span class="tag">${h(x.kind)}</span>${fresh?`<span class="tag new">НОВОЕ${x.addedAt?' · '+h(fs(x.addedAt)):''}</span>`:''}${want&&!vis?'<span class="tag planned">В ПЛАНЕ</span>':''}${cancel?'<span class="tag cancel">ОТМЕНЕНО</span>':''}</div><div class="row"><button class="btn icon ${fav||want?'on':''}" data-toggle="star" data-id="${h(x.id)}" title="${fav||want?'Убрать из моих мест':'Хочу посетить'}" aria-pressed="${fav||want}" aria-label="${fav||want?'Убрать из моих мест':'Хочу посетить'}: ${h(x.title)}">${fav||want?'★':'☆'}</button><button class="btn icon reject" data-toggle="reject" data-id="${h(x.id)}" title="Не интересно — скрыть" aria-label="Не интересно — скрыть: ${h(x.title)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.58 10.58a2 2 0 0 0 2.84 2.84"/><path d="M9.88 5.09A10.93 10.93 0 0 1 12 4c7 0 10 8 10 8a13.3 13.3 0 0 1-2.02 3.23"/><path d="M6.61 6.61A13.42 13.42 0 0 0 2 12s3 8 10 8a10.93 10.93 0 0 0 5.39-1.38"/><path d="M2 2l20 20"/></svg></button></div></div><small>${h(x.area)}${x.dates?' · '+h(dateLabel(x)):''}</small><h2>${h(x.title)}</h2><p>${h(x.blurb)}</p><div class="meta">${h(x.venue||'Адрес площадки уточняется')}${x.notes?' · '+h(x.notes):''}</div><div class="eta"><b>${h(eta)}</b><br>${h(x.eta?.via||'Маршрут уточняется')}</div><div class="cardbottom">${url?`<a class="btn primary" href="${h(url)}" target="_blank" rel="noopener noreferrer">Источник ↗</a>`:''}${multi?'':`<a class="btn" href="${h(mapPin)}" target="_blank" rel="noopener noreferrer">📍 Google Maps</a><a class="btn" href="${h(maps)}" target="_blank" rel="noopener noreferrer">Маршрут ↗</a>`}<button class="btn ${vis?'on':''}" data-toggle="visited" data-id="${h(x.id)}">${vis?'✓ Посещено':'○ Посетил'}</button>${fresh?`<button class="btn" data-toggle="seen" data-id="${h(x.id)}">Прочитано</button>`:''}</div></article>`}
function hiddenCard(x){return `<article class="card hidden-card" data-id="${h(x.id)}"><div class="titleline"><span class="tag">${h(x.kind)}</span><button class="btn" data-toggle="restore" data-id="${h(x.id)}">↶ Вернуть</button></div><small>${h(x.area)}</small><h2>${h(x.title)}</h2><label class="sub" for="reason-${h(x.id)}">Причина (для профиля путешественника)</label><select class="reason" data-reason="${h(x.id)}" id="reason-${h(x.id)}">${reasons.map(r=>`<option${r===x.reason?' selected':''}>${h(r)}</option>`).join('')}</select><label class="sub" for="note-${h(x.id)}">Комментарий (необязательно)</label><input class="note" id="note-${h(x.id)}" data-note="${h(x.id)}" value="${h(x.note)}" maxlength="350" placeholder="Например: слишком обычный ассортимент"></article>`}
function draw(){makeSelects();let all=items(),available=all.filter(x=>!progress.rejected.includes(x.id)),freshCount=available.filter(isNew).length;el('planCount').textContent=available.filter(x=>progress.fav.includes(x.id)||progress.planned.includes(x.id)).length;el('headlineCount').textContent=available.length;el('newCounter').textContent=freshCount?' + '+freshCount+' новых':'';el('newFilterCount').textContent=freshCount?'('+freshCount+')':'';el('hiddenCount').textContent=progress.rejected.length;el('hiddenTools').hidden=!S.rejected;el('onlynew').classList.toggle('active',S.newOnly&&!S.rejected);el('onlyplanned').classList.toggle('active',S.planned&&!S.rejected);el('hidevisited').classList.toggle('active',S.hide&&!S.rejected);el('priority').classList.toggle('active',S.priority&&!S.rejected);el('rejected').classList.toggle('active',S.rejected);el('area').value=S.area;el('date').value=S.date;el('search').value=S.query;el('sort').value=S.sort;if(S.rejected){let z=rejections();el('count').textContent='Скрыто: '+z.length;el('results').innerHTML=z.length?z.map(hiddenCard).join(''):'<div class="blank">Скрытых мест пока нет</div>';}else{let q=S.query.toLocaleLowerCase('ru').trim();let z=available.filter(x=>(S.cat==='Все'||x.kind===S.cat)&&(!S.area||S.area===x.area)&&liveOn(x,S.date)&&(!S.planned||progress.fav.includes(x.id)||progress.planned.includes(x.id))&&(!S.hide||!progress.visited.includes(x.id))&&(!S.priority||x.priority>=3)&&(!S.newOnly||isNew(x))&&(!q||[x.title,x.blurb,x.area,x.venue,x.notes].join(' ').toLocaleLowerCase('ru').includes(q)));z.sort((a,b)=>S.sort==='near'?(a.eta?.min??999)-(b.eta?.min??999)||b.priority-a.priority:S.sort==='soon'?(a.dates?.[1]||'9999').localeCompare(b.dates?.[1]||'9999'):S.sort==='area'?a.area.localeCompare(b.area,'ru'):Number(progress.planned.includes(b.id))-Number(progress.planned.includes(a.id))||b.priority-a.priority||Number(isNew(b))-Number(isNew(a))||a.title.localeCompare(b.title,'ru'));el('count').textContent=z.length+' из '+available.length;el('results').innerHTML=z.length?z.map(card).join(''):'<div class="blank">Нет совпадений</div>';}document.querySelectorAll('[data-toggle]').forEach(n=>n.addEventListener('click',()=>{let type=n.dataset.toggle,id=n.dataset.id;if(type==='seen'){markSeen(id);return}if(type==='star'){toggleStar(id);return}if(type==='reject'){reject(id);return}if(type==='restore'){restore(id);return}progress[type]=progress[type].includes(id)?progress[type].filter(x=>x!==id):[...progress[type],id];if(type==='visited'){if(progress.visited.includes(id)){progress.planned=progress.planned.filter(x=>x!==id);if(isNew(items().find(x=>x.id===id)||{}))progress.seen=[...new Set([...progress.seen,id])]}else if(progress.fav.includes(id)){progress.planned=[...new Set([...progress.planned,id])]}}save();draw()}));document.querySelectorAll('[data-reason]').forEach(n=>n.addEventListener('change',()=>{let id=n.dataset.reason;if(progress.rejectedMeta[id]){progress.rejectedMeta[id].reason=reasons.includes(n.value)?n.value:reasons[0];save()}}));document.querySelectorAll('[data-note]').forEach(n=>n.addEventListener('input',()=>{let id=n.dataset.note;if(progress.rejectedMeta[id]){progress.rejectedMeta[id].note=n.value.slice(0,350);save()}}));}
function exportProgress(){let o={app:'bangkok-curated',version:4,savedAt:new Date().toISOString(),...progress};download(JSON.stringify(o,null,2),'bangkok_marks.json','application/json')}
async function loadJsonFile(e,mode){let f=e.target.files?.[0];if(!f)return;try{let o=JSON.parse(await f.text());if(mode==='feed'){incoming=validFeed(o);putLS(CACHE_KEY,JSON.stringify(o));setStatus('Импортировано из файла','ok');}else{if(!Array.isArray(o.fav)||!Array.isArray(o.visited))throw Error('Недопустимые отметки');progress=unifyStars({fav:cleanIds(o.fav),planned:cleanIds(o.planned),visited:cleanIds(o.visited),seen:cleanIds(o.seen),rejected:cleanIds(o.rejected),rejectedMeta:o.rejectedMeta&&typeof o.rejectedMeta==='object'&&!Array.isArray(o.rejectedMeta)?o.rejectedMeta:{}});save()}draw();el('notice').textContent='Импортировано'}catch(ex){el('notice').textContent='Ошибка: '+ex.message}e.target.value='';}

// Per-item/per-field timestamps allow two devices to merge changes without
// replacing unrelated preferences. The browser never sends a PAT to this app's site.
const GH_CONF_KEY='bangkok-github-config-v1',GH_LOCAL_KEY='bangkok-github-token-v1',GH_LOG_KEY='bangkok-github-journal-v1';
const GH_FILE='travel/feedback.json',GH_FIELDS=['fav','planned','visited','seen','rejected','reason','note'];
let ghConf=null,ghToken='',ghJournal={},ghSnapshot=null,ghTimer=null,ghActive=null,ghDirty=false,ghVerifying=false,ghLastPush='';
const clone=x=>JSON.parse(JSON.stringify(x));
const isoNow=()=>new Date().toISOString();
const ghStatus=(s,kind='')=>{el('cloudBrief').textContent=s;el('cloudBrief').className='cloud-status '+kind;};
const ghMessage=(s,kind='')=>{el('ghMessage').textContent=s;el('ghMessage').className='cloud-msg '+kind;};
const normalizeMeta=m=>({title:String(m?.title||'').slice(0,170),kind:String(m?.kind||'').slice(0,45),area:String(m?.area||'').slice(0,100)});
function journalItem(j,id){if(!j[id])j[id]={meta:normalizeMeta(items().find(x=>x.id===id)||progress.rejectedMeta[id]),fields:{}};return j[id]}
function normalizeJournal(o){
  if(!o||o.schema!==1||typeof o.records!=='object'||!o.records||Array.isArray(o.records))throw Error('Некорректный формат feedback.json');
  const out={};for(const [id,r] of Object.entries(o.records)){
    if(!/^[a-z0-9_-]{2,65}$/.test(id)||!r||typeof r!=='object')continue;
    const fields={};for(const k of GH_FIELDS){const v=r.fields?.[k];if(!v||typeof v.at!=='string'||Number.isNaN(Date.parse(v.at)))continue;
      const x=(k==='reason'||k==='note')?String(v.value||'').slice(0,k==='reason'?100:350):v.value;
      if((k!=='reason'&&k!=='note')&&typeof x!=='boolean')continue;
      fields[k]={value:x,at:v.at};
    }
    if(Object.keys(fields).length)out[id]={meta:normalizeMeta(r.meta),fields};
  }return out;
}
function ghDoc(j){return {schema:1,app:'bangkok-curated',updatedAt:isoNow(),records:j}}
function mergeJournal(a,b){const m=clone(a);for(const [id,r] of Object.entries(b)){
  const entry=journalItem(m,id);if(!entry.meta.title&&r.meta?.title)entry.meta=normalizeMeta(r.meta);
  for(const [k,v] of Object.entries(r.fields||{})){if(!entry.fields[k]||v.at>entry.fields[k].at)entry.fields[k]=clone(v)}
}return m}
function cacheJournal(){putLS(GH_LOG_KEY,JSON.stringify(ghDoc(ghJournal)))}
function legacyJournal(){const j={},ts='2000-01-01T00:00:00.000Z';
  for(const k of ['fav','planned','visited','seen','rejected'])for(const id of progress[k])journalItem(j,id).fields[k]={value:true,at:ts};
  for(const [id,m] of Object.entries(progress.rejectedMeta)){
    if(!progress.rejected.includes(id))continue;
    const r=journalItem(j,id);r.meta=normalizeMeta(m);
    if(m.reason)r.fields.reason={value:String(m.reason).slice(0,100),at:ts};
    if(m.note)r.fields.note={value:String(m.note).slice(0,350),at:ts};
  }return j;
}
function initGhJournal(){try{ghJournal=normalizeJournal(JSON.parse(getLS(GH_LOG_KEY)))}catch(e){ghJournal=legacyJournal();cacheJournal()};ghSnapshot=clone(progress)}
function applyJournal(j){
  const p={fav:[],planned:[],visited:[],seen:[],rejected:[],rejectedMeta:{}};
  for(const [id,r] of Object.entries(j)){for(const k of ['fav','planned','visited','seen','rejected'])if(r.fields?.[k]?.value===true)p[k].push(id);
    if(r.fields?.rejected?.value===true){const meta=r.meta||{},src=items().find(x=>x.id===id)||{};
      p.rejectedMeta[id]={title:meta.title||src.title||id,kind:meta.kind||src.kind||'',area:meta.area||src.area||'',reason:r.fields.reason?.value||'Не интересует',note:r.fields.note?.value||'',hiddenAt:r.fields.rejected?.at||isoNow()};
    }
  }
  progress=unifyStars(p);ghSnapshot=clone(progress);cacheJournal();putLS(PROGRESS_KEY,JSON.stringify(progress));draw();
}
function captureGhChanges(){
  if(!ghSnapshot){ghSnapshot=clone(progress);return false}
  let changed=false;const prev=ghSnapshot,ids=new Set([...Object.values(progress).filter(Array.isArray).flat(),...Object.values(prev).filter(Array.isArray).flat(),...Object.keys(progress.rejectedMeta),...Object.keys(prev.rejectedMeta)]);
  const now=isoNow();for(const id of ids){const deltas={};
    for(const k of ['fav','planned','visited','seen','rejected']){const a=prev[k].includes(id),b=progress[k].includes(id);if(a!==b)deltas[k]=b}
    const a=prev.rejectedMeta[id]||{},b=progress.rejectedMeta[id]||{};
    for(const k of ['reason','note'])if(String(a[k]||'')!==String(b[k]||''))deltas[k]=String(b[k]||'').slice(0,k==='reason'?100:350);
    if(Object.keys(deltas).length){const r=journalItem(ghJournal,id),src=items().find(x=>x.id===id)||b||a;
      r.meta=normalizeMeta(src);for(const [k,v] of Object.entries(deltas))r.fields[k]={value:v,at:now};changed=true}
  }
  ghSnapshot=clone(progress);if(changed){cacheJournal();ghDirty=true;queueGhSync()};return changed;
}
const u64=s=>{const bytes=new TextEncoder().encode(s);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)};
const d64=s=>{const bytes=Uint8Array.from(atob(s.replace(/\s+/g,'')),c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)};
async function ghRequest(path,opts={}){
  const rsp=await fetch('https://api.github.com'+path,{...opts,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+ghToken,'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28',...(opts.headers||{})},cache:'no-store'});
  let data;try{data=await rsp.json()}catch(e){data={}}
  return {rsp,data};
}
async function verifyGh(){const {rsp,data}=await ghRequest('/repos/'+encodeURIComponent(ghConf.owner)+'/'+encodeURIComponent(ghConf.repo));
  if(!rsp.ok)throw Error('Репозиторий недоступен: '+rsp.status+'. Проверь токен, доступ и owner/repo.');
  if(data.private!==true)throw Error('Репозиторий публичный. Для отметок создай отдельный приватный.');
}
async function ghFetchState(){
  const endpoint='/repos/'+encodeURIComponent(ghConf.owner)+'/'+encodeURIComponent(ghConf.repo)+'/contents/'+GH_FILE;
  const {rsp,data}=await ghRequest(endpoint);
  if(rsp.status===404)return {journal:{},sha:null};
  if(!rsp.ok)throw Error('Чтение GitHub: HTTP '+rsp.status);
  if(data.encoding!=='base64'||typeof data.content!=='string'||typeof data.sha!=='string')throw Error('Невозможно прочитать feedback.json');
  return {journal:normalizeJournal(JSON.parse(d64(data.content))),sha:data.sha};
}
async function ghSync(){
  if(ghActive||!ghConf||!ghToken)return ghActive;
  ghActive=(async()=>{
    ghStatus('☁ Синхронизация…','pending');
    try{
      for(let attempt=0;attempt<4;attempt++){
        const remote=await ghFetchState();const merged=mergeJournal(remote.journal,ghJournal);
        const needsWrite=!remote.sha || JSON.stringify(remote.journal)!==JSON.stringify(merged);
        if(needsWrite){const endpoint='/repos/'+encodeURIComponent(ghConf.owner)+'/'+encodeURIComponent(ghConf.repo)+'/contents/'+GH_FILE;
          const body={message:'Update travel feedback',content:u64(JSON.stringify(ghDoc(merged),null,2)),...(remote.sha?{sha:remote.sha}:{})};
          const {rsp,data}=await ghRequest(endpoint,{method:'PUT',body:JSON.stringify(body)});
          if(rsp.status===409||rsp.status===422){if(attempt<3)continue;throw Error('Конфликт GitHub: попробуй ещё раз')}
          if(!rsp.ok)throw Error('Запись GitHub: HTTP '+rsp.status+' '+String(data.message||''));
        }
        // Incorporate remote state, but re-merge edits made during the network request.
        ghJournal=mergeJournal(merged,ghJournal);applyJournal(ghJournal);
        ghDirty=JSON.stringify(ghJournal)!==JSON.stringify(merged);
        ghLastPush=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
        ghStatus('☁ Сохранено в GitHub · '+ghLastPush,'good');ghMessage('Синхронизация выполнена: '+ghConf.owner+'/'+ghConf.repo,'good');
        return;
      }
    }catch(e){ghDirty=true;ghStatus('☁ Не синхронизировано','bad');ghMessage(String(e.message||e),'bad')}
  })();try{return await ghActive}finally{ghActive=null;if(ghDirty&&ghConf&&ghToken){/* Keep changes; retry on next sync/online. */}}
}
function queueGhSync(){if(!ghConf||!ghToken)return;ghStatus('☁ Есть несохранённые изменения','pending');clearTimeout(ghTimer);ghTimer=setTimeout(()=>ghSync(),1400)}
function ghRememberSettings(){if(!ghConf)return;putLS(GH_CONF_KEY,JSON.stringify(ghConf));}
async function ghConnect(){
  const v=el('ghRepo').value.trim(),tok=el('ghToken').value.trim()||ghToken,match=/^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9_.-]{1,100})$/.exec(v);
  if(!match||!tok){ghMessage('Введи owner/repo и токен.','bad');return}
  const prevConf=ghConf,prevToken=ghToken;ghConf={owner:match[1],repo:match[2]};ghToken=tok;el('ghConnect').disabled=true;ghMessage('Проверка приватного репозитория…');
  let verified=false;
  try{await verifyGh();verified=true;ghRememberSettings();sessionStorage.setItem(GH_LOCAL_KEY,tok);
    if(el('ghRemember').checked)putLS(GH_LOCAL_KEY,tok);else localStorage.removeItem(GH_LOCAL_KEY);
    el('ghToken').value='';await ghSync();await fetchUpdates();
  }catch(e){ghMessage(e.message,'bad');if(!verified){if(prevConf&&prevToken){ghConf=prevConf;ghToken=prevToken}else{ghConf=null;ghToken=''}if(!ghConf){localStorage.removeItem(GH_CONF_KEY);sessionStorage.removeItem(GH_LOCAL_KEY);localStorage.removeItem(GH_LOCAL_KEY)}}
  }finally{el('ghConnect').disabled=false}
}
function initGithub(){
  initGhJournal();try{const v=JSON.parse(getLS(GH_CONF_KEY));if(v&&/^[A-Za-z0-9-]{1,39}$/.test(v.owner)&&/^[A-Za-z0-9_.-]{1,100}$/.test(v.repo))ghConf=v}catch(e){}
  ghToken=sessionStorage.getItem(GH_LOCAL_KEY)||getLS(GH_LOCAL_KEY)||'';el('ghRemember').checked=!!getLS(GH_LOCAL_KEY);
  if(ghConf){el('ghRepo').value=ghConf.owner+'/'+ghConf.repo;ghStatus(ghToken?'☁ Подключено — проверка…':'☁ Нужен токен',ghToken?'pending':'bad');if(ghToken)verifyGh().then(async()=>{await ghSync();await fetchUpdates()}).catch(e=>{ghMessage(e.message,'bad');ghStatus('☁ Ошибка подключения','bad')})}
  window.addEventListener('online',()=>ghSync());document.addEventListener('visibilitychange',()=>{if(!document.hidden)ghSync()});
  setInterval(()=>{if(!document.hidden)ghSync()},120000);
}
el('cloudOpen').addEventListener('click',()=>{let section=el('cloudSetup');section.hidden=!section.hidden;el('cloudOpen').setAttribute('aria-expanded',String(!section.hidden))});
el('ghConnect').addEventListener('click',ghConnect);
el('ghSyncNow').addEventListener('click',async()=>{if(!ghConf||!ghToken){ghMessage('Сначала подключи приватный репозиторий.','bad');return}await ghSync();await fetchUpdates()});
el('ghDisconnect').addEventListener('click',()=>{clearTimeout(ghTimer);ghConf=null;ghToken='';el('ghToken').value='';localStorage.removeItem(GH_CONF_KEY);localStorage.removeItem(GH_LOCAL_KEY);sessionStorage.removeItem(GH_LOCAL_KEY);ghStatus('Отметки сохранены на устройстве');ghMessage('GitHub отключён. Локальные отметки сохранены.','good')});

initSaved();initGithub();draw();fetchUpdates();setInterval(fetchUpdates,30*60*1000);el('refresh').onclick=fetchUpdates;el('onlynew').onclick=()=>{S.newOnly=!S.newOnly;S.rejected=false;draw()};el('onlyplanned').onclick=()=>{S.planned=!S.planned;S.rejected=false;draw()};el('hidevisited').onclick=()=>{S.hide=!S.hide;S.rejected=false;draw()};el('priority').onclick=()=>{S.priority=!S.priority;S.rejected=false;draw()};el('rejected').onclick=()=>{S.rejected=!S.rejected;draw()};el('reset').onclick=()=>{Object.assign(S,{cat:'Все',query:'',area:'',date:'',hide:false,priority:false,newOnly:false,planned:false,rejected:false,sort:'rank'});draw()};el('search').oninput=e=>{S.query=e.target.value;S.rejected=false;draw()};el('area').onchange=e=>{S.area=e.target.value;S.rejected=false;draw()};el('date').onchange=e=>{S.date=e.target.value;S.rejected=false;draw()};el('sort').onchange=e=>{S.sort=e.target.value;draw()};el('exportData').onclick=exportProgress;el('exportFeedback').onclick=()=>download(rejectionText(),'bangkok_feedback_for_chatgpt.txt','text/plain;charset=utf-8');el('copyFeedback').onclick=copyFeedback;el('importData').onchange=e=>loadJsonFile(e,'marks');el('importFeed').onchange=e=>loadJsonFile(e,'feed');el('markAllSeen').onclick=()=>{progress.seen=[...new Set([...progress.seen,...items().filter(isNew).map(x=>x.id)])];save();draw()};el('saveFeed').onclick=()=>{let v=el('feedUrl').value.trim();if(!/^https:\/\//.test(v)){el('notice').textContent='Нужна публичная HTTPS-ссылка';return}feedUrl=v;putLS(FEED_KEY,v);fetchUpdates()};el('defaultFeed').onclick=()=>{feedUrl='./updates.json';putLS(FEED_KEY,feedUrl);el('feedUrl').value='';fetchUpdates()};el('saveOrigin').onclick=()=>{origin=el('originInput').value.trim()||O0;putLS(ORIGIN_KEY,origin);el('notice').textContent='Адрес сохранён для Google Maps. Оценки времени в карточках рассчитаны от TRIBE Living.';draw()};
