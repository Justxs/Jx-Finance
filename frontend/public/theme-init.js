(function () {
  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storedPreferences() {
    try {
      var rows = JSON.parse(read("jx-preferences") || "{}");
      var row = rows && rows["s:browser"];
      return (row && row.data) || null;
    } catch {
      return null;
    }
  }

  function prefersDark() {
    try {
      return globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  }

  var root = document.documentElement;
  var preferences = storedPreferences() || {
    theme: read("jx-theme"),
    palette: read("jx-palette"),
    font: read("jx-font"),
    textSize: read("jx-text-size"),
  };

  var theme = preferences.theme;
  var isDark = theme === "light" || theme === "dark" ? theme === "dark" : prefersDark();
  if (isDark) root.classList.add("dark");

  var palettes = ["plum", "sepia", "graphite"];
  if (palettes.indexOf(preferences.palette) !== -1) {
    root.dataset.palette = preferences.palette;
  }
  var fonts = ["sans", "serif", "system", "inter", "hyperlegible", "plex", "editorial"];
  if (fonts.indexOf(preferences.font) !== -1) {
    root.dataset.font = preferences.font;
  }
  if (preferences.textSize === "small" || preferences.textSize === "large") {
    root.dataset.textSize = preferences.textSize;
  }
})();
