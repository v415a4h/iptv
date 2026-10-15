package com.iptvmate.app.data.model

import kotlinx.serialization.Serializable

@Serializable
enum class StreamType {
    HLS,
    DASH,
    DIRECT
}

@Serializable
data class DrmConfig(
    val keyUrl: String,
    val keySystem: String = "com.widevine.alpha",
    val headers: Map<String, String> = emptyMap()
)

@Serializable
data class Channel(
    val id: String,
    val number: Int,
    val name: String,
    val logo: String = "",
    val group: String = "General",
    val streamUrl: String,
    val streamType: StreamType = StreamType.HLS,
    val drmConfig: DrmConfig? = null,
    val order: Int = 0,
    val tvgId: String? = null,
    val userAgent: String? = null
)

@Serializable
data class Playlist(
    val id: String,
    val name: String,
    val type: String, // "m3u" or "jiotv"
    val url: String,
    val channelCount: Int,
    val lastUpdated: Long = System.currentTimeMillis()
)

@Serializable
data class JioTvChannelItem(
    val channel_id: Long? = null,
    val channel_name: String? = null,
    val channel_url: String? = null,
    val key_url: String? = null,
    val channel_logo: String? = null,
    val group: String? = null
)

@Serializable
data class JioTvApiResponse(
    val code: Int = 200,
    val message: String = "Success",
    val result: List<JioTvChannelItem> = emptyList()
)
