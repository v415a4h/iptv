import { Channel, DrmConfig } from '../../types/iptv';
import { resolveStreamUrl, detectStreamType } from '../../util/urlResolver';

export interface ParseM3uResult {
  channels: Channel[];
  totalParsed: number;
  warnings: string[];
}

/**
 * Robust, production-grade M3U / M3U8 Playlist Parser for Android TV IPTV
 * Handles UTF-8, #EXTINF attributes, Kodiprop DRM tags, relative URLs, and malformed lines.
 */
export function parseM3u(content: string, playlistBaseUrl?: string): ParseM3uResult {
  const warnings: string[] = [];
  const channels: Channel[] = [];

  if (!content || typeof content !== 'string') {
    return { channels: [], totalParsed: 0, warnings: ['Playlist content is empty'] };
  }

  // Normalize line breaks
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let currentChannel: Partial<Channel> = {};
  let currentDrm: Partial<DrmConfig> = {};
  let currentUserAgent: string | undefined = undefined;
  let channelIndex = 1;

  // Regex patterns for attributes
  const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    // Check header
    if (line.startsWith('#EXTM3U')) {
      // Playlist root header
      continue;
    }

    // Check Kodi/VLC DRM or User-Agent properties
    if (line.startsWith('#KODIPROP:') || line.startsWith('#EXTVLCOPT:') || line.startsWith('#EXTHTTP:')) {
      if (line.includes('license_key=') || line.includes('license_url=')) {
        const parts = line.split('=');
        if (parts.length > 1) {
          currentDrm.keyUrl = parts.slice(1).join('=').trim();
        }
      } else if (line.includes('license_type=')) {
        const type = line.split('=')[1]?.trim();
        if (type && type.includes('widevine')) {
          currentDrm.keySystem = 'com.widevine.alpha';
        } else if (type && type.includes('clearkey')) {
          currentDrm.keySystem = 'org.w3.clearkey';
        }
      } else if (line.includes('http-user-agent=') || line.includes('User-Agent')) {
        const parts = line.split('=');
        if (parts.length > 1) {
          currentUserAgent = parts.slice(1).join('=').trim();
        }
      }
      continue;
    }

    // Handle #EXTINF metadata
    if (line.startsWith('#EXTINF:')) {
      currentChannel = {};

      // Split at the comma to separate attributes from title
      const commaIndex = line.lastIndexOf(',');
      let attrsString = '';
      let channelTitle = '';

      if (commaIndex !== -1) {
        attrsString = line.substring(8, commaIndex).trim();
        channelTitle = line.substring(commaIndex + 1).trim();
      } else {
        attrsString = line.substring(8).trim();
        channelTitle = 'Channel ' + channelIndex;
      }

      // Parse key="value" attributes
      let match: RegExpExecArray | null;
      const parsedAttrs: Record<string, string> = {};
      while ((match = attrRegex.exec(attrsString)) !== null) {
        parsedAttrs[match[1].toLowerCase()] = match[2];
      }

      const tvgId = parsedAttrs['tvg-id'] || parsedAttrs['id'] || '';
      const tvgName = parsedAttrs['tvg-name'] || '';
      const tvgLogo = parsedAttrs['tvg-logo'] || parsedAttrs['logo'] || '';
      const groupTitle = parsedAttrs['group-title'] || parsedAttrs['group'] || 'General';

      const finalName = channelTitle || tvgName || tvgId || `Channel ${channelIndex}`;

      currentChannel.name = finalName;
      currentChannel.tvgId = tvgId || undefined;
      currentChannel.logo = tvgLogo;
      currentChannel.group = groupTitle.trim() || 'General';
      continue;
    }

    // Comment lines that are not actionable
    if (line.startsWith('#')) {
      continue;
    }

    // Non-comment line is assumed to be stream URL
    if (line.length > 0 && !line.startsWith('#')) {
      const resolvedUrl = resolveStreamUrl(line, playlistBaseUrl);

      if (resolvedUrl) {
        const streamType = detectStreamType(resolvedUrl);

        let finalDrm: DrmConfig | undefined = undefined;
        if (currentDrm.keyUrl) {
          finalDrm = {
            keyUrl: currentDrm.keyUrl,
            keySystem: currentDrm.keySystem || 'com.widevine.alpha',
          };
        }

        const channel: Channel = {
          id: `ch_${channelIndex}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          number: channelIndex,
          name: currentChannel.name || `Channel ${channelIndex}`,
          logo: currentChannel.logo || '',
          group: currentChannel.group || 'General',
          streamUrl: resolvedUrl,
          streamType,
          drmConfig: finalDrm,
          order: channelIndex,
          tvgId: currentChannel.tvgId,
          userAgent: currentUserAgent,
        };

        channels.push(channel);
        channelIndex++;
      }

      // Reset per-channel temp state
      currentChannel = {};
      currentDrm = {};
      currentUserAgent = undefined;
    }
  }

  if (channels.length === 0) {
    warnings.push('No valid stream URLs found in the playlist.');
  }

  return {
    channels,
    totalParsed: channels.length,
    warnings,
  };
}
