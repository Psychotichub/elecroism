import React from 'react';

export function highlightSearchMatch(
  text: string,
  query: string
): React.ReactNode {
  const q = query.trim();
  if (!q) return text;

  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let start = 0;
  let pos = lower.indexOf(qLower);

  while (pos >= 0) {
    if (pos > start) parts.push(text.slice(start, pos));
    parts.push(
      <mark key={`${pos}-${q}`} className="es-palette-search-hit">
        {text.slice(pos, pos + q.length)}
      </mark>
    );
    start = pos + q.length;
    pos = lower.indexOf(qLower, start);
  }

  if (start < text.length) parts.push(text.slice(start));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
