(function() {
  try {
    var saved = localStorage.getItem('pixibun-theme');
    var theme = saved === 'light' ? 'light' : 'dark';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_err) {
    // Safe fallback to dark theme if localStorage is restricted
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
