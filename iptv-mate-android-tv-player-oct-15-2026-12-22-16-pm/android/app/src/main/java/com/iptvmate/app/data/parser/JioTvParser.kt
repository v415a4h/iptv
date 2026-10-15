package com.iptvmate.app.data.parser

import com.iptvmate.app.data.model.Channel
import com.iptvmate.app.data.model.DrmConfig
import com.iptvmate.app.data.model.JioTvApiResponse
import com.iptvmate.app.data.model.StreamType
import kotlinx.serialization.json.Json
import java.util.UUID

object JioTvParser {
    private val json = Json { ignoreUnknownKeys = true }

    fun parse(jsonString: String): List<Channel> {
        val channels = mutableListOf<Channel>()
        return try {
            val response = json.decodeFromString<JioTvApiResponse>(jsonString)
            var index = 1
            for (item in response.result) {
                val streamUrl = item.channel_url ?: continue
                val name = item.channel_name ?: "Jio Channel $index"
                val logo = item.channel_logo ?: ""
                val group = item.group ?: "JioTV"

                val streamType = if (streamUrl.contains(".mpd", ignoreCase = true)) {
                    StreamType.DASH
                } else {
                    StreamType.HLS
                }

                val drmConfig = if (!item.key_url.isNullOrBlank()) {
                    DrmConfig(keyUrl = item.key_url)
                } else null

                channels.add(
                    Channel(
                        id = "jiotv_${item.channel_id ?: UUID.randomUUID().toString()}",
                        number = index,
                        name = name,
                        logo = logo,
                        group = group,
                        streamUrl = streamUrl,
                        streamType = streamType,
                        drmConfig = drmConfig,
                        order = index,
                        tvgId = item.channel_id?.toString()
                    )
                )
                index++
            }
            channels
        } catch (e: Exception) {
            emptyList()
        }
    }
}
