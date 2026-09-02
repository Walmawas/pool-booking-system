const grid = document.getElementById("publicCalendarGrid");
if (grid) {
  let cached = "";
  let restoring = false;
  const capture = () => {
    if (restoring) return;
    if (grid.querySelector(".infinite-calendar") && grid.querySelectorAll(".infinite-day").length >= 20) cached = grid.innerHTML;
  };
  const restore = () => {
    if (restoring || !cached) return;
    restoring = true;
    grid.innerHTML = cached;
    restoring = false;
  };
  const observer = new MutationObserver(() => {
    if (grid.querySelector(".infinite-calendar") && grid.querySelectorAll(".infinite-day").length >= 20) capture();
    else if (cached) queueMicrotask(restore);
  });
  observer.observe(grid, { childList: true, subtree: true });
}
