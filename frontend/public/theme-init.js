(function () {
  function storedPreferences() {
    try {
      var rows = JSON.parse(localStorage.getItem("jx-preferences") || "{}");
      var row = rows && rows["s:browser"];
      return (row && row.data) || {};
    } catch {
      return {};
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
  var preferences = storedPreferences();

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
