(function () {
  try {
    var stored = localStorage.getItem("jx-theme");
    var prefersDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = stored ? stored === "dark" : prefersDark;
    if (isDark) document.documentElement.classList.add("dark");
  } catch {
    document.documentElement.classList.remove("dark");
  }
})();
