export type StreamType = 'hls' | 'dash' | 'direct';

export interface DrmConfig {
  keyUrl: string;
  keySystem?: string; // 'com.widevine.alpha' or 'org.w3.clearkey'
  headers?: Record<string, string>;
}

export interface Channel {
  id: string;
  number: number;
  name: string;
  logo: string;
  group: string;
  streamUrl: string;
  streamType: StreamType;
  drmConfig?: DrmConfig;
  order: number;
  tvgId?: string;
  userAgent?: string;
}

export interface Playlist {
  id: string;
  name: string;
  type: 'm3u' | 'jiotv';
  url: string;
  channelCount: number;
  lastUpdated: number;
  headers?: Record<string, string>;
  rawContent?: string;
}

export interface Settings {
  customUserAgent: string;
  proxyEnabled: boolean;
  bufferGoalMs: number;
  autoPlayOnLaunch: boolean;
  activePlaylistId: string;
  jiotvApiEndpoint: string;
  showOsdStats: boolean;
}

export type PlaybackState = 'idle' | 'buffering' | 'ready' | 'ended' | 'error';

export interface PlaybackStats {
  resolution: string;
  bitrate: string;
  switchTimeMs: number;
  bufferSeconds: number;
  streamType: string;
  isDrm: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  module: 'PARSER' | 'PLAYER' | 'DRM' | 'SETTINGS' | 'JIOTV';
  message: string;
  details?: string;
}

export interface JioTvChannelItem {
  channel_id: number | string;
  channel_name: string;
  channel_url: string;
  key_url?: string | null;
  channel_logo?: string | null;
  group?: string | null;
  category?: string | null;
}

export interface JioTvApiResponse {
  code: number;
  message: string;
  result: JioTvChannelItem[];
}
