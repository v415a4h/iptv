package com.iptvmate.app.data.parser

import com.iptvmate.app.data.model.Channel
import com.iptvmate.app.data.model.DrmConfig
import com.iptvmate.app.data.model.StreamType
import java.io.BufferedReader
import java.io.StringReader
import java.net.URI
import java.util.UUID
import java.util.regex.Pattern

object M3uParser {
    private val ATTR_REGEX = Pattern.compile("([a-zA-Z0-9_-]+)=\"([^\"]*)\"")

    fun parse(content: String, baseUrl: String? = null): List<Channel> {
        val channels = mutableListOf<Channel>()
        val reader = BufferedReader(StringReader(content))
        var line: String?

        var currentName: String? = null
        var currentLogo: String? = null
        var currentGroup: String? = null
        var currentTvgId: String? = null
        var currentDrm: DrmConfig? = null
        var currentUserAgent: String? = null
        var channelIndex = 1

        while (reader.readLine().also { line = it } != null) {
            val trimmed = line!!.trim()
            if (trimmed.isEmpty()) continue

            if (trimmed.startsWith("#EXTM3U")) continue

            if (trimmed.startsWith("#KODIPROP:") || trimmed.startsWith("#EXTVLCOPT:")) {
                if (trimmed.contains("license_key=") || trimmed.contains("license_url=")) {
                    val keyUrl = trimmed.substringAfter("=").trim()
                    currentDrm = DrmConfig(keyUrl = keyUrl)
                } else if (trimmed.contains("http-user-agent=")) {
                    currentUserAgent = trimmed.substringAfter("=").trim()
                }
                continue
            }

            if (trimmed.startsWith("#EXTINF:")) {
                val commaIndex = trimmed.lastIndexOf(',')
                val attrsPart = if (commaIndex != -1) trimmed.substring(8, commaIndex) else trimmed.substring(8)
                val titlePart = if (commaIndex != -1) trimmed.substring(commaIndex + 1).trim() else ""

                val matcher = ATTR_REGEX.matcher(attrsPart)
                val attrs = mutableMapOf<String, String>()
                while (matcher.find()) {
                    val key = matcher.group(1)?.lowercase() ?: ""
                    val value = matcher.group(2) ?: ""
                    attrs[key] = value
                }

                currentTvgId = attrs["tvg-id"] ?: attrs["id"]
                val tvgName = attrs["tvg-name"]
                currentLogo = attrs["tvg-logo"] ?: attrs["logo"] ?: ""
                currentGroup = attrs["group-title"] ?: attrs["group"] ?: "General"
                currentName = if (titlePart.isNotEmpty()) titlePart else tvgName ?: "Channel $channelIndex"
                continue
            }

            if (trimmed.startsWith("#")) continue

            // Stream URL
            val resolvedUrl = resolveUrl(trimmed, baseUrl)
            val streamType = when {
                resolvedUrl.contains(".mpd", ignoreCase = true) -> StreamType.DASH
                resolvedUrl.contains(".m3u8", ignoreCase = true) -> StreamType.HLS
                else -> StreamType.HLS
            }

            val channel = Channel(
                id = UUID.randomUUID().toString(),
                number = channelIndex,
                name = currentName ?: "Channel $channelIndex",
                logo = currentLogo ?: "",
                group = currentGroup ?: "General",
                streamUrl = resolvedUrl,
                streamType = streamType,
                drmConfig = currentDrm,
                order = channelIndex,
                tvgId = currentTvgId,
                userAgent = currentUserAgent
            )
            channels.add(channel)
            channelIndex++

            // Reset temp state
            currentName = null
            currentLogo = null
            currentGroup = null
            currentTvgId = null
            currentDrm = null
            currentUserAgent = null
        }

        return channels
    }

    private fun resolveUrl(url: String, baseUrl: String?): String {
        if (url.startsWith("http://", ignoreCase = true) || url.startsWith("https://", ignoreCase = true)) {
            return url
        }
        if (baseUrl != null) {
            return try {
                val baseUri = URI(baseUrl)
                baseUri.resolve(url).toString()
            } catch (e: Exception) {
                url
            }
        }
        return url
    }
}
