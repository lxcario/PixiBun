(function() {
  try {
    var savedTheme = localStorage.getItem('pixibun-studio-theme');
    // Theme ids come from src/lib/theme/themes.json; ThemeSync normalizes unknown ones after load.
    var studioTheme = /^[a-z][a-z0-9-]{0,31}$/.test(savedTheme || '') ? savedTheme : 'moonlit';
    var savedScheme = localStorage.getItem('pixibun-color-scheme') || localStorage.getItem('pixibun-theme');
    var colorScheme = savedScheme === 'light' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-studio-theme', studioTheme);
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    document.documentElement.setAttribute('data-theme', colorScheme);
    document.documentElement.style.colorScheme = colorScheme;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(colorScheme);
  } catch (_err) {
    document.documentElement.setAttribute('data-studio-theme', 'moonlit');
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
})();
