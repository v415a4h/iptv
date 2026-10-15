import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { Channel, PlaybackState, PlaybackStats, Settings } from '../types/iptv';
import { logger } from '../util/safeLogger';

export interface PlayerEngineCallbacks {
  onStateChange: (state: PlaybackState) => void;
  onStatsUpdate: (stats: PlaybackStats) => void;
  onError: (errorMsg: string) => void;
}

export class PlayerEngine {
  private videoElement: HTMLVideoElement | null = null;
  private hlsInstance: Hls | null = null;
  private dashPlayer: dashjs.MediaPlayerClass | null = null;
  private callbacks: PlayerEngineCallbacks;
  private currentChannel: Channel | null = null;
  private switchStartTime = 0;
  private statsInterval: number | null = null;
  private isDestroyed = false;

  constructor(callbacks: PlayerEngineCallbacks) {
    this.callbacks = callbacks;
  }

  public attachVideo(video: HTMLVideoElement): void {
    this.videoElement = video;
    this.setupVideoEvents();
  }

  private setupVideoEvents(): void {
    if (!this.videoElement) return;

    this.videoElement.addEventListener('waiting', () => {
      this.callbacks.onStateChange('buffering');
    });

    this.videoElement.addEventListener('playing', () => {
      const latency = this.switchStartTime ? Math.round(performance.now() - this.switchStartTime) : 0;
      this.callbacks.onStateChange('ready');
      this.updateStats(latency);
      logger.success(
        'PLAYER',
        `Playback started for "${this.currentChannel?.name || 'Channel'}" (Channel Switch: ${latency}ms)`
      );
    });

    this.videoElement.addEventListener('ended', () => {
      this.callbacks.onStateChange('ended');
    });

    this.videoElement.addEventListener('error', () => {
      const mediaErr = this.videoElement?.error;
      const msg = mediaErr ? `HTML5 Video Error code ${mediaErr.code}: ${mediaErr.message}` : 'Video playback error';
      logger.error('PLAYER', msg);
      this.callbacks.onError(msg);
      this.callbacks.onStateChange('error');
    });

    // Start stats polling
    if (this.statsInterval) clearInterval(this.statsInterval);
    this.statsInterval = window.setInterval(() => {
      this.updateStats();
    }, 1500);
  }

