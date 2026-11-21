/** Line breaks and repeated spaces in a photo transcript are layout, not content. */
export function collapseWhitespace(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

/** True when the quote appears literally in an already collapsed text, ignoring layout whitespace. */
export function isQuotedIn(collapsedText: string, quote: string): boolean {
  const collapsedQuote = collapseWhitespace(quote);
  return collapsedQuote.length > 0 && collapsedText.includes(collapsedQuote);
}
