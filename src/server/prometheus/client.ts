export class PrometheusError extends Error {
  constructor(
    public readonly status: number,
    public readonly upstreamBody?: string,
    message?: string,
  ) {
    super(message ?? `Prometheus upstream error: HTTP ${status}`);
    this.name = "PrometheusError";
  }
}

export async function callPrometheus(
  path: string,
  params: URLSearchParams,
): Promise<unknown> {
  const base = (process.env.PROMETHEUS_BASE_URL ?? "http://localhost:9090").replace(/\/$/, "");
  const url = `${base}${path}?${params.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const body = await r.text().catch(() => undefined);
    throw new PrometheusError(r.status, body);
  }
  return r.json();
}
