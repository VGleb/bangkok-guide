/* Bangkok Guide map: same-origin catalog state; geolocation never stored or uploaded. */
(function () {
  'use strict';
  const HOME = [13.73716,100.5709]; // TRIBE Living: official Accor GPS
  // Known building positions where available; "false" means a representative
  // neighborhood position, not the exact storefront. Maps links resolve the venue.
  const PLACES = {
    artbangkok:[13.74680,100.53494,true],vwestwood:[13.74491,100.54637,false],
    kunstmelt:[13.740286,100.514892,true],kunstwfire:[13.740286,100.514892,true],
    tcdcliving:[13.72710,100.51570,true],tcdcmaterial:[13.72710,100.51570,true],
    nic:[13.7058,100.5124,false],bkcaw:[13.7400,100.5270,false],
    reefs:[13.7520,100.5070,false],comics:[13.74675,100.53027,true],
    baccgalleries:[13.74675,100.53027,true],dib:[13.7233,100.5860,false],
    octavemaze:[13.7490,100.5190,false],munins:[13.73035,100.51326,true],
    kitti:[13.73035,100.51326,true],stress:[13.7286,100.5161,false],
    weeknd:[13.72709,100.54728,true],ragtagone:[13.72709,100.54728,true],
    ragtagcw:[13.74652,100.53901,true], '2ndbrand':[13.74652,100.53901,true],
    '2ndgeneral':[13.74652,100.53901,true],sunday:[13.7376,100.5190,false],
    tokyojoe:[13.7311,100.57058,false],hdkk:[13.7452,100.5325,false],
    garcon:[13.7368,100.5066,false],ssstore:[13.7369,100.5070,false],
    spacebar:[13.7476,100.5232,false],happening:[13.74675,100.53027,true],
    iwanna:[13.7272,100.5310,false],paga:[13.7329,100.5659,false],
    ceresia:[13.7310,100.5763,false],terroir:[13.7371,100.5067,false],
    gallerydrip:[13.74675,100.53027,true],songwat:[13.7372,100.5066,false],
    talatnoi:[13.7351,100.5148,false],benjakitti:[13.7284,100.5580,false],
    hardrockcafe:[13.7438,100.5440,false],
    'kaku-uchi-sukhumvit39':[13.7363,100.5725,false],
    'cheeky-sake-thonglor13':[13.73336,100.58140,false],
    'on-one-bangkok':[13.72709,100.54728,true],
    'on-iconsiam':[13.726694,100.510498,true],
    'tnf-central-park':[13.72843,100.53757,true],
    'tnf-centralworld':[13.74652,100.53901,true],
    'tnf-siam-discovery':[13.7470,100.5310,false],
    'tnf-iconsiam':[13.726694,100.510498,true],
    'tnf-rama9':[13.75859,100.56609,true],
    'tnf-ladprao':[13.81659,100.56085,true],
    'tnf-pinklao':[13.7771,100.4747,false]
  };
  const AREAS = {
    Siam:[13.7458,100.5325],Chidlom:[13.7450,100.5450],
    'Old Town':[13.7432,100.5153],'Charoen Krung':[13.7269,100.5160],
    Sukhumvit:[13.7348,100.5734],Lumphini:[13.7292,100.5450],
    'Phrom Phong':[13.7360,100.5718],Thonglor:[13.7334,100.5812],'Thong Lo':[13.7334,100.5812],
    Ekkamai:[13.7226,100.5852],'Phrom Phong / Thong Lo':[13.7298,100.5760],
    'Song Wat':[13.7372,100.5066],Silom:[13.7279,100.5315],
    'Khlong San':[13.726694,100.510498],'Rama 9':[13.75859,100.56609],
    Chatuchak:[13.81659,100.56085],Pinklao:[13.7771,100.4747],
    'Разные районы':[13.7400,100.5270]
  };
  const COLORS = {'События':'#b96b31','Выставки':'#8d65a6','Дизайн':'#547ba1',
    'Ресейл':'#74665b','Магазины':'#48817d','Спорт':'#4684bd','Кофе':'#9c7351',
    'Еда и бары':'#a95b5b','Районы':'#617853','Природа':'#4c8a57'};
  let map=null,layer=null,homePin=null,userPin=null,userCircle=null,userPosition=null,mapVisible=false;
  let activeMarkerCount=-1;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const google=x=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(x.mapQuery||((x.title||'')+' '+(x.venue||'')+' Bangkok Thailand'));
  const directions=x=>'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(userPosition?userPosition.join(','):origin)+'&destination='+encodeURIComponent(x.mapQuery||((x.title||'')+' '+(x.venue||'')+' Bangkok Thailand'))+'&travelmode=transit';
  const wanted=x=>progress.fav.includes(x.id)||progress.planned.includes(x.id);
  const knownCoord=x=>{
    const point=PLACES[x.id];
    if(point)return point;
    if(Array.isArray(x.geo)&&x.geo.length===2&&x.geo.every(Number.isFinite)&&x.geo[0]>13.4&&x.geo[0]<14.1&&x.geo[1]>100.2&&x.geo[1]<101)return [x.geo[0],x.geo[1],true];
    if(x.geo&&Number.isFinite(x.geo.lat)&&Number.isFinite(x.geo.lng)&&x.geo.lat>13.4&&x.geo.lat<14.1&&x.geo.lng>100.2&&x.geo.lng<101)return [x.geo.lat,x.geo.lng,true];
    const query=String(x.mapQuery||x.venue||'').toLowerCase();
    if(query.includes('iconsiam'))return [13.726694,100.510498,true];
    if(query.includes('centralworld'))return [13.74652,100.53901,true];
    if(query.includes('one bangkok'))return [13.72709,100.54728,true];
    if(query.includes('river city'))return [13.73035,100.51326,true];
    if(query.includes('bacc')||query.includes('bangkok art and culture'))return [13.74675,100.53027,true];
    if(query.includes('tcdc')||query.includes('grand postal'))return [13.72710,100.51570,true];
    if(query.includes('dib bangkok'))return [13.7233,100.5860,false];
    if(query.includes('siam paragon'))return [13.74680,100.53494,true];
    if(query.includes('bangkok kunsthalle'))return [13.740286,100.514892,true];
    const area=AREAS[x.area]||[13.744,100.525];
    return [area[0],area[1],false];
  };
  function filtered(){
    const all=items();
    let z=S.rejected?all.filter(x=>progress.rejected.includes(x.id)):
      all.filter(x=>!progress.rejected.includes(x.id));
    const q=S.query.toLocaleLowerCase('ru').trim();
    return z.filter(x=>!isExpired(x)&&(S.cat==='Все'||tagsOf(x).includes(S.cat))&&(!S.area||S.area===x.area)&&liveOn(x,S.date)&&
      (!S.planned||wanted(x))&&(!S.hide||!progress.visited.includes(x.id))&&
      (!S.priority||x.priority>=3)&&(!S.newOnly||isNew(x))&&
      (!q||[x.title,x.blurb,x.area,x.venue,x.notes,tagsOf(x).join(' ')].join(' ').toLocaleLowerCase('ru').includes(q)));
  }
  function pointIcon(points,precise){
    let saved=points.some(wanted),cancel=points.every(x=>x.status==='cancelled');
    let color=COLORS[CORE_TAGS.find(t=>tagsOf(points[0]).includes(t))]||'#325d43';
    const html='<span class="map-point'+(!precise?' approx':'')+(saved?' saved':'')+(cancel?' canceled':'')+
      '" style="'+(saved||cancel?'':'--pin:'+color+';')+'" title="'+(precise?'Площадка':'Примерный район')+'">'+
      (saved?'★':points.length>1?points.length:'●')+'</span>';
    return L.divIcon({html:html,className:'',iconSize:[33,33],iconAnchor:[16,16],popupAnchor:[0,-17]});
  }
  function popupEntry(x,precise){
    const isPlanned=wanted(x),visited=progress.visited.includes(x.id);
    return '<div class="place"><h3>'+esc(x.title)+'</h3><p class="meta">'+
      esc(tagsOf(x).join(' · '))+' · '+esc(x.area)+(precise?'':' · ≈ расположение')+
      (isPlanned?' · ★ В плане':'')+(visited?' · ✓ Посещено':'')+'</p>'+
      (x.venue?'<p>'+esc(x.venue)+'</p>':'')+
      (x.id==='bkcaw'?'<p class="meta">Мероприятие на нескольких площадках: маркер показывает центральную часть города.</p>':'')+
      '<div class="buttons">'+
      '<button type="button" data-map-star="'+esc(x.id)+'" class="'+(isPlanned?'chosen':'')+'">'+(isPlanned?'★ Убрать':'☆ Хочу')+'</button>'+
      '<button type="button" data-map-visit="'+esc(x.id)+'">'+(visited?'↶ Не посещено':'✓ Посетил')+'</button>'+
      '<a href="'+esc(google(x))+'" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>'+
      '<a href="'+esc(directions(x))+'" target="_blank" rel="noopener noreferrer">Маршрут ↗</a>'+
      '</div></div>';
  }
  function update(){
    if(!map||!mapVisible)return;
    layer.clearLayers();
    const visible=filtered(),groups=new Map(),bounds=[HOME],approx=[];
    visible.forEach(x=>{
      const c=knownCoord(x);
      const key=c[0].toFixed(5)+','+c[1].toFixed(5);
      if(!groups.has(key))groups.set(key,{coord:c,places:[]});
      groups.get(key).places.push(x);
      if(!c[2])approx.push(x.id);
    });
    for(const group of groups.values()){
      const c=group.coord,arr=group.places;
      const pin=L.marker([c[0],c[1]],{icon:pointIcon(arr,c[2])}).addTo(layer);
      const html='<div class="map-popup">'+(arr.length>1?'<p class="meta">'+arr.length+' места в одной точке</p>':'')+
        arr.map(x=>popupEntry(x,c[2])).join('')+'</div>';
      pin.bindPopup(html,{maxWidth:300,maxHeight:Math.min(420,Math.round(window.innerHeight*0.58)),autoPanPadding:[15,25]});
      bounds.push([c[0],c[1]]);
    }
    $('mapStatus').textContent=visible.length+' мест на карте'+(approx.length?' · '+approx.length+' точек ≈':'' )+
      (userPosition?' · геолокация включена':'');
    if(activeMarkerCount<0 && bounds.length>1){
      const allBounds=L.latLngBounds(bounds);
      if(allBounds.isValid())map.fitBounds(allBounds.pad(0.09),{maxZoom:13,animate:false});
    }
    activeMarkerCount=visible.length;
  }
  function setup(){
    if(map)return true;
    if(!window.L){$('mapStatus').textContent='Не удалось загрузить карту. Проверь интернет; ссылки Google Maps работают в каталоге.';return false;}
    map=L.map('bangkokMap',{zoomControl:true,scrollWheelZoom:false}).setView([13.739,100.535],12);
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',{
      attribution:'&copy; <a href="https://stadiamaps.com/attribution/" target="_blank" rel="noopener">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      maxZoom:20,updateWhenIdle:true,keepBuffer:2
    }).addTo(map);
    layer=L.layerGroup().addTo(map);
    const homeIcon=L.divIcon({html:'<span class="map-home" title="Дом — TRIBE Living">⌂</span>',
      iconSize:[42,42],iconAnchor:[21,21],className:'',popupAnchor:[0,-22]});
    homePin=L.marker(HOME,{icon:homeIcon,zIndexOffset:1000}).addTo(map)
      .bindPopup('<div class="map-popup"><h3>⌂ Дом · TRIBE Living</h3><p>122 Soi Sukhumvit 39</p><a href="https://www.google.com/maps/search/?api=1&query=TRIBE%20Living%20Bangkok%20Sukhumvit%2039" target="_blank" rel="noopener noreferrer">Открыть Google Maps ↗</a></div>');
    $('bangkokMap').addEventListener('click',e=>{
      const a=e.target.closest('[data-map-star],[data-map-visit]');
      if(!a)return;
      const id=a.getAttribute('data-map-star')||a.getAttribute('data-map-visit');
      if(!id||!items().some(x=>x.id===id))return;
      if(a.hasAttribute('data-map-star'))toggleStar(id);
      else{
        const next=!progress.visited.includes(id);
        progress.visited=next?[...new Set([...progress.visited,id])]:progress.visited.filter(x=>x!==id);
        if(next){progress.planned=progress.planned.filter(x=>x!==id);progress.seen=[...new Set([...progress.seen,id])];}
        else if(progress.fav.includes(id))progress.planned=[...new Set([...progress.planned,id])];
        save();draw();
      }
    });
    update();
    return true;
  }
  function switchView(next){
    mapVisible=next==='map';
    $('viewList').classList.toggle('active',!mapVisible);
    $('viewMap').classList.toggle('active',mapVisible);
    $('viewList').setAttribute('aria-pressed',String(!mapVisible));
    $('viewMap').setAttribute('aria-pressed',String(mapVisible));
    $('listView').hidden=mapVisible;
    $('mapView').hidden=!mapVisible;
    if(mapVisible)requestAnimationFrame(()=>{
      if(setup()){map.invalidateSize();update();}
    });
    history.replaceState(null,'',window.location.pathname+window.location.search+(mapVisible?'#map':''));
  }
  function showHome(){
    if(!map)return;
    map.setView(HOME,15,{animate:true});homePin.openPopup();
  }
  function locateMe(){
    if(!navigator.geolocation){$('mapStatus').textContent='Геолокация недоступна в этом браузере';return;}
    $('mapStatus').textContent='Запрашиваю доступ к геолокации…';
    navigator.geolocation.getCurrentPosition(position=>{
      if(!map||!mapVisible)return;
      const ll=[position.coords.latitude,position.coords.longitude];
      userPosition=ll;
      if(userPin)map.removeLayer(userPin);
      if(userCircle)map.removeLayer(userCircle);
      userCircle=L.circle(ll,{radius:Math.max(5,position.coords.accuracy||0),color:'#1970ed',fillColor:'#1970ed',fillOpacity:0.10,weight:1,interactive:false}).addTo(map);
      userPin=L.marker(ll,{icon:L.divIcon({html:'<span class="map-user" title="Вы здесь"></span>',
        className:'',iconSize:[24,24],iconAnchor:[12,12]}),zIndexOffset:2000}).addTo(map).bindPopup('Вы здесь · точность ≈ '+Math.round(position.coords.accuracy||0)+' м');
      map.setView(ll,15,{animate:true});
      $('mapStatus').textContent='Геолокация показана только на этом устройстве и не сохраняется';
    },error=>{
      $('mapStatus').textContent=error.code===1?'Геолокация запрещена. Разреши доступ в настройках браузера.':'Не удалось определить местоположение. Нужны GPS и интернет.';
    },{enableHighAccuracy:true,timeout:12000,maximumAge:120000});
  }
  function fitAll(){
    if(!map)return;
    activeMarkerCount=-1;update();
    if(!filtered().length)map.setView(HOME,13);
  }
  function init(){
    if(!$('viewList')||!$('viewMap')||!$('mapView'))return;
    $('viewList').addEventListener('click',()=>switchView('list'));
    $('viewMap').addEventListener('click',()=>switchView('map'));
    $('mapHome').addEventListener('click',showHome);
    $('mapLocate').addEventListener('click',locateMe);
    $('mapFit').addEventListener('click',fitAll);
    const nativeDraw=window.draw;
    if(typeof nativeDraw==='function'&&!nativeDraw.__bangkokMapWrapped){
      const wrapped=function(...args){const out=nativeDraw.apply(this,args);document.dispatchEvent(new Event('bangkok:draw'));return out};
      wrapped.__bangkokMapWrapped=true;window.draw=wrapped;
    }
    document.addEventListener('bangkok:draw',()=>{if(mapVisible)update()});
    if(window.location.hash==='#map')history.replaceState(null,'',window.location.pathname+window.location.search); // Every fresh app launch starts with catalog tiles.
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
