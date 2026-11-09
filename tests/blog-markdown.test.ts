import { describe, expect, it } from "vitest";
import { blogHtmlToMarkdown, markdownToBlogHtml, safeBlogLink, type BlogHtmlNode } from "../src/lib/blog-markdown";

function text(value: string): BlogHtmlNode {
  return { nodeType: 3, textContent: value, childNodes: [] };
}

function element(tagName: string, children: BlogHtmlNode[], attributes: Record<string, string> = {}): BlogHtmlNode {
  return {
    nodeType: 1,
    textContent: children.map((child) => child.textContent ?? "").join(""),
    childNodes: children,
    tagName,
    getAttribute: (name) => attributes[name] ?? null,
  };
}

describe("blog Markdown conversion", () => {
  it("preserves headings, emphasis, links, and grouped lists in the editor HTML", () => {
    const html = markdownToBlogHtml(
      "# Kerala\n\nVisit **Munnar** and *Alleppey* with [our guide](https://example.com/guide).\n- Tea gardens\n- Houseboat",
    );

    expect(html).toContain("<h1>Kerala</h1>");
    expect(html).toContain("<strong>Munnar</strong>");
    expect(html).toContain("<em>Alleppey</em>");
    expect(html).toContain('<a href="https://example.com/guide" target="_blank" rel="noopener noreferrer">our guide</a>');
    expect(html).toContain("<ul><li>Tea gardens</li><li>Houseboat</li></ul>");
  });

  it("escapes content and rejects unsafe Markdown link protocols", () => {
    const html = markdownToBlogHtml(
      `<img src=x onerror=alert(1)> [unsafe](javascript:alert(1))`,
    );

    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("[unsafe](javascript:alert(1))");
    expect(safeBlogLink("javascript:alert(1)")).toBeNull();
    expect(safeBlogLink("mailto:editor@example.com")).toBe("mailto:editor@example.com");
  });

  it("normalizes relative editor links to the current origin", () => {
    expect(safeBlogLink("/packages/kerala", "https://itera.example")).toBe("https://itera.example/packages/kerala");
    expect(safeBlogLink("//evil.example/path", "https://itera.example")).toBe("https://evil.example/path");
  });

  it("serializes editor links, emphasis, and list items back to Markdown", () => {
    const root = element("div", [
      element("p", [
        text("Read "),
        element("strong", [text("this")]),
        text(" and "),
        element("a", [text("follow the guide")], { href: "/guide" }),
      ]),
      element("p", [element("br", [])]),
      element("ul", [
        element("li", [text("First stop")]),
        element("li", [element("em", [text("Second stop")])]),
      ]),
    ]);

    expect(blogHtmlToMarkdown(root, "https://itera.example")).toBe(
      "Read **this** and [follow the guide](https://itera.example/guide)\n\n- First stop\n- *Second stop*",
    );
  });

  it("does not preserve unsafe editor link targets", () => {
    const root = element("div", [
      element("p", [element("a", [text("unsafe")], { href: "javascript:alert(1)" })]),
    ]);

    expect(blogHtmlToMarkdown(root, "https://itera.example")).toBe("unsafe");
  });
});
