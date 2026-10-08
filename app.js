const BASE=[];
const CORE_TAGS=['События','Выставки','Дизайн','Ресейл','Магазины','Спорт','Кофе','Еда и бары','Районы','Природа'];
const PROGRESS_KEY='bkk-curated-2026-checklist-v1',FEED_KEY='bkk-curated-feed-url-v2',CACHE_KEY='bkk-curated-feed-cache-v2',ORIGIN_KEY='bkk-curated-origin-v2';
const O0='TRIBE Living Bangkok Sukhumvit 39, 122 Soi Sukhumvit 39, Bangkok, Thailand';
const TRIP_END='2026-10-15';
const S={cat:'Все',query:'',area:'',date:'',hide:false,priority:false,newOnly:false,planned:false,rejected:false,sort:'rank'};
let progress={fav:[],planned:[],visited:[],seen:[],rejected:[],rejectedMeta:{},ratings:{}},incoming=[],origin=O0,feedUrl='./updates.json',lastSynced='';
const el=id=>document.getElementById(id);const h=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getLS(k){try{return localStorage.getItem(k)}catch(e){return null}}
function putLS(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function safeLink(u){if(!u)return '';try{let p=new URL(u,location.href);return ['https:','http:'].includes(p.protocol)?p.href:''}catch(e){return ''}}
function pathFeed(s){return s==='./updates.json'||/^https:\/\//.test(s)}
const cleanIds=a=>Array.isArray(a)?[...new Set(a.filter(x=>typeof x==='string'&&/^[a-z0-9_-]{2,65}$/.test(x)))]:[];
const validRating=v=>Number.isInteger(v)&&v>=1&&v<=10;
const cleanRatings=o=>o&&typeof o==='object'&&!Array.isArray(o)?Object.fromEntries(Object.entries(o).filter(([id,v])=>/^[a-z0-9_-]{2,65}$/.test(id)&&validRating(v))):{};
const cleanTags=a=>Array.isArray(a)?[...new Set(a.filter(x=>typeof x==='string').map(x=>x.trim()).filter(x=>x&&x!=='Все'&&x.length<=45))].slice(0,12):[];
const tagsOf=x=>{const tags=cleanTags(x?.tags);return tags.length?tags:cleanTags([x?.kind])};
const primaryTag=x=>CORE_TAGS.find(t=>tagsOf(x).includes(t))||tagsOf(x)[0]||'';
const allTags=()=>{const used=new Set(items().filter(x=>!isExpired(x)).flatMap(tagsOf)),extras=[...used].filter(t=>!CORE_TAGS.includes(t)).sort((a,b)=>a.localeCompare(b,'ru'));return [...CORE_TAGS.filter(t=>used.has(t)),...extras]};
function unifyStars(p){
  p.ratings=cleanRatings(p.ratings);
  p.visited=cleanIds([...(p.visited||[]),...Object.keys(p.ratings)]);
  const starred=cleanIds([...(p.fav||[]),...(p.planned||[])]).filter(id=>!p.rejected.includes(id));
  p.fav=starred;p.planned=starred.filter(id=>!p.visited.includes(id));
  const newPicked=starred.filter(id=>{const x=items().find(x=>x.id===id);return x&&(x.new||x.addedAt)});
  p.seen=cleanIds([...(p.seen||[]),...newPicked]);
  return p;
}
function initSaved(){try{const p=JSON.parse(getLS(PROGRESS_KEY));if(Array.isArray(p?.fav)&&Array.isArray(p?.visited))progress={fav:cleanIds(p.fav),planned:cleanIds(p.planned),visited:cleanIds(p.visited),seen:cleanIds(p.seen),rejected:cleanIds(p.rejected),rejectedMeta:p.rejectedMeta&&typeof p.rejectedMeta==='object'&&!Array.isArray(p.rejectedMeta)?p.rejectedMeta:{},ratings:cleanRatings(p.ratings)}}catch(e){};origin=(!getLS(ORIGIN_KEY)||getLS(ORIGIN_KEY)==='Sukhumvit 39, Bangkok, Thailand')?O0:getLS(ORIGIN_KEY);feedUrl=getLS(FEED_KEY)||'./updates.json';try{const f=JSON.parse(getLS(CACHE_KEY));incoming=validFeed(f)}catch(e){};el('feedUrl').value=feedUrl==='./updates.json'?'':feedUrl;el('originInput').value=origin;el('feedSource').textContent=feedUrl;unifyStars(progress);putLS(PROGRESS_KEY,JSON.stringify(progress));}
const fs=iso=>{if(!iso)return '';const m=['','янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];let a=iso.split('-');return Number(a[2])+' '+m[Number(a[1])]};
const dateLabel=x=>!x.dates?'Постоянное место':x.days?.length?x.days.map(fs).join(', '):x.dates[0]===x.dates[1]?fs(x.dates[0]):fs(x.dates[0])+' — '+fs(x.dates[1]);
const bangkokToday=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day};
const lastEventDay=x=>x.days?.length?[...x.days].sort().at(-1):x.dates?.[1]||'';
const isExpired=x=>!!x.dates&&lastEventDay(x)<bangkokToday();
const dateRange=(start,end)=>{if(start>end)return [];const out=[],d=new Date(start+'T00:00:00Z'),e=new Date(end+'T00:00:00Z');for(;d<=e;d.setUTCDate(d.getUTCDate()+1))out.push(d.toISOString().slice(0,10));return out};
const liveOn=(x,day)=>!day||!x.dates||(x.days?.length?x.days.includes(day):x.dates[0]<=day&&x.dates[1]>=day);
function validFeed(o){if(!o||o.version!==1||!Array.isArray(o.items))throw Error('Формат updates.json неверен');return o.items.filter(x=>x&&typeof x.id==='string'&&/^[a-z0-9_-]{2,65}$/.test(x.id)&&typeof x.title==='string'&&x.title.length<200&&typeof x.area==='string'&&tagsOf(x).length).map(x=>({...x,id:x.id,title:x.title.slice(0,160),kind:typeof x.kind==='string'&&x.kind.trim()?x.kind.trim():primaryTag(x),tags:tagsOf(x),blurb:String(x.blurb||'').slice(0,800),source:String(x.source||'источник'),notes:String(x.notes||'').slice(0,400),url:safeLink(x.url),venue:String(x.venue||'').slice(0,300),mapQuery:String(x.mapQuery||'').slice(0,250),addedAt:/^20\d\d-\d\d-\d\d$/.test(x.addedAt)?x.addedAt:'',dates:Array.isArray(x.dates)&&x.dates.length===2?x.dates:null,days:Array.isArray(x.days)?x.days:null,priority:Number.isFinite(x.priority)?x.priority:2,eta:(Number.isFinite(x.eta?.min)&&Number.isFinite(x.eta?.max)&&x.eta?.via)?x.eta:{min:null,max:null,via:'Время уточняется для новой площадки'},status:x.status==='cancelled'?'cancelled':'active',new:true}));}
function items(){let z=new Map(BASE.map(x=>[x.id,x]));for(let x of incoming)z.set(x.id,{...z.get(x.id),...x});return [...z.values()]}
function isNew(x){return (x.new||x.addedAt)&&!progress.seen.includes(x.id)&&!progress.visited.includes(x.id)}
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
function save(syncDelay=0){putLS(PROGRESS_KEY,JSON.stringify(progress));captureSyncChanges(syncDelay)}
function reject(id){let x=items().find(x=>x.id===id);if(!x)return;progress.fav=progress.fav.filter(p=>p!==id);progress.planned=progress.planned.filter(p=>p!==id);progress.rejected=[...new Set([...progress.rejected,id])];progress.rejectedMeta[id]={title:x.title,kind:primaryTag(x),area:x.area,reason:'Не интересует',note:'',hiddenAt:new Date().toISOString()};save();draw()}
function restore(id){progress.rejected=progress.rejected.filter(x=>x!==id);delete progress.rejectedMeta[id];save();draw()}
const reasons=['Не интересует','Скучно','Не нравится ассортимент','Слишком далеко','Слишком дорого','Уже был','Другое'];
function rejections(){let catalog=new Map(items().map(x=>[x.id,x]));return progress.rejected.map(id=>{let meta=progress.rejectedMeta[id]||{},place=catalog.get(id)||{},tags=tagsOf(place);if(!tags.length)tags=cleanTags([meta.kind]);return {id,title:String(meta.title||place.title||id),kind:String(meta.kind||primaryTag(place)||''),tags,area:String(meta.area||place.area||''),reason:reasons.includes(meta.reason)?meta.reason:'Не интересует',note:String(meta.note||'')}})}
function rejectionText(){let lines=rejections().map(x=>'- '+x.title+' ('+(x.tags.length?x.tags.join(', '):x.kind)+(x.area?', '+x.area:'')+'): '+x.reason+(x.note?'; '+x.note:''));return 'Обнови мой профиль путешественника: больше не рекомендуй перечисленные ниже места и события. Причины указаны отдельно; не считай, что отказ от одного места означает отказ от всей категории.\n\n'+lines.join('\n')}
function download(text,name,mime){let blob=new Blob([text],{type:mime}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function copyFeedback(){let content=rejectionText();try{if(!navigator.clipboard?.writeText)throw Error('No clipboard');await navigator.clipboard.writeText(content)}catch(e){let ta=document.createElement('textarea');ta.value=content;ta.style.position='fixed';ta.style.left='-9999px';document.body.append(ta);ta.select();let ok=document.execCommand('copy');ta.remove();if(!ok){download(content,'bangkok_feedback_for_chatgpt.txt','text/plain;charset=utf-8');el('copyStatus').textContent='Скачан файл — вставь его содержимое в чат';el('copyStatus').classList.add('visible');return}}el('copyStatus').textContent='Скопировано — вставь текст в чат';el('copyStatus').classList.add('visible')}
function setStatus(s,cls=''){el('syncStatus').className='status '+cls;el('syncStatus').textContent=s;el('syncStatus').title=s;}
async function fetchUpdates(){
  setStatus('Лента: проверка…');
  try{
    let o,src;
    if(feedUrl==='./updates.json' && location.protocol==='file:'){
      setStatus('Лента недоступна из локального файла','pending');
      el('feedSource').textContent='Открой опубликованный сайт для обновлений';draw();return;
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
function makeSelects(){const current=items().filter(x=>!isExpired(x)),tags=['Все',...allTags()];if(!tags.includes(S.cat))S.cat='Все';el('categories').innerHTML=tags.map(c=>`<button class="chip ${c===S.cat?'active':''}" data-cat="${h(c)}">${h(c)}</button>`).join('');const ar=[...new Set(current.map(x=>x.area))].sort((a,b)=>a.localeCompare(b,'ru'));if(S.area&&!ar.includes(S.area))S.area='';el('area').innerHTML='<option value="">Все районы</option>'+ar.map(a=>`<option value="${h(a)}">${h(a)}</option>`).join('');let dateArray=dateRange(bangkokToday(),TRIP_END);if(S.date&&!dateArray.includes(S.date))S.date='';el('date').innerHTML='<option value="">Все даты</option>'+dateArray.map(v=>`<option value="${v}">${fs(v)}</option>`).join('');document.querySelectorAll('[data-cat]').forEach(n=>n.addEventListener('click',()=>{S.cat=n.dataset.cat;draw()}));}
function card(x){let rating=progress.ratings[x.id],fav=progress.fav.includes(x.id),want=progress.planned.includes(x.id),vis=progress.visited.includes(x.id),fresh=isNew(x),cancel=x.status==='cancelled',eta=x.eta?.min==null?'Время не рассчитано':`≈ ${x.eta.min}–${x.eta.max} мин`,tagHtml=tagsOf(x).map(t=>`<span class="tag">${h(t)}</span>`).join('');let multi=x.id==='bkcaw'||/^(разные площадки|multiple venues)$/i.test((x.venue||'').trim());let to=x.mapQuery||(x.title+' '+(x.venue||'')+' Bangkok Thailand'),mapPin='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(to),maps='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+'&destination='+encodeURIComponent(to)+'&travelmode=transit';let url=safeLink(x.url);return `<article class="card ${vis?'visited':''}" data-id="${h(x.id)}"><div class="titleline"><div class="pillrow">${tagHtml}${validRating(rating)?`<span class="tag personal-rating" title="Моя оценка" aria-label="Моя оценка ${rating} из 10">${rating}/10</span>`:""}${fresh?`<span class="tag new">НОВОЕ${x.addedAt?' · '+h(fs(x.addedAt)):''}</span>`:''}${want&&!vis?'<span class="tag planned">В ПЛАНЕ</span>':''}${cancel?'<span class="tag cancel">ОТМЕНЕНО</span>':''}</div><div class="row"><button class="btn icon ${fav||want?'on':''}" data-toggle="star" data-id="${h(x.id)}" title="${fav||want?'Убрать из моих мест':'Хочу посетить'}" aria-pressed="${fav||want}" aria-label="${fav||want?'Убрать из моих мест':'Хочу посетить'}: ${h(x.title)}">${fav||want?'★':'☆'}</button><button class="btn icon reject" data-toggle="reject" data-id="${h(x.id)}" title="Не интересно — скрыть" aria-label="Не интересно — скрыть: ${h(x.title)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.58 10.58a2 2 0 0 0 2.84 2.84"/><path d="M9.88 5.09A10.93 10.93 0 0 1 12 4c7 0 10 8 10 8a13.3 13.3 0 0 1-2.02 3.23"/><path d="M6.61 6.61A13.42 13.42 0 0 0 2 12s3 8 10 8a10.93 10.93 0 0 0 5.39-1.38"/><path d="M2 2l20 20"/></svg></button></div></div><small>${h(x.area)}${x.dates?' · '+h(dateLabel(x)):''}</small><h2>${h(x.title)}</h2><p>${h(x.blurb)}</p><div class="meta">${h(x.venue||'Адрес площадки уточняется')}${x.notes?' · '+h(x.notes):''}</div><div class="eta"><b>${h(eta)}</b><br>${h(x.eta?.via||'Маршрут уточняется')}</div><div class="cardbottom">${url?`<a class="btn primary" href="${h(url)}" target="_blank" rel="noopener noreferrer">Источник ↗</a>`:''}${multi?'':`<a class="btn" href="${h(mapPin)}" target="_blank" rel="noopener noreferrer">📍 Google Maps</a><a class="btn" href="${h(maps)}" target="_blank" rel="noopener noreferrer">Маршрут ↗</a>`}<button class="btn ${vis?'on':''}" data-toggle="visited" data-id="${h(x.id)}">${vis?'✓ Посещено':'○ Посетил'}</button>${fresh?`<button class="btn" data-toggle="seen" data-id="${h(x.id)}">Прочитано</button>`:''}</div></article>`}
function hiddenCard(x){let tagHtml=(x.tags?.length?x.tags:cleanTags([x.kind])).map(t=>`<span class="tag">${h(t)}</span>`).join('');return `<article class="card hidden-card" data-id="${h(x.id)}"><div class="titleline"><div class="pillrow">${tagHtml}</div><button class="btn" data-toggle="restore" data-id="${h(x.id)}">↶ Вернуть</button></div><small>${h(x.area)}</small><h2>${h(x.title)}</h2><label class="sub" for="reason-${h(x.id)}">Причина (для профиля путешественника)</label><select class="reason" data-reason="${h(x.id)}" id="reason-${h(x.id)}">${reasons.map(r=>`<option${r===x.reason?' selected':''}>${h(r)}</option>`).join('')}</select><label class="sub" for="note-${h(x.id)}">Комментарий (необязательно)</label><input class="note" id="note-${h(x.id)}" data-note="${h(x.id)}" value="${h(x.note)}" maxlength="350" placeholder="Например: слишком обычный ассортимент"></article>`}
function draw(){makeSelects();let all=items(),available=all.filter(x=>!progress.rejected.includes(x.id)&&!isExpired(x)),freshCount=available.filter(isNew).length;el('planCount').textContent=available.filter(x=>progress.fav.includes(x.id)||progress.planned.includes(x.id)).length;el('headlineCount').textContent=available.length;el('newCounter').textContent=freshCount?' + '+freshCount+' новых':'';el('newFilterCount').textContent=freshCount?'('+freshCount+')':'';el('hiddenCount').textContent=progress.rejected.length;el('hiddenTools').hidden=!S.rejected;el('onlynew').classList.toggle('active',S.newOnly&&!S.rejected);el('onlyplanned').classList.toggle('active',S.planned&&!S.rejected);el('hidevisited').classList.toggle('active',S.hide&&!S.rejected);el('priority').classList.toggle('active',S.priority&&!S.rejected);el('rejected').classList.toggle('active',S.rejected);el('area').value=S.area;el('date').value=S.date;el('search').value=S.query;el('sort').value=S.sort;if(S.rejected){let z=rejections();el('count').textContent='Скрыто: '+z.length;el('results').innerHTML=z.length?z.map(hiddenCard).join(''):'<div class="blank">Скрытых мест пока нет</div>';}else{let q=S.query.toLocaleLowerCase('ru').trim();let z=available.filter(x=>(S.cat==='Все'||tagsOf(x).includes(S.cat))&&(!S.area||S.area===x.area)&&liveOn(x,S.date)&&(!S.planned||progress.fav.includes(x.id)||progress.planned.includes(x.id))&&(!S.hide||!progress.visited.includes(x.id))&&(!S.priority||x.priority>=3)&&(!S.newOnly||isNew(x))&&(!q||[x.title,x.blurb,x.area,x.venue,x.notes,tagsOf(x).join(' ')].join(' ').toLocaleLowerCase('ru').includes(q)));z.sort((a,b)=>S.sort==='near'?(a.eta?.min??999)-(b.eta?.min??999)||b.priority-a.priority:S.sort==='soon'?(a.dates?.[1]||'9999').localeCompare(b.dates?.[1]||'9999'):S.sort==='area'?a.area.localeCompare(b.area,'ru'):Number(progress.planned.includes(b.id))-Number(progress.planned.includes(a.id))||b.priority-a.priority||Number(isNew(b))-Number(isNew(a))||a.title.localeCompare(b.title,'ru'));el('count').textContent=z.length+' из '+available.length;el('results').innerHTML=z.length?z.map(card).join(''):'<div class="blank">Нет совпадений</div>';}document.querySelectorAll('[data-toggle]').forEach(n=>n.addEventListener('click',()=>{let type=n.dataset.toggle,id=n.dataset.id;if(type==='seen'){markSeen(id);return}if(type==='star'){toggleStar(id);return}if(type==='reject'){reject(id);return}if(type==='restore'){restore(id);return}progress[type]=progress[type].includes(id)?progress[type].filter(x=>x!==id):[...progress[type],id];if(type==='visited'){if(progress.visited.includes(id)){progress.planned=progress.planned.filter(x=>x!==id);if(isNew(items().find(x=>x.id===id)||{}))progress.seen=[...new Set([...progress.seen,id])]}else{delete progress.ratings[id];if(progress.fav.includes(id))progress.planned=[...new Set([...progress.planned,id])]}}save();draw()}));document.querySelectorAll('[data-reason]').forEach(n=>n.addEventListener('change',()=>{let id=n.dataset.reason;if(progress.rejectedMeta[id]){progress.rejectedMeta[id].reason=reasons.includes(n.value)?n.value:reasons[0];save()}}));document.querySelectorAll('[data-note]').forEach(n=>n.addEventListener('input',()=>{let id=n.dataset.note;if(progress.rejectedMeta[id]){progress.rejectedMeta[id].note=n.value.slice(0,350);save(700)}}));document.dispatchEvent(new Event('bangkok:draw'));}
function exportProgress(){let o={app:'bangkok-curated',version:5,savedAt:new Date().toISOString(),...progress};download(JSON.stringify(o,null,2),'bangkok_marks.json','application/json')}
async function loadJsonFile(e,mode){let f=e.target.files?.[0];if(!f)return;try{let o=JSON.parse(await f.text());if(mode==='feed'){incoming=validFeed(o);putLS(CACHE_KEY,JSON.stringify(o));setStatus('Импортировано из файла','ok');}else{if(o?.schema===1&&o.records){syncJournal=mergeJournal(syncJournal,normalizeJournal(o));applyJournal(syncJournal);markSyncPending();queueSync();}else{if(!Array.isArray(o.fav)||!Array.isArray(o.visited))throw Error('Недопустимые отметки');progress=unifyStars({fav:cleanIds(o.fav),planned:cleanIds(o.planned),visited:cleanIds(o.visited),seen:cleanIds(o.seen),rejected:cleanIds(o.rejected),rejectedMeta:o.rejectedMeta&&typeof o.rejectedMeta==='object'&&!Array.isArray(o.rejectedMeta)?o.rejectedMeta:{},ratings:cleanRatings(o.ratings)});save()}}draw();el('notice').textContent='Импортировано'}catch(ex){el('notice').textContent='Ошибка: '+ex.message}e.target.value='';}

// Per-item/per-field timestamps allow devices to merge independent edits.
// D1 is authoritative; the existing local journal is retained for offline use and migration.
const CF_API='https://bangkok-feedback.vgleb.workers.dev';
const CF_TOKEN_KEY='bangkok-feedback-token-v1',SYNC_LOG_KEY='bangkok-github-journal-v1',SYNC_PENDING_KEY='bangkok-github-pending-v1',SYNC_SYNCED_KEY='bangkok-github-synced-v1',SYNC_MIGRATED_KEY='bangkok-cloudflare-migrated-v1';
const LEGACY_GH_CONF_KEY='bangkok-github-config-v1',LEGACY_GH_LOCAL_KEY='bangkok-github-token-v1',LEGACY_GH_FILE='travel/feedback.json';
const SYNC_FIELDS=['fav','planned','visited','seen','rejected','reason','note','rating'];
let syncToken='',syncJournal={},syncSnapshot=null,syncTimer=null,syncActive=null,syncDirty=false;
const clone=x=>JSON.parse(JSON.stringify(x));
const isoNow=()=>new Date().toISOString();
const syncStatus=(s,kind='')=>{el('cloudBrief').textContent=s;el('cloudBrief').className='cloud-status '+kind;};
const syncMessage=(s,kind='')=>{el('cfMessage').textContent=s;el('cfMessage').className='cloud-msg '+kind;};
const normalizeMeta=m=>({title:String(m?.title||'').slice(0,170),kind:String(m?.kind||'').slice(0,45),area:String(m?.area||'').slice(0,100)});
function journalItem(j,id){if(!j[id])j[id]={meta:normalizeMeta(items().find(x=>x.id===id)||progress.rejectedMeta[id]),fields:{}};return j[id]}
function normalizeJournal(o){
  if(!o||o.schema!==1||typeof o.records!=='object'||!o.records||Array.isArray(o.records))throw Error('Некорректный формат feedback');
  const out={};for(const [id,r] of Object.entries(o.records)){
    if(!/^[a-z0-9_-]{2,65}$/.test(id)||!r||typeof r!=='object')continue;
    const fields={};for(const k of SYNC_FIELDS){const v=r.fields?.[k];if(!v||typeof v.at!=='string'||Number.isNaN(Date.parse(v.at)))continue;
      const x=(k==='reason'||k==='note')?String(v.value||'').slice(0,k==='reason'?100:350):v.value;
      if(k==='rating'){if(x!==null&&!validRating(x))continue}
      else if(k!=='reason'&&k!=='note'&&typeof x!=='boolean')continue;
      fields[k]={value:x,at:v.at};
    }
    if(Object.keys(fields).length)out[id]={meta:normalizeMeta(r.meta),fields};
  }return out;
}
function syncDoc(j){return {schema:1,app:'bangkok-curated',updatedAt:isoNow(),records:j}}
function mergeJournal(a,b){const m=clone(a);for(const [id,r] of Object.entries(b)){
  const entry=journalItem(m,id);if(!entry.meta.title&&r.meta?.title)entry.meta=normalizeMeta(r.meta);
  for(const [k,v] of Object.entries(r.fields||{})){if(!entry.fields[k]||v.at>entry.fields[k].at)entry.fields[k]=clone(v)}
}return m}
function cacheJournal(){putLS(SYNC_LOG_KEY,JSON.stringify(syncDoc(syncJournal)))}
function journalSignature(j){const s=JSON.stringify(j);let v=2166136261;for(let i=0;i<s.length;i++){v^=s.charCodeAt(i);v=Math.imul(v,16777619)}return (v>>>0).toString(16)+':'+s.length}
function markSyncPending(){syncDirty=true;putLS(SYNC_PENDING_KEY,'1')}
function clearSyncPending(){syncDirty=false;localStorage.removeItem(SYNC_PENDING_KEY);putLS(SYNC_SYNCED_KEY,journalSignature(syncJournal))}
function legacyJournal(){const j={},ts='2000-01-01T00:00:00.000Z';
  for(const k of ['fav','planned','visited','seen','rejected'])for(const id of progress[k])journalItem(j,id).fields[k]={value:true,at:ts};
  for(const [id,rating] of Object.entries(progress.ratings))journalItem(j,id).fields.rating={value:rating,at:ts};
  for(const [id,m] of Object.entries(progress.rejectedMeta)){
    if(!progress.rejected.includes(id))continue;
    const r=journalItem(j,id);r.meta=normalizeMeta(m);
    if(m.reason)r.fields.reason={value:String(m.reason).slice(0,100),at:ts};
    if(m.note)r.fields.note={value:String(m.note).slice(0,350),at:ts};
  }return j;
}
function initSyncJournal(){try{syncJournal=normalizeJournal(JSON.parse(getLS(SYNC_LOG_KEY)))}catch(e){syncJournal=legacyJournal();cacheJournal()};syncSnapshot=clone(progress);syncDirty=getLS(SYNC_PENDING_KEY)==='1'||getLS(SYNC_SYNCED_KEY)!==journalSignature(syncJournal)}
function applyJournal(j){
  const p={fav:[],planned:[],visited:[],seen:[],rejected:[],rejectedMeta:{},ratings:{}};
  for(const [id,r] of Object.entries(j)){for(const k of ['fav','planned','visited','seen','rejected'])if(r.fields?.[k]?.value===true)p[k].push(id);
    if(validRating(r.fields?.rating?.value))p.ratings[id]=r.fields.rating.value;
    if(r.fields?.rejected?.value===true){const meta=r.meta||{},src=items().find(x=>x.id===id)||{};
      p.rejectedMeta[id]={title:meta.title||src.title||id,kind:meta.kind||src.kind||'',area:meta.area||src.area||'',reason:r.fields.reason?.value||'Не интересует',note:r.fields.note?.value||'',hiddenAt:r.fields.rejected?.at||isoNow()};
    }
  }
  progress=unifyStars(p);syncSnapshot=clone(progress);cacheJournal();putLS(PROGRESS_KEY,JSON.stringify(progress));draw();
}
function captureSyncChanges(syncDelay=0){
  if(!syncSnapshot){syncSnapshot=clone(progress);return false}
  let changed=false;const prev=syncSnapshot,ids=new Set([...Object.values(progress).filter(Array.isArray).flat(),...Object.values(prev).filter(Array.isArray).flat(),...Object.keys(progress.rejectedMeta),...Object.keys(prev.rejectedMeta),...Object.keys(progress.ratings),...Object.keys(prev.ratings||{})]);
  const now=isoNow();for(const id of ids){const deltas={};
    for(const k of ['fav','planned','visited','seen','rejected']){const a=prev[k].includes(id),b=progress[k].includes(id);if(a!==b)deltas[k]=b}
    const a=prev.rejectedMeta[id]||{},b=progress.rejectedMeta[id]||{};
    for(const k of ['reason','note'])if(String(a[k]||'')!==String(b[k]||''))deltas[k]=String(b[k]||'').slice(0,k==='reason'?100:350);
    const oldRating=prev.ratings?.[id],newRating=progress.ratings[id];
    if(oldRating!==newRating)deltas.rating=validRating(newRating)?newRating:null;
    if(Object.keys(deltas).length){const r=journalItem(syncJournal,id),src=items().find(x=>x.id===id)||b||a;
      r.meta=normalizeMeta(src);for(const [k,v] of Object.entries(deltas))r.fields[k]={value:v,at:now};changed=true}
  }
  syncSnapshot=clone(progress);if(changed){cacheJournal();markSyncPending();queueSync(syncDelay)};return changed;
}
const d64=s=>{const bytes=Uint8Array.from(atob(s.replace(/\s+/g,'')),c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)};
async function fetchTimed(url,opts={},timeout=12000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{return await fetch(url,{...opts,signal:controller.signal})}
  catch(e){if(e?.name==='AbortError')throw Error('Таймаут синхронизации — попробуй ещё раз');throw e}
  finally{clearTimeout(timer)}
}
async function cfRequest(method='GET',body=null){
  const rsp=await fetchTimed(CF_API+'/api/feedback',{method,headers:{Authorization:'Bearer '+syncToken,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  let data;try{data=await rsp.json()}catch(e){data={}}
  if(!rsp.ok)throw Error(rsp.status===401?'Неверный ключ синхронизации':'Cloudflare: HTTP '+rsp.status+' '+String(data.error||''));
  return data;
}
async function cfFetchJournal(){return normalizeJournal(await cfRequest())}
async function legacyGithubJournal(){
  if(getLS(SYNC_MIGRATED_KEY)==='1')return null;
  let conf=null;try{conf=JSON.parse(getLS(LEGACY_GH_CONF_KEY))}catch(e){}
  const token=sessionStorage.getItem(LEGACY_GH_LOCAL_KEY)||getLS(LEGACY_GH_LOCAL_KEY)||'';
  if(!conf?.owner||!conf?.repo||!token)return null;
  const endpoint='https://api.github.com/repos/'+encodeURIComponent(conf.owner)+'/'+encodeURIComponent(conf.repo)+'/contents/'+LEGACY_GH_FILE;
  const rsp=await fetchTimed(endpoint,{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'},cache:'no-store'},8000);
  if(!rsp.ok)throw Error('Старый GitHub feedback не прочитан: HTTP '+rsp.status);
  const data=await rsp.json();
  if(data.encoding!=='base64'||typeof data.content!=='string')throw Error('Старый GitHub feedback имеет неверный формат');
  return normalizeJournal(JSON.parse(d64(data.content)));
}
async function migrateLegacyGithub(){
  if(getLS(SYNC_MIGRATED_KEY)==='1')return false;
  try{
    const legacy=await legacyGithubJournal();
    if(legacy){syncJournal=mergeJournal(legacy,syncJournal);cacheJournal();markSyncPending()}
    putLS(SYNC_MIGRATED_KEY,'1');
    return !!legacy;
  }catch(e){
    syncMessage(String(e.message||e)+' · продолжу с локальными отметками.','pending');
    return false;
  }
}
async function cfSync(){
  if(syncActive||!syncToken)return syncActive;
  let synced=false;
  syncActive=(async()=>{
    syncStatus('☁ Синхронизация…','pending');
    try{
      const remote=await cfFetchJournal();
      const merged=mergeJournal(remote,syncJournal);
      const data=await cfRequest('PUT',syncDoc(merged));
      const saved=normalizeJournal(data);
      const ratingNotSaved=Object.entries(merged).some(([id,r])=>r.fields?.rating&&JSON.stringify(saved[id]?.fields?.rating)!==JSON.stringify(r.fields.rating));
      syncJournal=mergeJournal(saved,syncJournal);
      applyJournal(syncJournal);
      syncDirty=JSON.stringify(syncJournal)!==JSON.stringify(saved);
      if(syncDirty)putLS(SYNC_PENDING_KEY,'1');else clearSyncPending();
      const at=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
      if(ratingNotSaved){syncStatus('☁ Оценки не синхронизированы','bad');syncMessage('Облако пока не подтвердило сохранение оценок. Локальные данные сохранены.','bad')}
      else{syncStatus('☁ Сохранено · '+at,'good');syncMessage('D1 синхронизирован.','good');synced=true;}
    }catch(e){markSyncPending();syncStatus('☁ Не синхронизировано','bad');syncMessage(String(e.message||e),'bad')}
  })();
  try{return await syncActive}finally{syncActive=null;if(synced&&syncDirty&&syncToken)queueSync(0)}
}
function queueSync(delay=0){
  if(!syncToken){markSyncPending();syncStatus('Отметки сохранены на устройстве','pending');return}
  syncStatus('☁ Есть несохранённые изменения','pending');clearTimeout(syncTimer);syncTimer=setTimeout(()=>cfSync(),Math.max(0,delay));
}
async function cfConnect(){
  const tok=el('cfToken').value.trim()||syncToken;
  if(!tok){syncMessage('Введи ключ синхронизации.','bad');return}
  const old=syncToken;syncToken=tok;el('cfConnect').disabled=true;syncMessage('Проверка Cloudflare D1…');
  try{
    await cfFetchJournal();
    if(el('cfRemember').checked)putLS(CF_TOKEN_KEY,tok);else localStorage.removeItem(CF_TOKEN_KEY);
    sessionStorage.setItem(CF_TOKEN_KEY,tok);el('cfToken').value='';
    await migrateLegacyGithub();await cfSync();
  }catch(e){syncToken=old;syncMessage(String(e.message||e),'bad');syncStatus('☁ Ошибка подключения','bad')}
  finally{el('cfConnect').disabled=false}
}
function initCloud(){
  initSyncJournal();syncToken=sessionStorage.getItem(CF_TOKEN_KEY)||getLS(CF_TOKEN_KEY)||'';el('cfRemember').checked=!!getLS(CF_TOKEN_KEY)||!syncToken;
  if(syncToken){syncStatus('☁ Подключено — проверка…','pending');migrateLegacyGithub().then(()=>cfSync())}
  else syncStatus(syncDirty?'Отметки локально · облако не подключено':'Отметки сохранены на устройстве',syncDirty?'pending':'');
  window.addEventListener('online',()=>cfSync());document.addEventListener('visibilitychange',()=>{if(!document.hidden)cfSync()});
  setInterval(()=>{if(!document.hidden)cfSync()},120000);
}
el('cloudOpen').addEventListener('click',()=>{let section=el('cloudSetup');section.hidden=!section.hidden;el('cloudOpen').setAttribute('aria-expanded',String(!section.hidden))});
el('cfConnect').addEventListener('click',cfConnect);
el('cfSyncNow').addEventListener('click',async()=>{if(!syncToken){syncMessage('Сначала введи ключ синхронизации.','bad');return}await cfSync()});
el('cfDisconnect').addEventListener('click',()=>{clearTimeout(syncTimer);syncToken='';el('cfToken').value='';localStorage.removeItem(CF_TOKEN_KEY);sessionStorage.removeItem(CF_TOKEN_KEY);syncStatus('Отметки сохранены на устройстве','');syncMessage('Облачная синхронизация отключена. Локальные отметки сохранены.','good')});

initSaved();initCloud();draw();fetchUpdates();setInterval(fetchUpdates,30*60*1000);el('refresh').onclick=fetchUpdates;el('onlynew').onclick=()=>{S.newOnly=!S.newOnly;S.rejected=false;draw()};el('onlyplanned').onclick=()=>{S.planned=!S.planned;S.rejected=false;draw()};el('hidevisited').onclick=()=>{S.hide=!S.hide;S.rejected=false;draw()};el('priority').onclick=()=>{S.priority=!S.priority;S.rejected=false;draw()};el('rejected').onclick=()=>{S.rejected=!S.rejected;draw()};el('reset').onclick=()=>{Object.assign(S,{cat:'Все',query:'',area:'',date:'',hide:false,priority:false,newOnly:false,planned:false,rejected:false,sort:'rank'});draw()};el('search').oninput=e=>{S.query=e.target.value;S.rejected=false;draw()};el('area').onchange=e=>{S.area=e.target.value;S.rejected=false;draw()};el('date').onchange=e=>{S.date=e.target.value;S.rejected=false;draw()};el('sort').onchange=e=>{S.sort=e.target.value;draw()};el('exportData').onclick=exportProgress;el('exportFeedback').onclick=()=>download(rejectionText(),'bangkok_feedback_for_chatgpt.txt','text/plain;charset=utf-8');el('copyFeedback').onclick=copyFeedback;el('importData').onchange=e=>loadJsonFile(e,'marks');el('importFeed').onchange=e=>loadJsonFile(e,'feed');el('markAllSeen').onclick=()=>{progress.seen=[...new Set([...progress.seen,...items().filter(isNew).map(x=>x.id)])];save();draw()};el('saveFeed').onclick=()=>{let v=el('feedUrl').value.trim();if(!/^https:\/\//.test(v)){el('notice').textContent='Нужна публичная HTTPS-ссылка';return}feedUrl=v;putLS(FEED_KEY,v);fetchUpdates()};el('defaultFeed').onclick=()=>{feedUrl='./updates.json';putLS(FEED_KEY,feedUrl);el('feedUrl').value='';fetchUpdates()};el('saveOrigin').onclick=()=>{origin=el('originInput').value.trim()||O0;putLS(ORIGIN_KEY,origin);el('notice').textContent='Адрес сохранён для Google Maps. Оценки времени в карточках рассчитаны от TRIBE Living.';draw()};
