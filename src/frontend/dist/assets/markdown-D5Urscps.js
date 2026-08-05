import { j as jsxRuntimeExports } from "./index-Cnm2qphK.js";
const slugify = (s) => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
const INLINE_RE = /(`[^`]+`)|(\[[^\]]*\]\([^)\s]+\))|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;
const isExternal = (href) => /^https?:\/\//i.test(href);
function renderInline(text, keyBase) {
  const out = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${keyBase}-i${i++}`;
    if (m[1]) {
      out.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "code",
          {
            className: "rounded border px-1.5 py-0.5 font-mono text-[0.85em]",
            style: {
              borderColor: "var(--bb-border)",
              background: "var(--bb-bg-soft)",
              color: "var(--bb-text)"
            },
            children: m[1].slice(1, -1)
          },
          key
        )
      );
    } else if (m[2]) {
      const split = m[2].indexOf("](");
      const label = m[2].slice(1, split);
      const href = m[2].slice(split + 2, -1);
      const ext = isExternal(href);
      out.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            href,
            ...ext ? { target: "_blank", rel: "noopener noreferrer" } : {},
            className: "underline underline-offset-2",
            style: { color: "var(--bb-brand)" },
            children: [
              label,
              ext ? " ↗" : ""
            ]
          },
          key
        )
      );
    } else if (m[3]) {
      out.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "font-bold", style: { color: "var(--bb-text)" }, children: m[3].slice(2, -2) }, key)
      );
    } else if (m[4] || m[5]) {
      const raw = m[4] ?? m[5];
      out.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("em", { className: "italic", children: raw.slice(1, -1) }, key)
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
const H_CLASS = {
  1: "t-display text-[1.75rem] mt-0 mb-4",
  2: "t-headline text-[1.25rem] mt-9 mb-3",
  3: "text-[1rem] font-bold mt-6 mb-2",
  4: "text-[0.9rem] font-bold mt-5 mb-2"
};
const cells = (line) => line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
const isTableDivider = (line) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line);
function renderMarkdown(src) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let k = 0;
  const key = () => `b${k++}`;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      out.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "pre",
          {
            className: "my-4 overflow-x-auto rounded-2xl border p-4 text-[12px] leading-relaxed",
            style: {
              borderColor: "var(--bb-border)",
              background: "var(--bb-surface)"
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono", style: { color: "var(--bb-text-muted)" }, children: body.join("\n") })
          },
          key()
        )
      );
      continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      out.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("hr", { className: "my-8 border-t", style: { borderColor: "var(--bb-border)" } }, key())
      );
      i++;
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text2 = h[2].trim();
      const id = slugify(text2);
      const Tag = `h${level}`;
      out.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { id, className: `scroll-mt-24 ${H_CLASS[level]}`, children: renderInline(text2, id) }, key())
      );
      i++;
      continue;
    }
    if (line.trim().startsWith("|") && isTableDivider(lines[i + 1] ?? "")) {
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(cells(lines[i]));
        i++;
      }
      out.push(
        // Wide tables scroll inside their own box rather than forcing the
        // page to scroll horizontally on a phone.
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "my-4 overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-[13px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: head.map((c, ci) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "th",
            {
              className: "border-b px-3 py-2 text-left font-bold",
              style: { borderColor: "var(--bb-border)", color: "var(--bb-text)" },
              children: renderInline(c, `th${ci}`)
            },
            `h${ci}`
          )) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r, ri) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: r.map((c, ci) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "td",
            {
              className: "border-b px-3 py-2 align-top",
              style: {
                borderColor: "var(--bb-border)",
                color: "var(--bb-text-muted)"
              },
              children: renderInline(c, `td${ri}-${ci}`)
            },
            `c${ci}`
          )) }, `r${ri}`)) })
        ] }) }, key())
      );
      continue;
    }
    if (line.startsWith(">")) {
      const body = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        body.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "blockquote",
          {
            className: "my-4 rounded-r-xl border-l-2 py-1 pl-4 text-[14px] leading-relaxed",
            style: { borderColor: "var(--bb-brand)", color: "var(--bb-text-muted)" },
            children: renderInline(body.join(" "), key())
          },
          key()
        )
      );
      continue;
    }
    const bullet = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (bullet) {
      const ordered = /\d/.test(bullet[2]);
      const items = [];
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
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ListTag,
          {
            className: `my-3 space-y-1.5 pl-5 text-[14px] leading-relaxed ${ordered ? "list-decimal" : "list-disc"}`,
            style: { color: "var(--bb-text-muted)" },
            children: items.map((it, ii) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: renderInline(it, `li${ii}`) }, `li${ii}`))
          },
          key()
        )
      );
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("#") && !lines[i].startsWith(">") && !lines[i].startsWith("```") && !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i]) && !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    const text = para.join(" ");
    out.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "p",
        {
          className: "my-3 text-[14px] leading-relaxed",
          style: { color: "var(--bb-text-muted)" },
          children: renderInline(text, key())
        },
        key()
      )
    );
  }
  return out;
}
export {
  renderMarkdown as r
};
