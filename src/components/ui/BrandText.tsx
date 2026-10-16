// Keep the official mixed-case name even inside uppercase labels. Only visible
// copy is formatted: CMS keys, links, filenames and form values stay intact.
const brandPattern = /(\biod\s*[-\u2010-\u2015]\s*gh\b)/gi;

export function brandParts(value: string) {
  return value.split(brandPattern);
}

export function brandText(value: string) {
  const parts = brandParts(value);
  if (parts.length === 1) return value;
  // Keep the complete label together when it is a child of a flex button/link.
  return <span>{parts.map((part, index) => index % 2
    ? <span key={index} className="brand-name">IoD-Gh</span>
    : part)}</span>;
}
