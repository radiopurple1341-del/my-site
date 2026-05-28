export function setAccessCount(n: number) {
  const el = document.getElementById("access-counter");
  if (!el) return;
  const digits = Number(el.dataset.digits ?? 6);
  const padded = String(n).padStart(digits, "0");
  const spans = el.querySelectorAll<HTMLElement>(".digit");
  spans.forEach((span, i) => {
    span.textContent = padded[i] ?? "0";
  });
}

export function setAccessDelta(delta: number) {
  const el = document.querySelector<HTMLElement>(".counter-delta");
  if (!el) return;
  const sign = delta >= 0 ? "+" : "";
  el.textContent = `${sign}${delta} TODAY`;
}
