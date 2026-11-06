const full = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const whole = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatPeso(
  centavos: number,
  opts: { sign?: boolean; compact?: boolean; whole?: boolean } = {},
) {
  const value = Math.abs(centavos) / 100;
  const fmt = opts.compact ? compact : opts.whole ? whole : full;
  const text = fmt.format(value);
  if (!opts.sign) return centavos < 0 ? `−${text}` : text;
  if (centavos > 0) return `+${text}`;
  if (centavos < 0) return `−${text}`;
  return text;
}

export function centavosToInput(centavos: number) {
  return (centavos / 100).toFixed(2).replace(/\.00$/, "");
}
