import { describe, it, expect } from "vitest";
import { parseSeagullXml } from "@/server/seagull/xml";

describe("parseSeagullXml", () => {
  it("parses a single element", () => {
    const xml = `<?xml version="1.0"?><root><a>1</a></root>`;
    expect(parseSeagullXml(xml)).toEqual({ root: { a: "1" } });
  });

  it("forces arrays even when there is only one element", () => {
    const xml = `<?xml version="1.0"?><root><items><item>a</item></items></root>`;
    const result = parseSeagullXml(xml, { arrayPaths: ["root.items.item"] });
    expect(result).toEqual({ root: { items: { item: ["a"] } } });
  });

  it("preserves array for multiple elements with isArray", () => {
    const xml = `<?xml version="1.0"?><root><items><item>a</item><item>b</item></items></root>`;
    const result = parseSeagullXml(xml, { arrayPaths: ["root.items.item"] });
    expect(result).toEqual({ root: { items: { item: ["a", "b"] } } });
  });

  it("throws on malformed XML", () => {
    expect(() => parseSeagullXml("<root><broken")).toThrow();
  });
});
