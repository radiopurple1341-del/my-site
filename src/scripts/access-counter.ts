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
  const maxBarH = 44;
  const mono = "font-family:'JetBrains Mono',monospace";

  const cols = data.map((d) => {
    const h = Math.round((d.count / max) * maxBarH);
    const label = d.date.slice(5).replace("-", "/");
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1">
      <div style="font-size:9px;color:var(--color-text);min-height:13px;${mono}">${d.count > 0 ? d.count : ""}</div>
      <div style="height:${maxBarH}px;display:flex;align-items:flex-end;width:100%;padding:0 2px;box-sizing:border-box">
        <div style="width:100%;height:${h}px;background:var(--color-accent);${d.count > 0 ? "min-height:2px" : ""}"></div>
      </div>
      <div style="font-size:9px;color:var(--color-text-muted);margin-top:3px;${mono}">${label}</div>
    </div>`;
  }).join("");

  return `<div style="display:flex;width:100%">${cols}</div>`;
}
