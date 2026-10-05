// Register only the public site shell. Private GitHub API data must never be cached.
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' }).then(registration => registration.update()).catch(() => {});
  });
}
