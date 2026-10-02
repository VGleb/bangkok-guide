/* Shared curated places source: public places.json. Browser cache is an offline fallback only. */
(() => {
  'use strict';
  const CACHE_KEY='bkk-curated-places-cache-v1';
  let loaded=false;
  function applyCatalog(doc) {
    if(!doc||doc.version!==1||!Array.isArray(doc.items)||doc.items.length<1)throw Error('Invalid places.json');
    const ids=new Set();
    for(const p of doc.items) {
      if(!p||typeof p.id!=='string'||!/^[a-z0-9_-]{2,65}$/.test(p.id)||ids.has(p.id))throw Error('Duplicate or invalid place ID');
      if(typeof p.title!=='string'||!p.title||typeof p.kind!=='string'||!CATEGORIES.includes(p.kind)||p.kind==='Все'||typeof p.area!=='string')throw Error('Invalid place');
      ids.add(p.id);
    }
    BASE.splice(0,BASE.length,...doc.items);
    const oldSeen=progress.seen.join(',');
    unifyStars(progress);
    if(oldSeen!==progress.seen.join(','))save();
    loaded=true;
    draw();
    document.dispatchEvent(new Event('bangkok:draw'));
  }
  try {
    const previous=localStorage.getItem(CACHE_KEY);
    if(previous)applyCatalog(JSON.parse(previous));
  } catch(e) {
    // Invalid offline data must never prevent an online refresh.
  }
  fetch('./places.json',{cache:'no-store'}).then(response=>{
    if(!response.ok)throw Error('HTTP '+response.status);
    return response.json();
  }).then(doc=>{
    applyCatalog(doc);
    try{localStorage.setItem(CACHE_KEY,JSON.stringify(doc))}catch(e){}
  }).catch(()=>{
    if(!loaded) {
      const status=document.getElementById('count');
      if(status)status.textContent='Каталог недоступен без интернета — обнови страницу при подключении';
    }
  });
})();
