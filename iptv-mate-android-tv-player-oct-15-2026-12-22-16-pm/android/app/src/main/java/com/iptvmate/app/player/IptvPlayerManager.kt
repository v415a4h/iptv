package com.iptvmate.app.player

import android.content.Context
import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.drm.DefaultDrmSessionManager
import androidx.media3.exoplayer.drm.DrmSessionManager
import androidx.media3.exoplayer.drm.HttpMediaDrmCallback
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.exoplayer.dash.DashMediaSource
import androidx.media3.exoplayer.hls.HlsMediaSource
import com.iptvmate.app.data.model.Channel
import com.iptvmate.app.data.model.StreamType

@OptIn(UnstableApi::class)
class IptvPlayerManager(private val context: Context) {

    private var exoPlayer: ExoPlayer? = null
    private var defaultUserAgent: String = "IPTVMate/1.0 (Android TV; ExoPlayer)"

    val player: ExoPlayer
        get() {
            if (exoPlayer == null) {
                initPlayer()
            }
            return exoPlayer!!
        }

    fun setUserAgent(ua: String) {
        if (ua.isNotBlank()) defaultUserAgent = ua
    }

    private fun initPlayer() {
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                5_000,   // Min buffer ms
                30_000,  // Max buffer ms
                1_000,   // Playback start buffer ms
                2_000    // Rebuffer ms
            )
            .build()

        exoPlayer = ExoPlayer.Builder(context)
            .setLoadControl(loadControl)
            .build()
            .apply {
                playWhenReady = true
                repeatMode = Player.REPEAT_MODE_OFF
            }
    }

    /**
     * Efficient channel switching: reuses existing player instance without black screens
     */
    fun switchChannel(channel: Channel) {
        val activePlayer = player
        val mediaSource = createMediaSource(channel)

        activePlayer.stop()
        activePlayer.setMediaSource(mediaSource)
        activePlayer.prepare()
        activePlayer.play()
    }

    private fun createMediaSource(channel: Channel): MediaSource {
        val userAgent = channel.userAgent ?: defaultUserAgent
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setUserAgent(userAgent)
            .setConnectTimeoutMs(10_000)
            .setReadTimeoutMs(15_000)
            .setAllowCrossProtocolRedirects(true)

        val uri = Uri.parse(channel.streamUrl)

        // Configure Widevine DRM if present
        val drmSessionManager: DrmSessionManager? = channel.drmConfig?.let { drm ->
            if (drm.keyUrl.isNotBlank()) {
                val drmCallback = HttpMediaDrmCallback(drm.keyUrl, httpDataSourceFactory).apply {
                    drm.headers.forEach { (k, v) -> setKeyRequestProperty(k, v) }
                }
                DefaultDrmSessionManager.Builder()
                    .setUuidAndExoMediaDrmProvider(C.WIDEVINE_UUID, androidx.media3.exoplayer.drm.FrameworkMediaDrm.DEFAULT_PROVIDER)
                    .build(drmCallback)
            } else null
        }

        return when (channel.streamType) {
            StreamType.DASH -> {
                val mediaItem = MediaItem.Builder()
                    .setUri(uri)
                    .setMimeType(MimeTypes.APPLICATION_MPD)
                    .build()
                val dashSourceFactory = DashMediaSource.Factory(httpDataSourceFactory)
                if (drmSessionManager != null) {
                    dashSourceFactory.setDrmSessionManagerProvider { drmSessionManager }
                }
                dashSourceFactory.createMediaSource(mediaItem)
            }
            StreamType.HLS -> {
                val mediaItem = MediaItem.Builder()
                    .setUri(uri)
                    .setMimeType(MimeTypes.APPLICATION_M3U8)
                    .build()
                val hlsSourceFactory = HlsMediaSource.Factory(httpDataSourceFactory)
                if (drmSessionManager != null) {
                    hlsSourceFactory.setDrmSessionManagerProvider { drmSessionManager }
                }
                hlsSourceFactory.createMediaSource(mediaItem)
            }
            StreamType.DIRECT -> {
                val mediaItem = MediaItem.fromUri(uri)
                ProgressiveMediaSource.Factory(httpDataSourceFactory)
                    .createMediaSource(mediaItem)
            }
        }
    }

    fun release() {
        exoPlayer?.release()
        exoPlayer = null
    }
}
