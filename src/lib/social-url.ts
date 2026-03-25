/** للعرض والروابط — يضيف https:// عند غياب المخطط */
export function normalizeSocialUrlForHref(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}
