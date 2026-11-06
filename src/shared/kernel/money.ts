export type Currency = "PHP";

export class Money {
  private constructor(
    readonly centavos: bigint,
    readonly currency: Currency,
  ) {}

  static of(centavos: bigint | number, currency: Currency = "PHP"): Money {
    if (typeof centavos === "number" && !Number.isInteger(centavos)) {
      throw new RangeError("Money requires integer centavos");
    }
    return new Money(BigInt(centavos), currency);
  }

  static zero(currency: Currency = "PHP"): Money {
    return new Money(0n, currency);
  }

  static parse(input: string, currency: Currency = "PHP"): Money | null {
    const cleaned = input.replace(/[₱,\s]/g, "");
    if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
    const negative = cleaned.startsWith("-");
    const [whole = "0", frac = ""] = cleaned.replace("-", "").split(".");
    const value = BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0"));
    return new Money(negative ? -value : value, currency);
  }

  add(other: Money): Money {
    return new Money(this.centavos + other.centavos, this.currency);
  }

  subtract(other: Money): Money {
    return new Money(this.centavos - other.centavos, this.currency);
  }

  negate(): Money {
    return new Money(-this.centavos, this.currency);
  }

  isNegative(): boolean {
    return this.centavos < 0n;
  }

  isZero(): boolean {
    return this.centavos === 0n;
  }

  compare(other: Money): -1 | 0 | 1 {
    if (this.centavos === other.centavos) return 0;
    return this.centavos < other.centavos ? -1 : 1;
  }

  percentOf(total: Money): number {
    if (total.centavos === 0n) return 0;
    return Number((this.centavos * 10000n) / total.centavos) / 100;
  }

  toNumber(): number {
    return Number(this.centavos) / 100;
  }

  format(locale = "en-PH"): string {
    return new Intl.NumberFormat(locale, { style: "currency", currency: this.currency }).format(
      this.toNumber(),
    );
  }

  equals(other: Money): boolean {
    return this.centavos === other.centavos;
  }
}
