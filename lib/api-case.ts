/** Aceita camelCase ou snake_case em payloads Laravel. */
/** Aceita camelCase ou snake_case em payloads Laravel. Sem `snake`, usa o mesmo nome. */
export function pickStr(obj: Record<string, unknown>, camel: string, snake = camel): string | undefined {
  const a = obj[camel];
  const b = obj[snake];
  if (typeof a === "string" && a.trim()) return a.trim();
  if (typeof b === "string" && b.trim()) return b.trim();
  return undefined;
}

export function pickBool(
  obj: Record<string, unknown>,
  camel: string,
  snake = camel,
): boolean | undefined {
  if (typeof obj[camel] === "boolean") return obj[camel] as boolean;
  if (typeof obj[snake] === "boolean") return obj[snake] as boolean;
  return undefined;
}
