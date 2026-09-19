(function () {
  try {
    var stored = localStorage.getItem("jx-theme");
    var prefersDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = stored ? stored === "dark" : prefersDark;
    if (isDark) document.documentElement.classList.add("dark");
    var palette = localStorage.getItem("jx-palette");
    if (palette === "plum" || palette === "sepia" || palette === "graphite") {
      document.documentElement.dataset.palette = palette;
    }
    var font = localStorage.getItem("jx-font");
    var fonts = ["sans", "serif", "system", "inter", "hyperlegible", "plex", "editorial"];
    if (fonts.indexOf(font) !== -1) {
      document.documentElement.dataset.font = font;
    }
    var textSize = localStorage.getItem("jx-text-size");
    if (textSize === "small" || textSize === "large") {
      document.documentElement.dataset.textSize = textSize;
    }
  } catch {
    document.documentElement.classList.remove("dark");
  }
})();
