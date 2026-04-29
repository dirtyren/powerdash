import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface ParseOptions {
  /** Dot-separated paths where children must always be arrays. */
  arrayPaths?: string[];
}

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
