(function() {
  try {
    var saved = localStorage.getItem('pixibun-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved === 'light' ? 'light' : (saved === 'dark' ? 'dark' : (prefersDark ? 'dark' : 'dark'));
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_err) {
    // Safe fallback to dark theme if localStorage or matchMedia is restricted
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
