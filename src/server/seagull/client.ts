import { forwardedCookieHeader } from "./session";
import { parseSeagullXml, type ParseOptions } from "./xml";

export class SeagullError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "SeagullError";
  }
}

export class UnsupportedWidgetError extends SeagullError {
  constructor(widgetId: string, hint?: string) {
    super(`Unrecognized widget payload for id=${widgetId}${hint ? `: ${hint}` : ""}`, 422);
    this.name = "UnsupportedWidgetError";
  }
}

export interface SeagullCallOptions extends ParseOptions {
  /** Path appended to SEAGULL_BASE_URL, e.g. "/dashboards/list.xml" */
  path: string;
  method?: "GET" | "POST";
  /** For POST — raw string body (usually SOAP). */
  body?: string;
  contentType?: string;
}

export async function callSeagull(opts: SeagullCallOptions): Promise<unknown> {
  const base = process.env.SEAGULL_BASE_URL;
  if (!base) throw new Error("SEAGULL_BASE_URL is not set");

  const cookieHeader = await forwardedCookieHeader();
  const headers: Record<string, string> = {
    Accept: "application/xml, text/xml",
  };
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  if (opts.contentType) headers["Content-Type"] = opts.contentType;

  const response = await fetch(`${base.replace(/\/$/, "")}${opts.path}`, {
    method: opts.method ?? "GET",
    headers,
    ...(opts.body !== undefined ? { body: opts.body } : {}),
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new SeagullError(
      `seagull ${opts.path} failed: ${response.status}`,
      response.status,
      text,
    );
  }

  return parseSeagullXml(text, {
    ...(opts.arrayPaths !== undefined ? { arrayPaths: opts.arrayPaths } : {}),
  });
}

export interface SeagullJsonCallOptions {
  /** Path appended to SEAGULL_BASE_URL, e.g. "/opmon/seagull/www/index.php/wsconnector/action/savedashboard" */
  path: string;
  /** Raw form-encoded body (x-www-form-urlencoded). */
  body: string;
}

/**
 * POST a form-encoded body to a seagull endpoint that returns JSON.
 * Returns the parsed JSON as `unknown`; callers must Zod-validate.
 *
 * Used for the dashboard save endpoint, which returns `{output: N}` rather
 * than XML. `callSeagull` remains for the XML read path.
 */
export async function callSeagullJson(opts: SeagullJsonCallOptions): Promise<unknown> {
  const base = process.env.SEAGULL_BASE_URL;
  if (!base) throw new Error("SEAGULL_BASE_URL is not set");

  const cookieHeader = await forwardedCookieHeader();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (cookieHeader) headers["Cookie"] = cookieHeader;

  const response = await fetch(`${base.replace(/\/$/, "")}${opts.path}`, {
    method: "POST",
    headers,
    body: opts.body,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new SeagullError(
      `seagull ${opts.path} failed: ${response.status}`,
      response.status,
      text,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (err) {
    throw new SeagullError(
      `seagull ${opts.path} returned non-JSON: ${err instanceof Error ? err.message : String(err)}`,
      response.status,
      text,
    );
  }
}