  /**
   * Fast channel switching: reuses video surface, resets only pipeline if format changed
   */
  public async playChannel(channel: Channel, settings: Settings): Promise<void> {
    if (!this.videoElement) {
      this.callbacks.onError('Player not attached to display');
      return;
    }

    this.switchStartTime = performance.now();
    this.currentChannel = channel;
    this.callbacks.onStateChange('buffering');

    logger.info('PLAYER', `Switching to CH ${channel.number}: ${channel.name} (${channel.streamType.toUpperCase()})`);

    // Determine target URL (with proxy if needed)
    let streamUrl = channel.streamUrl;
    if (settings.proxyEnabled && !streamUrl.includes('/api/')) {
      const ua = channel.userAgent || settings.customUserAgent;
      streamUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}&userAgent=${encodeURIComponent(ua)}`;
    }

    try {
      if (channel.streamType === 'dash' || streamUrl.includes('.mpd')) {
        await this.playDash(channel, streamUrl);
      } else if (channel.streamType === 'hls' || streamUrl.includes('.m3u8')) {
        await this.playHls(channel, streamUrl);
      } else {
        await this.playDirect(streamUrl);
      }
    } catch (err: any) {
      const errorMsg = `Stream playback failed: ${err.message || String(err)}`;
      logger.error('PLAYER', errorMsg);
      this.callbacks.onError(errorMsg);
      this.callbacks.onStateChange('error');
    }
  }

  private async playHls(channel: Channel, streamUrl: string): Promise<void> {
    // Teardown DASH player if active
    if (this.dashPlayer) {
      this.dashPlayer.reset();
      this.dashPlayer = null;
    }

    if (Hls.isSupported()) {
      if (!this.hlsInstance) {
        this.hlsInstance = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });

        this.hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                logger.warn('PLAYER', 'HLS Network error encountered, attempting recovery...');
                this.hlsInstance?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                logger.warn('PLAYER', 'HLS Media error encountered, recovering media error...');
                this.hlsInstance?.recoverMediaError();
                break;
              default:
                logger.error('PLAYER', `Fatal HLS error: ${data.details}`);
                this.callbacks.onError(`HLS Error: ${data.details}`);
                this.callbacks.onStateChange('error');
                this.hlsInstance?.destroy();
                this.hlsInstance = null;
                break;
            }
          }
        });

        this.hlsInstance.attachMedia(this.videoElement!);
      }

      this.hlsInstance.loadSource(streamUrl);
      try {
        await this.videoElement!.play();
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          logger.warn('PLAYER', 'Auto-play requires user interaction or audio muted: ' + e.message);
        }
      }
    } else if (this.videoElement!.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple Safari / TV HLS support
      this.videoElement!.src = streamUrl;
      await this.videoElement!.play();
    } else {
      throw new Error('HLS playback is not supported on this device/browser');
    }
  }

  private async playDash(channel: Channel, streamUrl: string): Promise<void> {
    // Teardown HLS instance if active
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }

    if (!this.dashPlayer) {
      this.dashPlayer = dashjs.MediaPlayer().create();
      this.dashPlayer.initialize(this.videoElement!, streamUrl, true);
    } else {
      this.dashPlayer.attachSource(streamUrl);
    }

    // Configure Widevine DRM if present
    if (channel.drmConfig && channel.drmConfig.keyUrl) {
      logger.info('DRM', `Configuring Widevine DRM session for "${channel.name}"`);
      const keySystem = channel.drmConfig.keySystem || 'com.widevine.alpha';
      const protectionData: Record<string, any> = {
        [keySystem]: {
          serverURL: channel.drmConfig.keyUrl,
          httpRequestHeaders: channel.drmConfig.headers || {},
          priority: 0,
        },
      };

      try {
        this.dashPlayer.setProtectionData(protectionData);
        logger.success('DRM', `Widevine DRM session initialized with license endpoint`);
      } catch (drmErr: any) {
        logger.error('DRM', `Failed to configure Widevine DRM: ${drmErr.message}`);
      }
    } else {
      // Clear previous DRM protection data for clean ordinary stream
      this.dashPlayer.setProtectionData({});
    }

    try {
      await this.videoElement!.play();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        logger.warn('PLAYER', 'DASH auto-play: ' + e.message);
      }
    }
  }

  private async playDirect(streamUrl: string): Promise<void> {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    if (this.dashPlayer) {
      this.dashPlayer.reset();
      this.dashPlayer = null;
    }

    this.videoElement!.src = streamUrl;
    await this.videoElement!.play();
  }

  private updateStats(forcedSwitchLatency?: number): void {
    if (!this.videoElement) return;

    const width = this.videoElement.videoWidth;
    const height = this.videoElement.videoHeight;
    const resolution = width && height ? `${width}x${height}` : 'Auto / HD';

    // Buffer estimation
    let bufferSeconds = 0;
    const buffered = this.videoElement.buffered;
    const current = this.videoElement.currentTime;
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= current && current <= buffered.end(i)) {
        bufferSeconds = Math.max(0, Math.round(buffered.end(i) - current));
        break;
      }
    }

    const isDrm = Boolean(this.currentChannel?.drmConfig?.keyUrl);

    this.callbacks.onStatsUpdate({
      resolution,
      bitrate: this.isDestroyed ? '0 kbps' : 'Adaptive Auto',
      switchTimeMs: forcedSwitchLatency ?? (this.switchStartTime ? Math.round(performance.now() - this.switchStartTime) : 0),
      bufferSeconds,
      streamType: (this.currentChannel?.streamType || 'HLS').toUpperCase(),
      isDrm,
    });
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.statsInterval) clearInterval(this.statsInterval);
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    if (this.dashPlayer) {
      this.dashPlayer.reset();
      this.dashPlayer = null;
    }
  }
}
