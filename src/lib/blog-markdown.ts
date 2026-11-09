const inlineMarkdownPattern = /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

export interface BlogHtmlNode {
  nodeType: number;
  textContent: string | null;
  childNodes: ArrayLike<BlogHtmlNode>;
  tagName?: string;
  getAttribute?: (name: string) => string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeBlogLink(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return null;
    if (url.protocol === "mailto:" && !url.pathname) return null;
    return url.href;
  } catch {
    return null;
  }
}

function inlineMarkdownToHtml(value: string): string {
  let html = "";
  let cursor = 0;

  for (const match of value.matchAll(inlineMarkdownPattern)) {
    const index = match.index ?? 0;
    html += escapeHtml(value.slice(cursor, index));

    if (match[1] && match[2]) {
      const href = safeBlogLink(match[2]);
      html += href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`
        : escapeHtml(match[0]);
    } else if (match[3]) {
      html += `<strong>${escapeHtml(match[3])}</strong>`;
    } else if (match[4]) {
      html += `<em>${escapeHtml(match[4])}</em>`;
    }

    cursor = index + match[0].length;
  }

  return html + escapeHtml(value.slice(cursor));
}

export function markdownToBlogHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(`<li>${inlineMarkdownToHtml(lines[index].slice(2))}</li>`);
        index += 1;
      }
      index -= 1;
      html.push(`<ul>${items.join("")}</ul>`);
    } else if (line.startsWith("### ")) {
      html.push(`<h3>${inlineMarkdownToHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      html.push(`<h2>${inlineMarkdownToHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      html.push(`<h1>${inlineMarkdownToHtml(line.slice(2))}</h1>`);
    } else {
      html.push(line ? `<p>${inlineMarkdownToHtml(line)}</p>` : "<p><br></p>");
    }
  }

  return html.join("");
}

export function blogHtmlToMarkdown(root: BlogHtmlNode, base: string): string {
  const render = (node: BlogHtmlNode): string => {
    if (node.nodeType === 3) return node.textContent ?? "";
    if (node.nodeType !== 1) return Array.from(node.childNodes).map(render).join("");

    const text = Array.from(node.childNodes).map(render).join("");
    switch (node.tagName?.toUpperCase()) {
      case "H1": return `# ${text}\n`;
      case "H2": return `## ${text}\n`;
      case "H3": return `### ${text}\n`;
      case "STRONG":
      case "B": return `**${text}**`;
      case "EM":
      case "I": return `*${text}*`;
      case "A": {
        const href = safeBlogLink(node.getAttribute?.("href") ?? "", base);
        return href ? `[${text}](${href})` : text;
      }
      case "LI": return `- ${text}\n`;
      case "UL":
      case "OL": return `${text}\n`;
      case "BR": return "\n";
      case "P":
      case "DIV": return `${text}\n`;
      default: return text;
    }
  };

  return Array.from(root.childNodes).map(render).join("").replace(/\n{3,}/g, "\n\n").trim();
}
