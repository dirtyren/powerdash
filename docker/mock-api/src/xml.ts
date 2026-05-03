import type { StoredDashboard, Widget } from "./types";

export function escapeXML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function serializeList(dashboards: StoredDashboard[]): string {
  const items = dashboards
    .map(
      (d) => `
    <dashboard>
      <id>${escapeXML(d.id)}</id>
      <name>${escapeXML(d.name)}</name>
      <owner>${escapeXML(d.owner)}</owner>
    </dashboard>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <dashboards>${items}
  </dashboards>
</response>`;
}

export function serializeDetail(d: StoredDashboard): string {
  const widgets = d.widgets.map(serializeWidget).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <dashboard>
    <id>${escapeXML(d.id)}</id>
    <name>${escapeXML(d.name)}</name>
    <owner>${escapeXML(d.owner)}</owner>
    <width>${d.width}</width>
    <height>${d.height}</height>
    <widgets>${widgets}
    </widgets>
  </dashboard>
</response>`;
}

function serializeWidget(w: Widget): string {
  const query = w.query ? serializeQuery(w.query) : "";
  return `
      <widget>
        <id>${escapeXML(w.id)}</id>
        <kind>${escapeXML(w.kind)}</kind>
        <title>${escapeXML(w.title)}</title>
        <x>${w.x}</x>
        <y>${w.y}</y>
        <w>${w.w}</w>
        <h>${w.h}</h>${query}
      </widget>`;
}

function serializeQuery(q: NonNullable<Widget["query"]>): string {
  const step = q.step !== undefined ? `
          <step>${q.step}</step>` : "";
  return `
        <query>
          <expr>${escapeXML(q.expr)}</expr>${step}
        </query>`;
}
