import { Channel, JioTvApiResponse, JioTvChannelItem } from '../../types/iptv';
import { detectStreamType, resolveStreamUrl } from '../../util/urlResolver';

export interface ParseJioTvResult {
  channels: Channel[];
  totalParsed: number;
  warnings: string[];
}

/**
 * Parses JioTV Go API JSON responses conforming to:
 * { "code": 200, "message": "Success", "result": [...] }
 */
export function parseJioTvResponse(jsonData: unknown, baseUrl?: string): ParseJioTvResult {
  const warnings: string[] = [];
  const channels: Channel[] = [];

  if (!jsonData || typeof jsonData !== 'object') {
    return { channels: [], totalParsed: 0, warnings: ['Invalid JSON response structure.'] };
  }

  const response = jsonData as Partial<JioTvApiResponse>;

  if (response.code !== 200 && response.code !== undefined) {
    warnings.push(`JioTV Go API returned status code ${response.code}: ${response.message || 'Unknown response'}`);
  }

  // Result array check
  let items: JioTvChannelItem[] = [];
  if (Array.isArray(response.result)) {
    items = response.result;
  } else if (Array.isArray(jsonData)) {
    // Some endpoints may return array directly
    items = jsonData as JioTvChannelItem[];
  } else {
    return { channels: [], totalParsed: 0, warnings: ['No "result" array found in JioTV API response.'] };
  }

  let index = 1;
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    // channel_name fallback
    const rawName = item.channel_name ? String(item.channel_name).trim() : '';
    const channelId = item.channel_id ? String(item.channel_id) : `jiotv_${index}`;
    const name = rawName || `Jio Channel ${channelId}`;

    // channel_url
    const rawUrl = item.channel_url ? String(item.channel_url).trim() : '';
    if (!rawUrl) {
      warnings.push(`Channel "${name}" skipped: missing channel_url`);
      continue;
    }

    const streamUrl = resolveStreamUrl(rawUrl, baseUrl);
    const streamType = detectStreamType(streamUrl);

    // DRM license URL
    let drmConfig = undefined;
    if (item.key_url && typeof item.key_url === 'string' && item.key_url.trim().length > 0) {
      const resolvedKeyUrl = resolveStreamUrl(item.key_url.trim(), baseUrl);
      drmConfig = {
        keyUrl: resolvedKeyUrl,
        keySystem: 'com.widevine.alpha',
      };
    }

    const logo = item.channel_logo && typeof item.channel_logo === 'string'
      ? resolveStreamUrl(item.channel_logo.trim(), baseUrl)
      : '';

    const group = item.group || item.category || 'JioTV';

    channels.push({
      id: `jiotv_${channelId}`,
      number: index,
      name,
      logo,
      group: typeof group === 'string' ? group.trim() : 'JioTV',
      streamUrl,
      streamType,
      drmConfig,
      order: index,
      tvgId: channelId,
    });

    index++;
  }

  return {
    channels,
    totalParsed: channels.length,
    warnings,
  };
}
