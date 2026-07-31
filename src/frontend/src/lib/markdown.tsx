import type { ReactNode } from "react";

/**
 * A small, deliberately-limited Markdown renderer for the in-app docs.
 *
 * WHY NOT react-markdown: the docs are four files we author ourselves and
 * lazy-load. A dependency tree of remark/rehype plugins to render headings,
 * lists and links is weight the money path doesn't need to carry.
 *
 * SAFETY — read this before extending:
 *   This renderer emits **React elements only**. There is no
 *   `dangerouslySetInnerHTML` anywhere in it, and raw HTML in the source is
 *   escaped as literal text rather than parsed. That means untrusted input
 *   cannot inject markup even by accident. Keep it that way: if you ever
 *   need raw-HTML passthrough, that is the moment to reach for a real
 *   Markdown library with a sanitiser, not to add an escape hatch here.
 *
 * Supported, and nothing else: ATX headings (# — ####), paragraphs, ordered
 * and unordered lists, blockquotes, fenced code, horizontal rules, pipe
 * tables, and inline code / links / bold / italic. Anything unsupported
 * renders as plain text, which is a safe failure rather than a broken page.
 */

/** Heading slug → used as the `id` so docs can be deep-linked at #section. */
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

/* ------------------------------------------------------------------ */
/* Inline                                                              */
/* ------------------------------------------------------------------ */

// Ordered by precedence: code spans win, so `**not bold**` inside backticks
// stays literal. Each alternative is a capture group checked in order below.
const INLINE_RE =
  /(`[^`]+`)|(\[[^\]]*\]\([^)\s]+\))|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;

const isExternal = (href: string) => /^https?:\/\//i.test(href);

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  // `matchAll` needs the /g flag, which INLINE_RE has; lastIndex is reset by
  // matchAll's internal clone, so the shared regex stays safe to reuse.
  for (const m of text.matchAll(INLINE_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${keyBase}-i${i++}`;

    if (m[1]) {
      out.push(
        <code
          key={key}
          className="rounded border px-1.5 py-0.5 font-mono text-[0.85em]"
          style={{
            borderColor: "var(--bb-border)",
            background: "var(--bb-bg-soft)",
            color: "var(--bb-text)",
          }}
        >
          {m[1].slice(1, -1)}
        </code>,
      );
    } else if (m[2]) {
      const split = m[2].indexOf("](");
      const label = m[2].slice(1, split);
      const href = m[2].slice(split + 2, -1);
      const ext = isExternal(href);
      out.push(
        <a
          key={key}
          href={href}
          {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="underline underline-offset-2"
          style={{ color: "var(--bb-brand)" }}
        >
          {label}
          {ext ? " ↗" : ""}
        </a>,
      );
    } else if (m[3]) {
      out.push(
        <strong key={key} className="font-bold" style={{ color: "var(--bb-text)" }}>
          {m[3].slice(2, -2)}
        </strong>,
      );
    } else if (m[4] || m[5]) {
      const raw = (m[4] ?? m[5]) as string;
      out.push(
        <em key={key} className="italic">
          {raw.slice(1, -1)}
        </em>,
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* ------------------------------------------------------------------ */
/* Block                                                               */
/* ------------------------------------------------------------------ */

const H_CLASS: Record<number, string> = {
  1: "t-display text-[1.75rem] mt-0 mb-4",
  2: "t-headline text-[1.25rem] mt-9 mb-3",
  3: "text-[1rem] font-bold mt-6 mb-2",
  4: "text-[0.9rem] font-bold mt-5 mb-2",
};

/** Split a pipe-table row into trimmed cells, dropping the outer pipes. */
const cells = (line: string): string[] =>
  line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());

const isTableDivider = (line: string) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line);

export function renderMarkdown(src: string): ReactNode[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  const key = () => `b${k++}`;

  while (i < lines.length) {
    const line = lines[i];

    // Blank
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code
    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++; // closing fence
      out.push(
        <pre
          key={key()}
          className="my-4 overflow-x-auto rounded-2xl border p-4 text-[12px] leading-relaxed"
          style={{
            borderColor: "var(--bb-border)",
            background: "var(--bb-surface)",
          }}
        >
          <code className="font-mono" style={{ color: "var(--bb-text-muted)" }}>
            {body.join("\n")}
          </code>
        </pre>,
      );
      continue;
    }

    // Horizontal rule
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      out.push(
        <hr key={key()} className="my-8 border-t" style={{ borderColor: "var(--bb-border)" }} />,
      );
      i++;
      continue;
    }

    // Heading
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const id = slugify(text);
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
      out.push(
        <Tag key={key()} id={id} className={`scroll-mt-24 ${H_CLASS[level]}`}>
          {renderInline(text, id)}
        </Tag>,
      );
      i++;
      continue;
    }

    // Table — a header row followed by a |---|---| divider
    if (line.trim().startsWith("|") && isTableDivider(lines[i + 1] ?? "")) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(cells(lines[i]));
        i++;
      }
      out.push(
        // Wide tables scroll inside their own box rather than forcing the
        // page to scroll horizontally on a phone.
        <div key={key()} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {head.map((c, ci) => (
                  <th
                    key={`h${ci}`}
                    className="border-b px-3 py-2 text-left font-bold"
                    style={{ borderColor: "var(--bb-border)", color: "var(--bb-text)" }}
                  >
                    {renderInline(c, `th${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={`r${ri}`}>
                  {r.map((c, ci) => (
                    <td
                      key={`c${ci}`}
                      className="border-b px-3 py-2 align-top"
                      style={{
                        borderColor: "var(--bb-border)",
                        color: "var(--bb-text-muted)",
                      }}
                    >
                      {renderInline(c, `td${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        body.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(
        <blockquote
          key={key()}
          className="my-4 rounded-r-xl border-l-2 py-1 pl-4 text-[14px] leading-relaxed"
          style={{ borderColor: "var(--bb-brand)", color: "var(--bb-text-muted)" }}
        >
          {renderInline(body.join(" "), key())}
        </blockquote>,
      );
      continue;
    }

    // Lists (ordered or unordered). A continuation line indented by two or
    // more spaces belongs to the item above it.
    const bullet = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (bullet) {
      const ordered = /\d/.test(bullet[2]);
      const items: string[] = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (m && /\d/.test(m[2]) === ordered) {
          items.push(m[3]);
          i++;
        } else if (/^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i++;
        } else {
          break;
        }
      }
      const ListTag = ordered ? "ol" : "ul";
      out.push(
        <ListTag
          key={key()}
          className={`my-3 space-y-1.5 pl-5 text-[14px] leading-relaxed ${
            ordered ? "list-decimal" : "list-disc"
          }`}
          style={{ color: "var(--bb-text-muted)" }}
        >
          {items.map((it, ii) => (
            <li key={`li${ii}`}>{renderInline(it, `li${ii}`)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }

    // Paragraph — consume until a blank line or the start of another block.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("```") &&
      !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i]) &&
      !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    const text = para.join(" ");
    out.push(
      <p
        key={key()}
        className="my-3 text-[14px] leading-relaxed"
        style={{ color: "var(--bb-text-muted)" }}
      >
        {renderInline(text, key())}
      </p>,
    );
  }

  return out;
}

/** Pull the first `# Heading` out of a doc, for index cards and <title>. */
export const firstHeading = (src: string): string | null =>
  /^#\s+(.+)$/m.exec(src)?.[1]?.trim() ?? null;
