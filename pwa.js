// Register only the public site shell. Private GitHub API data must never be cached.
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  let reloadingForUpdate=false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(reloadingForUpdate)return;
    reloadingForUpdate=true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' }).then(registration => registration.update()).catch(() => {});
  });
}
