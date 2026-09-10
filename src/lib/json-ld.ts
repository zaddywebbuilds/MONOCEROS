/**
 * Serialises structured data for embedding in a `<script type="application/ld+json">`.
 *
 * The danger is not JSON syntax, it is HTML parsing. A browser scanning a
 * `<script>` element ends it at the first `</script>` in the raw text, whatever
 * the surrounding JSON says. So an administrator who types `</script>` into an
 * FAQ answer, a company description or a package name would close the tag early
 * and have everything after it parsed as live markup.
 *
 * Escaping `<` as `<` prevents that: JSON.parse restores the character, so
 * the structured data a crawler sees is unchanged, but the HTML parser never
 * encounters a closing tag it can act on.
 *
 * There is deliberately one implementation. Both call sites previously carried
 * their own copy of this replace, and one of them had a backslash too few —
 * which silently made it a no-op.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
