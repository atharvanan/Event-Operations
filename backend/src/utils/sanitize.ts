/**
 * Sanitization utility to protect against XSS and script injection (SEC-01).
 * Neutralizes HTML tags and script elements without corrupting business text like '&'.
 */
export const sanitizeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, '')
    .replace(/<\/([a-z][a-z0-9]*)\s*>/gi, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Strips script tags and javascript: URIs entirely
 */
export const stripDangerousTags = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};
