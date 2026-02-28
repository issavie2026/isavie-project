import React from 'react';

const URL_PATTERN = /(https?:\/\/[^\s]+)/gi;

export function parseExternalLinks(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function linkifyText(text) {
  const content = String(text || '');
  const parts = content.split(URL_PATTERN);
  return parts.map((part, index) => {
    if (part.match(/^https?:\/\//i)) {
      return (
        <a
          key={`link-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--accent)' }}
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
  });
}

export function isImageAttachment(value) {
  const text = String(value || '').trim();
  return /^data:image\//i.test(text) || /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(text);
}
