import { Channel, Playlist, Settings } from '../../types/iptv';
import { parseM3u } from '../parser/m3uParser';
import { parseJioTvResponse } from '../parser/jioTvParser';
import { logger } from '../../util/safeLogger';

const STORAGE_PLAYLISTS_KEY = 'iptv_mate_playlists';
const STORAGE_CHANNELS_KEY = 'iptv_mate_channels_';
const STORAGE_SETTINGS_KEY = 'iptv_mate_settings';
const STORAGE_ORDER_KEY = 'iptv_mate_custom_order_';

export const DEFAULT_SETTINGS: Settings = {
  customUserAgent: 'IPTVMate/1.0.0 (AndroidTV; Media3 ExoPlayer)',
  proxyEnabled: true,
  bufferGoalMs: 15000,
  autoPlayOnLaunch: true,
  activePlaylistId: 'default_curated',
  jiotvApiEndpoint: '/api/jiotv-demo',
  showOsdStats: true,
};

// Initial default playlist with working live streams and DASH/DRM test streams
const DEFAULT_M3U_CONTENT = `#EXTM3U
#EXTINF:-1 tvg-id="1" tvg-name="Red Bull TV" tvg-logo="https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200&auto=format&fit=crop&q=80" group-title="Sports",Red Bull TV Live
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="2" tvg-name="France 24" tvg-logo="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80" group-title="News",France 24 English Live
https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8

#EXTINF:-1 tvg-id="3" tvg-name="Big Buck Bunny" tvg-logo="https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200&auto=format&fit=crop&q=80" group-title="Movies",Big Buck Bunny (DASH Stream)
https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd

#EXTINF:-1 tvg-id="4" tvg-name="Tears of Steel" tvg-logo="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80" group-title="Cinema",Tears of Steel 4K HLS
https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8

#EXTINF:-1 tvg-id="5" tvg-name="Sintel Live" tvg-logo="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80" group-title="Animation",Sintel Fantasy HD
https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8

#EXTINF:-1 tvg-id="6" tvg-name="NASA Deep Space" tvg-logo="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&auto=format&fit=crop&q=80" group-title="Science",NASA Deep Space Stream
https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8

#EXTINF:-1 tvg-id="7" tvg-name="Jio Widevine DRM" tvg-logo="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80" group-title="Premium DRM",Angel One (Widevine DASH DRM)
#KODIPROP:inputstream.adaptive.license_type=com.widevine.alpha
#KODIPROP:inputstream.adaptive.license_key=https://cwip-shaka-proxy.appspot.com/no_auth
https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd
`;

