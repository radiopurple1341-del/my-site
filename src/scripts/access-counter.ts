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

export function initHistoryPopup() {
  const widget = document.getElementById("counter-widget");
  if (!widget) return;

  let loaded = false;

  async function loadChart() {
    if (loaded) return;
    loaded = true;
    const chartEl = document.getElementById("history-chart");
    if (!chartEl) return;
    try {
      const res = await fetch("/api/counter/history");
      const data: { date: string; count: number }[] = await res.json();
      chartEl.innerHTML = renderChart(data);
    } catch {}
  }

  widget.addEventListener("mouseenter", loadChart);
  widget.addEventListener("click", (e) => {
    e.stopPropagation();
    widget.classList.toggle("history-open");
    loadChart();
  });
  document.addEventListener("click", () => {
    widget.classList.remove("history-open");
  });
}

function renderChart(data: { date: string; count: number }[]): string {
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = 80;
  const gap = 20;
  const chartH = 50;
  const totalW = data.length * (barW + gap) - gap;

  const bars = data
    .map((d, i) => {
      const x = i * (barW + gap);
      const barH = Math.round((d.count / max) * chartH);
      const y = chartH - barH;
      const label = d.date.slice(5).replace("-", "/");
      return [
        `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="var(--color-accent)" rx="1"/>`,
        `<text x="${x + barW / 2}" y="${chartH + 14}" text-anchor="middle" font-size="11" fill="var(--color-text-muted)">${label}</text>`,
        d.count > 0
          ? `<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="10" fill="var(--color-text)">${d.count}</text>`
          : "",
      ].join("");
    })
    .join("");

  return `<svg viewBox="0 0 ${totalW} ${chartH + 18}" width="100%" style="display:block;overflow:visible;font-family:'JetBrains Mono',monospace">${bars}</svg>`;
}
