/**
 * Tiny Handlebars-style template engine for bot responses.
 *
 *   {{var}}  {{a.b}}
 *   {{#if var}}…{{else}}…{{/if}}         (also {{#unless}})
 *   {{#select list N}}…{{#empty}}…{{/select}}  iterate the first N items of a list;
 *        inside, item fields are in scope ({{song}}, {{@index}}, {{@number}});
 *        the {{#empty}} branch renders when the list is empty.
 */
export type TemplateContext = Record<string, unknown>;

type Node =
  | { t: "text"; v: string }
  | { t: "var"; path: string }
  | { t: "if"; path: string; negate: boolean; yes: Node[]; no: Node[] }
  | { t: "select"; path: string; limit: number; body: Node[]; empty: Node[] };

const TAG = /\{\{\s*([#/]?)([@\w.]+)(?:\s+([@\w.]+))?(?:\s+(\d+))?\s*\}\}/g;

export class TemplateError extends Error {}

function parse(src: string): Node[] {
  const root: Node[] = [];
  type Frame = { node: Extract<Node, { t: "if" } | { t: "select" }>; branch: Node[]; tag: string };
  const stack: Frame[] = [];
  const out = () => (stack.length ? stack[stack.length - 1].branch : root);
  let last = 0;
  for (const m of src.matchAll(TAG)) {
    if (m.index! > last) out().push({ t: "text", v: src.slice(last, m.index) });
    last = m.index! + m[0].length;
    const [, sigil, name, arg, num] = m;
    if (sigil === "#") {
      if (name === "if" || name === "unless") {
        if (!arg) throw new TemplateError(`{{#${name}}} needs an argument`);
        const node: Node = { t: "if", path: arg, negate: name === "unless", yes: [], no: [] };
        out().push(node);
        stack.push({ node, branch: node.yes, tag: name });
      } else if (name === "select") {
        if (!arg) throw new TemplateError("{{#select}} needs a list");
        const node: Node = { t: "select", path: arg, limit: num ? Number(num) : Infinity, body: [], empty: [] };
        out().push(node);
        stack.push({ node, branch: node.body, tag: "select" });
      } else if (name === "empty") {
        const f = stack[stack.length - 1];
        if (!f || f.node.t !== "select") throw new TemplateError("{{#empty}} outside {{#select}}");
        f.branch = f.node.empty;
      } else {
        throw new TemplateError(`Unknown block {{#${name}}}`);
      }
    } else if (sigil === "/") {
      const f = stack.pop();
      if (!f || f.tag !== name) throw new TemplateError(`Unexpected {{/${name}}}`);
    } else if (name === "else") {
      const f = stack[stack.length - 1];
      if (!f || f.node.t !== "if") throw new TemplateError("{{else}} outside {{#if}}");
      f.branch = f.node.no;
    } else {
      out().push({ t: "var", path: name });
    }
  }
  if (last < src.length) out().push({ t: "text", v: src.slice(last) });
  if (stack.length) throw new TemplateError(`Unclosed {{#${stack[stack.length - 1].tag}}}`);
  return root;
}

function lookup(scopes: TemplateContext[], path: string): unknown {
  for (let i = scopes.length - 1; i >= 0; i--) {
    let cur: unknown = scopes[i];
    let ok = true;
    for (const key of path.split(".")) {
      if (cur && typeof cur === "object" && key in (cur as object)) cur = (cur as Record<string, unknown>)[key];
      else {
        ok = false;
        break;
      }
    }
    if (ok) return cur;
  }
  return undefined;
}

function truthy(v: unknown) {
  return Array.isArray(v) ? v.length > 0 : Boolean(v) && v !== "0";
}

function renderNodes(nodes: Node[], scopes: TemplateContext[]): string {
  let s = "";
  for (const n of nodes) {
    if (n.t === "text") s += n.v;
    else if (n.t === "var") {
      const v = lookup(scopes, n.path);
      s += v === undefined || v === null ? "" : String(v);
    } else if (n.t === "if") {
      const cond = truthy(lookup(scopes, n.path)) !== n.negate;
      s += renderNodes(cond ? n.yes : n.no, scopes);
    } else {
      const list = lookup(scopes, n.path);
      const items = Array.isArray(list) ? list.slice(0, n.limit) : [];
      if (items.length === 0) s += renderNodes(n.empty, scopes);
      else
        s += items
          .map((item, i) =>
            renderNodes(n.body, [...scopes, { "@index": i, "@number": i + 1 }, (item ?? {}) as TemplateContext]),
          )
          .join(items.length > 1 ? ", " : "");
    }
  }
  return s;
}

export function renderTemplate(src: string, ctx: TemplateContext): string {
  return renderNodes(parse(src), [ctx]).replace(/\s+/g, " ").trim();
}

/** Returns an error message, or null if the template is valid. */
export function validateTemplate(src: string): string | null {
  try {
    parse(src);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
