export function setAccessCount(n: number) {
  const el = document.getElementById("access-counter");
  if (!el) return;
  const digits = Number(el.dataset.digits ?? 6);
  const padded = String(n).padStart(digits, "0");
  el.innerHTML = padded
    .split("")
    .map((d) => `<span class="digit">${d}</span>`)
    .join("");
}

export function setAccessDelta(delta: number) {
  const el = document.querySelector<HTMLElement>(".counter-delta");
  if (!el) return;
  const sign = delta >= 0 ? "+" : "";
  el.textContent = `${sign}${delta} TODAY`;
}