export class PlaylistRepository {
  private static instance: PlaylistRepository;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): PlaylistRepository {
    if (!PlaylistRepository.instance) {
      PlaylistRepository.instance = new PlaylistRepository();
    }
    return PlaylistRepository.instance;
  }

  private ensureInitialized(): void {
    const playlists = this.getPlaylists();
    if (playlists.length === 0) {
      // Seed default curated playlist
      const defaultPlaylist: Playlist = {
        id: 'default_curated',
        name: 'IPTV Mate Curated Channels',
        type: 'm3u',
        url: 'internal://default.m3u',
        channelCount: 7,
        lastUpdated: Date.now(),
        rawContent: DEFAULT_M3U_CONTENT,
      };

      const parsed = parseM3u(DEFAULT_M3U_CONTENT, 'https://iptvmate.internal/');
      this.savePlaylist(defaultPlaylist);
      this.saveChannels(defaultPlaylist.id, parsed.channels);
      logger.info('PARSER', `Initialized default playlist with ${parsed.channels.length} channels.`);
    }
  }

  public getSettings(): Settings {
    try {
      const data = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      logger.error('SETTINGS', 'Failed to read settings from storage', String(e));
    }
    return DEFAULT_SETTINGS;
  }

  public saveSettings(settings: Settings): void {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
      logger.info('SETTINGS', 'Updated local settings');
    } catch (e) {
      logger.error('SETTINGS', 'Failed to persist settings', String(e));
    }
  }

  public getPlaylists(): Playlist[] {
    try {
      const data = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      logger.error('PARSER', 'Failed to read playlists from storage', String(e));
    }
    return [];
  }

  public savePlaylist(playlist: Playlist): void {
    const list = this.getPlaylists().filter((p) => p.id !== playlist.id);
    list.unshift(playlist);
    localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(list));
  }

  public deletePlaylist(id: string): void {
    const list = this.getPlaylists().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(list));
    localStorage.removeItem(STORAGE_CHANNELS_KEY + id);
    localStorage.removeItem(STORAGE_ORDER_KEY + id);
    logger.info('PARSER', `Deleted playlist ${id}`);
  }

  public getChannels(playlistId: string): Channel[] {
    try {
      const data = localStorage.getItem(STORAGE_CHANNELS_KEY + playlistId);
      if (!data) return [];
      const channels: Channel[] = JSON.parse(data);

      // Check if custom order exists
      const customOrderData = localStorage.getItem(STORAGE_ORDER_KEY + playlistId);
      if (customOrderData) {
        const orderMap: Record<string, number> = JSON.parse(customOrderData);
        channels.sort((a, b) => {
          const orderA = orderMap[a.id] ?? a.order ?? 9999;
          const orderB = orderMap[b.id] ?? b.order ?? 9999;
          return orderA - orderB;
        });
      } else {
        channels.sort((a, b) => a.order - b.order);
      }

      // Re-index sequential numbers for display
      return channels.map((ch, idx) => ({ ...ch, number: idx + 1 }));
    } catch (e) {
      logger.error('PARSER', 'Failed to load channels for playlist ' + playlistId, String(e));
      return [];
    }
  }

  public saveChannels(playlistId: string, channels: Channel[]): void {
    try {
      localStorage.setItem(STORAGE_CHANNELS_KEY + playlistId, JSON.stringify(channels));
    } catch (e) {
      logger.error('PARSER', 'Failed to save channels for ' + playlistId, String(e));
    }
  }

  public saveCustomChannelOrder(playlistId: string, orderedChannels: Channel[]): void {
    try {
      const orderMap: Record<string, number> = {};
      orderedChannels.forEach((ch, idx) => {
        orderMap[ch.id] = idx + 1;
      });
      localStorage.setItem(STORAGE_ORDER_KEY + playlistId, JSON.stringify(orderMap));
      // Also update stored channels with new order
      const updated = orderedChannels.map((ch, idx) => ({
        ...ch,
        order: idx + 1,
        number: idx + 1,
      }));
      this.saveChannels(playlistId, updated);
      logger.info('SETTINGS', `Saved custom channel order for ${orderedChannels.length} channels`);
    } catch (e) {
      logger.error('SETTINGS', 'Failed to save custom channel ordering', String(e));
    }
  }

  /**
   * Imports or refreshes an M3U playlist from a remote URL or raw text
   */
  public async importM3uPlaylist(name: string, urlOrContent: string, isRawText = false): Promise<Playlist> {
    logger.info('PARSER', `Starting M3U import: "${name}"`);
    let content = urlOrContent;
    const url = isRawText ? 'local://pasted.m3u' : urlOrContent;

    if (!isRawText) {
      const settings = this.getSettings();
      const fetchUrl = settings.proxyEnabled ? `/api/proxy?url=${encodeURIComponent(urlOrContent)}` : urlOrContent;
      const res = await fetch(fetchUrl, {
        headers: { 'User-Agent': settings.customUserAgent },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch M3U playlist: HTTP ${res.status} ${res.statusText}`);
      }
      content = await res.text();
    }

    const parseResult = parseM3u(content, isRawText ? undefined : urlOrContent);
    if (parseResult.channels.length === 0) {
      throw new Error('No playable channels found in the provided M3U playlist.');
    }

    const playlistId = 'm3u_' + Date.now();
    const playlist: Playlist = {
      id: playlistId,
      name: name.trim() || 'Imported M3U Playlist',
      type: 'm3u',
      url,
      channelCount: parseResult.channels.length,
      lastUpdated: Date.now(),
      rawContent: isRawText ? content : undefined,
    };

    this.savePlaylist(playlist);
    this.saveChannels(playlistId, parseResult.channels);
    logger.success('PARSER', `Successfully imported ${parseResult.channels.length} channels for "${playlist.name}".`);

    return playlist;
  }

  /**
   * Imports or refreshes a JioTV Go JSON API endpoint
   */
  public async importJioTvApi(name: string, endpointUrl: string, customHeaders?: Record<string, string>): Promise<Playlist> {
    logger.info('JIOTV', `Connecting to JioTV Go API: ${endpointUrl}`);
    const settings = this.getSettings();

    let res: Response;
    // Check if endpoint is local /api/jiotv-demo
    if (endpointUrl.startsWith('/api/')) {
      res = await fetch(endpointUrl, { headers: customHeaders });
    } else {
      const fetchUrl = settings.proxyEnabled ? `/api/proxy?url=${encodeURIComponent(endpointUrl)}` : endpointUrl;
      res = await fetch(fetchUrl, {
        headers: {
          'User-Agent': settings.customUserAgent,
          ...customHeaders,
        },
      });
    }

    if (!res.ok) {
      throw new Error(`JioTV Go API returned HTTP ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const parseResult = parseJioTvResponse(json, endpointUrl);

    if (parseResult.channels.length === 0) {
      throw new Error('No channels found in JioTV Go API response.');
    }

    const playlistId = 'jiotv_' + Date.now();
    const playlist: Playlist = {
      id: playlistId,
      name: name.trim() || 'JioTV Go Stream Service',
      type: 'jiotv',
      url: endpointUrl,
      channelCount: parseResult.channels.length,
      lastUpdated: Date.now(),
      headers: customHeaders,
    };

    this.savePlaylist(playlist);
    this.saveChannels(playlistId, parseResult.channels);
    logger.success('JIOTV', `Successfully parsed JioTV Go API with ${parseResult.channels.length} channels.`);

    return playlist;
  }
}
