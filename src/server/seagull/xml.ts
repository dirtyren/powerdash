import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface ParseOptions {
  /** Dot-separated paths where children must always be arrays. */
  arrayPaths?: string[];
}

/**
 * Parse a seagull SOAP/XML response into a plain object tree.
 *
 * All tag and attribute values are returned as **strings** regardless of content
 * (tag values, attribute values, and CDATA are never auto-parsed). Downstream Zod
 * schemas must use `z.coerce.number()` — not `z.number()` — for numeric fields,
 * or `z.coerce.boolean()` for boolean-ish fields.
 *
 * Whitespace is trimmed from all values (`trimValues: true`). If an endpoint ever
 * needs to preserve leading/trailing whitespace, widen this wrapper before relying
 * on it.
 *
 * Throws on malformed XML with a message that includes the offending line number.
 */
export function parseSeagullXml(xml: string, opts: ParseOptions = {}): unknown {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new Error(`Invalid XML at line ${validation.err.line}: ${validation.err.msg}`);
  }

  const arrayPaths = new Set(opts.arrayPaths ?? []);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: true,
    ignoreDeclaration: true,
    isArray: (_name, jpath) => arrayPaths.has(jpath),
  });

  return parser.parse(xml) as unknown;
}
