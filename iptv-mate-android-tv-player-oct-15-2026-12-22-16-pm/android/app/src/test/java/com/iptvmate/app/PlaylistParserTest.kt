package com.iptvmate.app

import com.iptvmate.app.data.model.StreamType
import com.iptvmate.app.data.parser.JioTvParser
import com.iptvmate.app.data.parser.M3uParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class PlaylistParserTest {

    @Test
    fun testM3uParsing() {
        val sampleM3u = """
            #EXTM3U
            #EXTINF:-1 tvg-id="c1" tvg-name="Sports 1" tvg-logo="http://logos.com/1.png" group-title="Sports",Super Sports HD
            https://example.com/live/stream1.m3u8
            #EXTINF:-1 tvg-id="c2" tvg-name="DASH Movie" tvg-logo="http://logos.com/2.png" group-title="Cinema",Movie Master
            #KODIPROP:inputstream.adaptive.license_key=https://license.com/widevine
            relative/path/stream2.mpd
        """.trimIndent()

        val channels = M3uParser.parse(sampleM3u, "https://example.com/playlist/")
        assertEquals(2, channels.size)

        val ch1 = channels[0]
        assertEquals("Super Sports HD", ch1.name)
        assertEquals("Sports", ch1.group)
        assertEquals(StreamType.HLS, ch1.streamType)
        assertEquals("https://example.com/live/stream1.m3u8", ch1.streamUrl)

        val ch2 = channels[1]
        assertEquals("Movie Master", ch2.name)
        assertEquals(StreamType.DASH, ch2.streamType)
        assertEquals("https://example.com/playlist/relative/path/stream2.mpd", ch2.streamUrl)
        assertNotNull(ch2.drmConfig)
        assertEquals("https://license.com/widevine", ch2.drmConfig?.keyUrl)
    }

    @Test
    fun testJioTvJsonParsing() {
        val jsonSample = """
            {
              "code": 200,
              "message": "Success",
              "result": [
                {
                  "channel_id": 101,
                  "channel_name": "Jio Star Movies",
                  "channel_url": "https://jiotv.live/stream.m3u8",
                  "key_url": "https://drm.jiotv.live/key",
                  "channel_logo": "https://jiotv.live/logo.png"
                }
              ]
            }
        """.trimIndent()

        val channels = JioTvParser.parse(jsonSample)
        assertEquals(1, channels.size)
        val channel = channels[0]
        assertEquals("Jio Star Movies", channel.name)
        assertEquals("https://jiotv.live/stream.m3u8", channel.streamUrl)
        assertNotNull(channel.drmConfig)
        assertEquals("https://drm.jiotv.live/key", channel.drmConfig?.keyUrl)
    }
}
