import React, { useState, useEffect } from 'react';
import { Playlist, Settings, LogEntry } from '../types/iptv';
import { PlaylistRepository } from '../data/repository/playlistRepository';
import { logger } from '../util/safeLogger';
import {
  ListPlus,
  Tv,
  Radio,
  Sliders,
  FileCode,
  Download,
  Trash2,
  CheckCircle,
  RefreshCw,
  Terminal,
  Server,
  Layers,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import JSZip from 'jszip';

interface SettingsScreenProps {
  settings: Settings;
  onSaveSettings: (settings: Settings) => void;
  onPlaylistChange: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onSaveSettings,
  onPlaylistChange,
  onBack,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'playlists' | 'jiotv' | 'playback' | 'logs' | 'android_project'
  >('playlists');

  const repo = PlaylistRepository.getInstance();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState(settings.activePlaylistId);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Add M3U Form state
  const [m3uName, setM3uName] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uRawText, setM3uRawText] = useState('');
  const [isRawMode, setIsRawMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // JioTV Go form state
  const [jiotvName, setJiotvName] = useState('JioTV Stream Service');
  const [jiotvEndpoint, setJiotvEndpoint] = useState(settings.jiotvApiEndpoint || '/api/jiotv-demo');
  const [jiotvHeadersJson, setJiotvHeadersJson] = useState('{}');
  const [isConnectingJio, setIsConnectingJio] = useState(false);
  const [jioStatus, setJioStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Playback options state
  const [customUa, setCustomUa] = useState(settings.customUserAgent);
  const [proxyEnabled, setProxyEnabled] = useState(settings.proxyEnabled);
  const [bufferGoalMs, setBufferGoalMs] = useState(settings.bufferGoalMs);
  const [autoPlay, setAutoPlay] = useState(settings.autoPlayOnLaunch);

  // Android project code view
  const [selectedFile, setSelectedFile] = useState<string>('LiveTvActivity.kt');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  useEffect(() => {
    refreshPlaylists();
    setLogs(logger.getLogs());
    const unsub = logger.subscribe(() => {
      setLogs(logger.getLogs());
    });
    return () => unsub();
  }, []);

  const refreshPlaylists = () => {
    setPlaylists(repo.getPlaylists());
  };

  const handleSelectPlaylist = (id: string) => {
    setActivePlaylistId(id);
    const updated = { ...settings, activePlaylistId: id };
    repo.saveSettings(updated);
    onSaveSettings(updated);
    onPlaylistChange();
  };

  const handleDeletePlaylist = (id: string) => {
    repo.deletePlaylist(id);
    refreshPlaylists();
    if (activePlaylistId === id) {
      const remaining = repo.getPlaylists();
      if (remaining.length > 0) {
        handleSelectPlaylist(remaining[0].id);
      }
    }
  };

  const handleImportM3u = async () => {
    if (!isRawMode && !m3uUrl.trim()) {
      setImportStatus({ type: 'error', message: 'Please provide a valid M3U playlist URL.' });
      return;
    }
    if (isRawMode && !m3uRawText.trim()) {
      setImportStatus({ type: 'error', message: 'Please paste M3U playlist content.' });
      return;
    }

    setIsImporting(true);
    setImportStatus(null);

    try {
      const playlist = await repo.importM3uPlaylist(
        m3uName.trim() || 'My IPTV Playlist',
        isRawMode ? m3uRawText : m3uUrl.trim(),
        isRawMode
      );
      setImportStatus({
        type: 'success',
        message: `Imported "${playlist.name}" with ${playlist.channelCount} channels!`,
      });
      setM3uName('');
      setM3uUrl('');
      setM3uRawText('');
      refreshPlaylists();
      handleSelectPlaylist(playlist.id);
    } catch (err: any) {
      setImportStatus({ type: 'error', message: err.message || 'Failed to import playlist' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConnectJioTv = async () => {
    if (!jiotvEndpoint.trim()) {
      setJioStatus({ type: 'error', message: 'Please enter a JioTV Go API URL or IP endpoint.' });
      return;
    }

    setIsConnectingJio(true);
    setJioStatus(null);

    let headers: Record<string, string> | undefined;
    try {
      if (jiotvHeadersJson.trim()) {
        headers = JSON.parse(jiotvHeadersJson.trim());
      }
    } catch {
      setJioStatus({ type: 'error', message: 'Custom headers must be a valid JSON object.' });
      setIsConnectingJio(false);
      return;
    }

    try {
      const playlist = await repo.importJioTvApi(
        jiotvName.trim() || 'JioTV Go Live',
        jiotvEndpoint.trim(),
        headers
      );

      const updatedSettings = { ...settings, jiotvApiEndpoint: jiotvEndpoint.trim() };
      repo.saveSettings(updatedSettings);
      onSaveSettings(updatedSettings);

      setJioStatus({
        type: 'success',
        message: `Connected successfully! Loaded ${playlist.channelCount} JioTV channels.`,
      });
      refreshPlaylists();
      handleSelectPlaylist(playlist.id);
    } catch (err: any) {
      setJioStatus({
        type: 'error',
        message: `Connection failed: ${err.message}. Check your LAN server address and network reachable status.`,
      });
    } finally {
      setIsConnectingJio(false);
    }
  };

  const handleSavePlaybackOptions = () => {
    const updated: Settings = {
      ...settings,
      customUserAgent: customUa.trim(),
      proxyEnabled,
      bufferGoalMs,
      autoPlayOnLaunch: autoPlay,
    };
    repo.saveSettings(updated);
    onSaveSettings(updated);
  };

  // Sample Android Studio Project Files for Viewer & Exporter
  const androidFiles: Record<string, string> = {
    'LiveTvActivity.kt': `package com.iptvmate.app.ui.home

import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.iptvmate.app.player.IptvPlayerManager
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class LiveTvActivity : AppCompatActivity() {
    private val viewModel: LiveTvViewModel by viewModels()
    private lateinit var playerManager: IptvPlayerManager
    private var isSidebarVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        playerManager = IptvPlayerManager(this)
        lifecycleScope.launch {
            viewModel.currentPlayingChannel.collectLatest { channel ->
                channel?.let { playerManager.switchChannel(it) }
            }
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                viewModel.playFocusedChannel()
                return true
            }
            KeyEvent.KEYCODE_DPAD_LEFT -> {
                if (!isSidebarVisible) {
                    showSidebar()
                    return true
                }
            }
            KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.KEYCODE_BACK -> {
                if (isSidebarVisible) {
                    hideSidebar()
                    return true
                }
            }
        }
        return super.onKeyDown(keyCode, event)
    }
}`,
    'IptvPlayerManager.kt': `package com.iptvmate.app.player

import android.content.Context
import android.net.Uri
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.dash.DashMediaSource
import androidx.media3.exoplayer.drm.DefaultDrmSessionManager
import androidx.media3.exoplayer.drm.HttpMediaDrmCallback
import androidx.media3.exoplayer.hls.HlsMediaSource
import com.iptvmate.app.data.model.Channel
import com.iptvmate.app.data.model.StreamType

class IptvPlayerManager(private val context: Context) {
    val player: ExoPlayer by lazy {
        ExoPlayer.Builder(context).build().apply { playWhenReady = true }
    }

    fun switchChannel(channel: Channel) {
        val httpDataSource = DefaultHttpDataSource.Factory()
            .setUserAgent(channel.userAgent ?: "IPTVMate/1.0 (AndroidTV)")
            .setAllowCrossProtocolRedirects(true)

        val uri = Uri.parse(channel.streamUrl)
        val source = when (channel.streamType) {
            StreamType.DASH -> {
                val item = MediaItem.Builder().setUri(uri).setMimeType(MimeTypes.APPLICATION_MPD).build()
                val factory = DashMediaSource.Factory(httpDataSource)
                channel.drmConfig?.let { drm ->
                    val callback = HttpMediaDrmCallback(drm.keyUrl, httpDataSource)
                    val manager = DefaultDrmSessionManager.Builder()
                        .setUuidAndExoMediaDrmProvider(C.WIDEVINE_UUID, androidx.media3.exoplayer.drm.FrameworkMediaDrm.DEFAULT_PROVIDER)
                        .build(callback)
                    factory.setDrmSessionManagerProvider { manager }
                }
                factory.createMediaSource(item)
            }
            StreamType.HLS -> {
                val item = MediaItem.Builder().setUri(uri).setMimeType(MimeTypes.APPLICATION_M3U8).build()
                HlsMediaSource.Factory(httpDataSource).createMediaSource(item)
            }
            else -> HlsMediaSource.Factory(httpDataSource).createMediaSource(MediaItem.fromUri(uri))
        }

        player.stop()
        player.setMediaSource(source)
        player.prepare()
        player.play()
    }
}`,
    'M3uParser.kt': `package com.iptvmate.app.data.parser

import com.iptvmate.app.data.model.Channel
import com.iptvmate.app.data.model.DrmConfig
import com.iptvmate.app.data.model.StreamType
import java.io.BufferedReader
import java.io.StringReader
import java.util.UUID

object M3uParser {
    fun parse(content: String, baseUrl: String? = null): List<Channel> {
        val channels = mutableListOf<Channel>()
        val reader = BufferedReader(StringReader(content))
        var line: String?
        var currentName: String? = null
        var currentLogo: String? = null
        var currentGroup = "General"
        var currentDrm: DrmConfig? = null
        var index = 1

        while (reader.readLine().also { line = it } != null) {
            val t = line!!.trim()
            if (t.startsWith("#EXTINF:")) {
                val comma = t.lastIndexOf(',')
                currentName = if (comma != -1) t.substring(comma + 1).trim() else "Channel $index"
            } else if (t.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) {
                currentDrm = DrmConfig(keyUrl = t.substringAfter("=").trim())
            } else if (t.isNotEmpty() && !t.startsWith("#")) {
                val streamType = if (t.contains(".mpd")) StreamType.DASH else StreamType.HLS
                channels.add(Channel(UUID.randomUUID().toString(), index, currentName ?: "CH $index", currentLogo ?: "", currentGroup, t, streamType, currentDrm, index))
                index++
                currentName = null
                currentDrm = null
            }
        }
        return channels
    }
}`,
    'JioTvParser.kt': `package com.iptvmate.app.data.parser

import com.iptvmate.app.data.model.Channel
import com.iptvmate.app.data.model.DrmConfig
import com.iptvmate.app.data.model.JioTvApiResponse
import com.iptvmate.app.data.model.StreamType
import kotlinx.serialization.json.Json

object JioTvParser {
    private val json = Json { ignoreUnknownKeys = true }

    fun parse(jsonString: String): List<Channel> {
        val response = json.decodeFromString<JioTvApiResponse>(jsonString)
        return response.result.mapIndexed { idx, item ->
            val url = item.channel_url ?: ""
            val type = if (url.contains(".mpd")) StreamType.DASH else StreamType.HLS
            val drm = item.key_url?.let { DrmConfig(keyUrl = it) }
            Channel(
                id = "jiotv_\${item.channel_id ?: idx}",
                number = idx + 1,
                name = item.channel_name ?: "Channel \${idx + 1}",
                logo = item.channel_logo ?: "",
                group = item.group ?: "JioTV",
                streamUrl = url,
                streamType = type,
                drmConfig = drm,
                order = idx + 1
            )
        }
    }
}`,
    'AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-feature android:name="android.software.leanback" android:required="true" />
    <application
        android:label="IPTV Mate"
        android:banner="@drawable/tv_banner"
        android:theme="@style/Theme.IPTVMate"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".ui.home.LiveTvActivity"
            android:exported="true"
            android:screenOrientation="landscape">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
    'app_build.gradle.kts': `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "com.iptvmate.app"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.iptvmate.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.leanback:leanback:1.0.0")
    val media3 = "1.3.1"
    implementation("androidx.media3:media3-exoplayer:$media3")
    implementation("androidx.media3:media3-exoplayer-hls:$media3")
    implementation("androidx.media3:media3-exoplayer-dash:$media3")
    implementation("androidx.media3:media3-ui:$media3")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
}`,
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const root = zip.folder('IPTVMate-AndroidStudio');
      if (root) {
        root.file('README.md', '# IPTV Mate Android TV Project\n\nOpen this folder in Android Studio and click Run or execute `./gradlew assembleDebug` to build the APK.');
        root.file('settings.gradle.kts', 'rootProject.name = "IPTVMate"\ninclude(":app")');
        root.file('build.gradle.kts', 'plugins {\n    id("com.android.application") version "8.5.2" apply false\n    id("org.jetbrains.kotlin.android") version "1.9.24" apply false\n}');
        
        const app = root.folder('app');
        if (app) {
          app.file('build.gradle.kts', androidFiles['app_build.gradle.kts']);
          const src = app.folder('src')?.folder('main');
          if (src) {
            src.file('AndroidManifest.xml', androidFiles['AndroidManifest.xml']);
            const java = src.folder('java')?.folder('com')?.folder('iptvmate')?.folder('app');
            if (java) {
              java.folder('ui')?.folder('home')?.file('LiveTvActivity.kt', androidFiles['LiveTvActivity.kt']);
              java.folder('player')?.file('IptvPlayerManager.kt', androidFiles['IptvPlayerManager.kt']);
              java.folder('data')?.folder('parser')?.file('M3uParser.kt', androidFiles['M3uParser.kt']);
              java.folder('data')?.folder('parser')?.file('JioTvParser.kt', androidFiles['JioTvParser.kt']);
            }
          }
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'IPTVMate-AndroidTV-StudioProject.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      alert('Zip generation failed: ' + e.message);
    } finally {
      setIsZipping(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(androidFiles[selectedFile] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-30 bg-neutral-950/95 backdrop-blur-xl text-neutral-100 flex flex-col overflow-hidden">
      {/* Settings Top Bar */}
      <div className="px-8 py-5 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wide">Settings &amp; Configuration</h2>
            <p className="text-xs text-neutral-400 font-mono">
              IPTV Mate • Media3 Playback &amp; Playlist Engine
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold transition border border-neutral-700"
        >
          Back to Live TV
        </button>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="px-8 pt-4 pb-2 border-b border-neutral-800/80 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('playlists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
            activeSubTab === 'playlists'
              ? 'bg-blue-600 text-white shadow-lg ring-1 ring-blue-400'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Playlists ({playlists.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('jiotv')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
            activeSubTab === 'jiotv'
              ? 'bg-blue-600 text-white shadow-lg ring-1 ring-blue-400'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-400" />
          <span>JioTV Go API</span>
        </button>

        <button
          onClick={() => setActiveSubTab('playback')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
            activeSubTab === 'playback'
              ? 'bg-blue-600 text-white shadow-lg ring-1 ring-blue-400'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Playback &amp; Proxy</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
            activeSubTab === 'logs'
              ? 'bg-blue-600 text-white shadow-lg ring-1 ring-blue-400'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Diagnostics &amp; Logs ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('android_project')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
            activeSubTab === 'android_project'
              ? 'bg-blue-600 text-white shadow-lg ring-1 ring-blue-400'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <FileCode className="w-4 h-4 text-amber-400" />
          <span>Android Studio Code &amp; APK Export</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-5xl">
        {/* PLAYLISTS TAB */}
        {activeSubTab === 'playlists' && (
          <div className="space-y-8">
            {/* Active Playlists List */}
            <div>
              <h3 className="text-base font-bold text-neutral-200 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Installed Playlists</span>
              </h3>

              <div className="grid gap-3">
                {playlists.map((pl) => {
                  const isActive = pl.id === activePlaylistId;
                  return (
                    <div
                      key={pl.id}
                      className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                        isActive
                          ? 'bg-blue-950/40 border-blue-600/80 shadow-lg'
                          : 'bg-neutral-900/60 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${
                            pl.type === 'jiotv'
                              ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                              : 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                          }`}
                        >
                          {pl.type}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{pl.name}</span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400 mt-0.5">
                            {pl.channelCount} Channels • {pl.url}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <button
                            onClick={() => handleSelectPlaylist(pl.id)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                          >
                            Set Active
                          </button>
                        )}
                        {playlists.length > 1 && (
                          <button
                            onClick={() => handleDeletePlaylist(pl.id)}
                            className="p-2 rounded-xl bg-neutral-800 hover:bg-rose-950 text-neutral-400 hover:text-rose-400 transition"
                            title="Delete Playlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Import New M3U Playlist Card */}
            <div className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-200 flex items-center gap-2">
                    <ListPlus className="w-4 h-4 text-blue-400" />
                    <span>Import M3U / M3U8 Playlist</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Supports standard #EXTM3U, #EXTINF, tvg-id, tvg-logo, and relative stream URLs.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-neutral-800/80 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setIsRawMode(false)}
                    className={`px-3 py-1 rounded-lg transition font-medium ${
                      !isRawMode ? 'bg-blue-600 text-white' : 'text-neutral-400'
                    }`}
                  >
                    Remote URL
                  </button>
                  <button
                    onClick={() => setIsRawMode(true)}
                    className={`px-3 py-1 rounded-lg transition font-medium ${
                      isRawMode ? 'bg-blue-600 text-white' : 'text-neutral-400'
                    }`}
                  >
                    Paste Text
                  </button>
                </div>
              </div>

              {importStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-800/80'
                  }`}
                >
                  <span>{importStatus.message}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Playlist Name
                  </label>
                  <input
                    type="text"
                    value={m3uName}
                    onChange={(e) => setM3uName(e.target.value)}
                    placeholder="e.g. My Sports &amp; News M3U"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {!isRawMode ? (
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                      M3U / M3U8 HTTP(S) URL
                    </label>
                    <input
                      type="url"
                      value={m3uUrl}
                      onChange={(e) => setM3uUrl(e.target.value)}
                      placeholder="https://example.com/playlist.m3u8"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-sm focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                      Raw M3U Content
                    </label>
                    <textarea
                      rows={6}
                      value={m3uRawText}
                      onChange={(e) => setM3uRawText(e.target.value)}
                      placeholder={`#EXTM3U\n#EXTINF:-1 tvg-name="Channel 1" tvg-logo="https://logo.png" group-title="News",Channel 1 HD\nhttps://example.com/stream.m3u8`}
                      className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                )}

                <button
                  disabled={isImporting}
                  onClick={handleImportM3u}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Parsing &amp; Importing...</span>
                    </>
                  ) : (
                    <>
                      <ListPlus className="w-4 h-4" />
                      <span>Import Playlist</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* JIOTV GO API TAB */}
        {activeSubTab === 'jiotv' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">JioTV Go API Compatibility Layer</h3>
                  <p className="text-xs text-neutral-400">
                    Complies with JioTV Go response JSON: <code className="text-emerald-400">{'{ "code": 200, "result": [ ... ] }'}</code>
                  </p>
                </div>
              </div>

              {jioStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    jioStatus.type === 'success'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-800/80'
                  }`}
                >
                  <span>{jioStatus.message}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Service Name
                  </label>
                  <input
                    type="text"
                    value={jiotvName}
                    onChange={(e) => setJiotvName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      JioTV Go Server Endpoint / LAN URL
                    </label>
                    <span className="text-[11px] text-amber-400">
                      Use LAN IP (e.g. http://192.168.1.50:5001/channels) or built-in test endpoint
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={jiotvEndpoint}
                      onChange={(e) => setJiotvEndpoint(e.target.value)}
                      placeholder="http://<LAN_IP>:5001/channels or /api/jiotv-demo"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-sm focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      onClick={() => setJiotvEndpoint('/api/jiotv-demo')}
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium whitespace-nowrap"
                    >
                      Use Demo Server
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Custom Headers / Authentication (JSON)
                  </label>
                  <textarea
                    rows={2}
                    value={jiotvHeadersJson}
                    onChange={(e) => setJiotvHeadersJson(e.target.value)}
                    placeholder='{ "Authorization": "Bearer token", "ssoToken": "..." }'
                    className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    disabled={isConnectingJio}
                    onClick={handleConnectJioTv}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {isConnectingJio ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Connecting &amp; Validating...</span>
                      </>
                    ) : (
                      <>
                        <Server className="w-4 h-4" />
                        <span>Connect &amp; Fetch Channels</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PLAYBACK & PROXY TAB */}
        {activeSubTab === 'playback' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tv className="w-4 h-4 text-blue-400" />
                <span>Media3 ExoPlayer &amp; Networking Options</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Custom User-Agent Header
                  </label>
                  <input
                    type="text"
                    value={customUa}
                    onChange={(e) => setCustomUa(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Sent with stream manifest and segment requests.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
                  <div>
                    <div className="font-semibold text-sm text-neutral-200">
                      Enable Stream &amp; CORS Proxy
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Bypasses browser CORS restrictions for remote M3U and media streams.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={proxyEnabled}
                    onChange={(e) => setProxyEnabled(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
                  <div>
                    <div className="font-semibold text-sm text-neutral-200">
                      Auto-play On Launch
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Immediately starts the last selected channel upon opening the app.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-neutral-400 mb-1">
                    <span>Forward Buffer Target: {bufferGoalMs / 1000} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="60000"
                    step="5000"
                    value={bufferGoalMs}
                    onChange={(e) => setBufferGoalMs(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSavePlaybackOptions}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeSubTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Playback &amp; Parser Diagnostics Log</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Real-time event logging with automatic token and credential sanitization.
                </p>
              </div>
              <button
                onClick={() => {
                  logger.clear();
                  setLogs([]);
                }}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 transition"
              >
                Clear Log
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 font-mono text-xs max-h-[60vh] overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <div className="text-neutral-500 py-6 text-center">No log events recorded.</div>
              ) : (
                logs.map((log) => {
                  const color =
                    log.level === 'error'
                      ? 'text-rose-400 bg-rose-950/20 border-rose-900/40'
                      : log.level === 'warn'
                      ? 'text-amber-400 bg-amber-950/20 border-amber-900/40'
                      : log.level === 'success'
                      ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/40'
                      : 'text-neutral-300 bg-neutral-900/40 border-neutral-800';

                  return (
                    <div key={log.id} className={`p-2 rounded-lg border ${color}`}>
                      <div className="flex items-center gap-2 text-[10px] opacity-75">
                        <span>[{log.timestamp}]</span>
                        <span className="font-bold">[{log.module}]</span>
                        <span className="uppercase">[{log.level}]</span>
                      </div>
                      <div className="mt-1 font-sans text-xs break-all">{log.message}</div>
                      {log.details && (
                        <div className="mt-1 text-[11px] opacity-80 break-all">{log.details}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ANDROID STUDIO CODE & APK EXPORT TAB */}
        {activeSubTab === 'android_project' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <span>Production Android TV Kotlin Codebase</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Complete Android Studio project tree with Media3 ExoPlayer, Leanback, and M3U/JioTV Parsers.
                </p>
              </div>

              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition shadow-lg shadow-amber-600/20"
              >
                {isZipping ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download Android Studio Project (.ZIP)</span>
              </button>
            </div>

            {/* File Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {Object.keys(androidFiles).map((fileName) => (
                <button
                  key={fileName}
                  onClick={() => setSelectedFile(fileName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition flex items-center gap-1.5 whitespace-nowrap ${
                    selectedFile === fileName
                      ? 'bg-neutral-800 text-amber-400 border border-neutral-700 shadow'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{fileName}</span>
                </button>
              ))}
            </div>

            {/* Code Viewer */}
            <div className="relative rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/80 border-b border-neutral-800 text-xs font-mono text-neutral-400">
                <span>{selectedFile}</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>

              <pre className="p-4 text-xs font-mono text-neutral-200 overflow-x-auto max-h-[50vh] leading-relaxed">
                <code>{androidFiles[selectedFile]}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
