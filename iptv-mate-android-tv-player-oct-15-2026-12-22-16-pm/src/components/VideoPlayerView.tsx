import React, { useEffect, useRef, useState } from 'react';
import { Channel, PlaybackState, PlaybackStats, Settings } from '../types/iptv';
import { PlayerEngine } from '../player/PlayerEngine';
import { sanitizeUrlForLogging } from '../util/urlResolver';
import { ShieldCheck, Activity, Loader2, AlertCircle, Radio, Clock, Gauge } from 'lucide-react';

interface VideoPlayerViewProps {
  currentChannel: Channel | null;
  settings: Settings;
  showOsd: boolean;
  onCloseOsd?: () => void;
  isMuted: boolean;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  currentChannel,
  settings,
  showOsd,
  isMuted,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerEngineRef = useRef<PlayerEngine | null>(null);

  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [stats, setStats] = useState<PlaybackStats>({
    resolution: 'Auto',
    bitrate: 'Auto',
    switchTimeMs: 0,
    bufferSeconds: 0,
    streamType: 'HLS',
    isDrm: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSwitchBanner, setShowSwitchBanner] = useState(false);
  const bannerTimerRef = useRef<number | null>(null);

  // Initialize persistent player engine
  useEffect(() => {
    if (!videoRef.current) return;

    const engine = new PlayerEngine({
      onStateChange: (state) => setPlaybackState(state),
      onStatsUpdate: (updatedStats) => setStats(updatedStats),
      onError: (msg) => setErrorMessage(msg),
    });

    engine.attachVideo(videoRef.current);
    playerEngineRef.current = engine;

    return () => {
      engine.destroy();
      playerEngineRef.current = null;
    };
  }, []);

  // Channel switch reaction
  useEffect(() => {
    if (!currentChannel || !playerEngineRef.current) return;

    setErrorMessage(null);
    setShowSwitchBanner(true);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => {
      setShowSwitchBanner(false);
    }, 4500);

    playerEngineRef.current.playChannel(currentChannel, settings);
  }, [currentChannel, settings.proxyEnabled, settings.customUserAgent]);

  // Sync muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {/* HTML5 video element reused across channel switches */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-none"
        playsInline
        autoPlay
      />

      {/* Lightweight Loading / Buffering Spinner */}
      {playbackState === 'buffering' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity pointer-events-none z-10">
          <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-neutral-900/90 border border-neutral-700 shadow-2xl">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <div className="text-sm font-medium text-neutral-200 tracking-wide">
              Buffering stream...
            </div>
          </div>
        </div>
      )}

      {/* Playback Error Alert */}
      {playbackState === 'error' && errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/80 backdrop-blur-md z-20 p-6">
          <div className="max-w-md w-full p-6 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-900/50 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-100">Playback Failed</h3>
              <p className="text-xs text-rose-300/80 mt-1 break-words">
                {errorMessage}
              </p>
            </div>
            <div className="text-[11px] text-neutral-400 bg-neutral-900/80 p-2.5 rounded-lg text-left font-mono">
              URL: {sanitizeUrlForLogging(currentChannel?.streamUrl || '')}
            </div>
            <div className="text-xs text-neutral-400">
              Check settings or try selecting another channel using the TV remote.
            </div>
          </div>
        </div>
      )}

      {/* Channel Switch OSD Banner (appears on channel change) */}
      {showSwitchBanner && currentChannel && (
        <div className="absolute top-8 left-8 right-8 z-30 flex items-center justify-between p-4 bg-gradient-to-r from-neutral-950/95 via-neutral-900/95 to-neutral-950/95 border border-neutral-700/80 rounded-2xl shadow-2xl backdrop-blur-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center font-bold text-xl text-blue-400 shrink-0">
              {currentChannel.logo ? (
                <img
                  src={currentChannel.logo}
                  alt={currentChannel.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to channel number on image load error
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{currentChannel.number}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600/90 text-white">
                  CH {currentChannel.number}
                </span>
                <span className="text-xl font-bold text-white tracking-wide">
                  {currentChannel.name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                <span className="text-neutral-300 font-medium">{currentChannel.group}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono uppercase text-blue-300">
                  <Radio className="w-3 h-3" />
                  {currentChannel.streamType}
                </span>
                {currentChannel.drmConfig && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Widevine DRM
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {stats.switchTimeMs > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-xs text-neutral-300 font-mono">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Switch: <strong className="text-white">{stats.switchTimeMs}ms</strong></span>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-xs font-mono text-neutral-300">
              {stats.resolution}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Diagnostics HUD / Info OSD (Toggled with 'I' on remote) */}
      {showOsd && (
        <div className="absolute bottom-8 left-8 right-8 z-30 p-4 bg-neutral-950/90 border border-neutral-700/80 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-mono text-neutral-300">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2 text-sm font-sans font-bold text-white">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Media3 Playback Engine Diagnostics</span>
            </div>
            <div className="text-[11px] text-neutral-500">
              Press [I] or [Info] to hide
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
              <div className="text-neutral-500 text-[10px] uppercase">Channel &amp; Format</div>
              <div className="text-neutral-100 font-semibold mt-0.5 truncate">
                CH {currentChannel?.number}: {currentChannel?.name}
              </div>
              <div className="text-blue-400 text-[11px] mt-0.5">
                Format: {stats.streamType} {stats.isDrm ? '+ Widevine DRM' : ''}
              </div>
            </div>

            <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
              <div className="text-neutral-500 text-[10px] uppercase">Resolution &amp; Bitrate</div>
              <div className="text-neutral-100 font-semibold mt-0.5">
                {stats.resolution}
              </div>
              <div className="text-neutral-400 text-[11px] mt-0.5 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-amber-400" />
                Adaptive Bitrate
              </div>
            </div>

            <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
              <div className="text-neutral-500 text-[10px] uppercase">Buffer &amp; Latency</div>
              <div className="text-neutral-100 font-semibold mt-0.5">
                Forward Buffer: {stats.bufferSeconds}s
              </div>
              <div className="text-emerald-400 text-[11px] mt-0.5">
                Switch Latency: {stats.switchTimeMs} ms
              </div>
            </div>

            <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
              <div className="text-neutral-500 text-[10px] uppercase">Engine State</div>
              <div className="text-neutral-100 font-semibold mt-0.5 uppercase tracking-wide">
                {playbackState}
              </div>
              <div className="text-neutral-400 text-[10px] mt-0.5 truncate">
                Proxy: {settings.proxyEnabled ? 'Active (CORS Safe)' : 'Direct'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
