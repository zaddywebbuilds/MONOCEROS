import { describe, expect, it } from "vitest";

import { jsonLdHtml } from "@/lib/json-ld";

describe("jsonLdHtml", () => {
  it("escapes < so a closing script tag cannot break out", () => {
    const html = jsonLdHtml({ answer: "</script><img src=x onerror=alert(1)>" });

    expect(html).not.toContain("</script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("\\u003c");
  });

  it("leaves the data itself intact once parsed", () => {
    const payload = { name: "Monoceros", note: "5 < 10 & fine" };

    expect(JSON.parse(jsonLdHtml(payload))).toEqual(payload);
  });

  it("escapes every occurrence, not just the first", () => {
    const html = jsonLdHtml({ a: "<one>", b: "<two>" });

    expect(html).not.toContain("<");
    expect(html.match(/\\u003c/g)).toHaveLength(2);
  });
});
