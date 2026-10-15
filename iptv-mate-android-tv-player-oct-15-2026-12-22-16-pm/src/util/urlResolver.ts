import { StreamType } from '../types/iptv';

/**
 * Resolves a stream URL against a base playlist URL if the stream URL is relative.
 */
export function resolveStreamUrl(streamUrl: string, baseUrl?: string): string {
  const trimmed = streamUrl.trim();
  if (!trimmed) return '';

  // If already absolute (http://, https://, etc.)
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // If relative and baseUrl provided
  if (baseUrl && /^https?:\/\//i.test(baseUrl)) {
    try {
      const base = new URL(baseUrl);
      // If starts with '/', it's root relative
      if (trimmed.startsWith('/')) {
        return `${base.origin}${trimmed}`;
      }
      // Directory relative
      const lastSlashIdx = base.pathname.lastIndexOf('/');
      const basePath = lastSlashIdx !== -1 ? base.pathname.substring(0, lastSlashIdx + 1) : '/';
      return `${base.origin}${basePath}${trimmed}`;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Infers stream type from URL or playlist hints.
 */
export function detectStreamType(url: string, hint?: string): StreamType {
  const lower = (url + (hint || '')).toLowerCase();

  if (lower.includes('.mpd') || lower.includes('format=mpd') || lower.includes('dash')) {
    return 'dash';
  }

  if (lower.includes('.m3u8') || lower.includes('format=m3u8') || lower.includes('hls') || lower.includes('.ts')) {
    return 'hls';
  }

  return 'hls'; // default fallback for IPTV streams
}

/**
 * Sanitizes URLs for display and logging without leaking auth tokens, signatures, or passwords.
 */
export function sanitizeUrlForLogging(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const sanitizedParams = new URLSearchParams();
    for (const [key, val] of parsed.searchParams.entries()) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('key') ||
        lowerKey.includes('pass') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('sig') ||
        lowerKey.includes('jwt')
      ) {
        sanitizedParams.set(key, '***REDACTED***');
      } else {
        sanitizedParams.set(key, val);
      }
    }
    const query = sanitizedParams.toString() ? `?${sanitizedParams.toString()}` : '';
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${query}`;
  } catch {
    // If not valid URL, mask any potential token queries
    return url.replace(/([?&](?:token|auth|key|password|jwt)=)[^&]+/gi, '$1***REDACTED***');
  }
}
