export const MAX_AMOUNT_CENTAVOS = 10_000_000_000;

type Token =
  { type: "num"; value: number } | { type: "op"; value: "+" | "-" | "*" | "/" | "(" | ")" };

function tokenize(input: string): Token[] | null {
  const src = input
    .replace(/[₱,\s]/g, "")
    .replace(/[x×]/gi, "*")
    .replace(/÷/g, "/");
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src.charAt(i);
    if (/[\d.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[\d.]/.test(src.charAt(j))) j++;
      const raw = src.slice(i, j);
      if (!/^\d*\.?\d+$|^\d+\.$/.test(raw)) return null;
      tokens.push({ type: "num", value: Number(raw) });
      i = j;
    } else if ("+-*/()".includes(ch)) {
      tokens.push({ type: "op", value: ch as "+" });
      i++;
    } else return null;
  }
  return tokens;
}

function parse(tokens: Token[]): number | null {
  let pos = 0;
  const peek = () => tokens[pos];

  const primary = (): number | null => {
    const t = peek();
    if (!t) return null;
    if (t.type === "num") {
      pos++;
      return t.value;
    }
    if (t.value === "-") {
      pos++;
      const v = primary();
      return v === null ? null : -v;
    }
    if (t.value === "(") {
      pos++;
      const v = expr();
      if (peek()?.value !== ")") return null;
      pos++;
      return v;
    }
    return null;
  };

  const term = (): number | null => {
    let left = primary();
    while (left !== null && (peek()?.value === "*" || peek()?.value === "/")) {
      const op = peek()?.value;
      pos++;
      const right = primary();
      if (right === null) return null;
      if (op === "/" && right === 0) return null;
      left = op === "*" ? left * right : left / right;
    }
    return left;
  };

  const expr = (): number | null => {
    let left = term();
    while (left !== null && (peek()?.value === "+" || peek()?.value === "-")) {
      const op = peek()?.value;
      pos++;
      const right = term();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };

  const value = expr();
  return pos === tokens.length ? value : null;
}

export function evaluateAmount(input: string): number | null {
  const tokens = tokenize(input);
  if (!tokens || tokens.length === 0) return null;
  const value = parse(tokens);
  if (value === null || !Number.isFinite(value)) return null;
  const centavos = Math.round(value * 100);
  if (centavos <= 0 || centavos > MAX_AMOUNT_CENTAVOS) return null;
  return centavos;
}

export function isExpression(input: string) {
  return /\d\s*[-+*/x×÷]\s*[\d(]/i.test(input);
}
