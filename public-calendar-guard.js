const grid = document.getElementById("publicCalendarGrid");
if (grid) {
  let ownRender = false;
  const observer = new MutationObserver(() => {
    if (ownRender) return;
    const infinite = grid.querySelector(".infinite-calendar");
    const cards = grid.querySelectorAll(".infinite-day").length;
    if (!infinite || cards < 20) {
      window.dispatchEvent(new CustomEvent("pool:restore-infinite-calendar"));
    }
  });
  observer.observe(grid, { childList: true, subtree: true });
  window.addEventListener("pool:infinite-render-start", () => { ownRender = true; });
  window.addEventListener("pool:infinite-render-end", () => { queueMicrotask(() => { ownRender = false; }); });
}
