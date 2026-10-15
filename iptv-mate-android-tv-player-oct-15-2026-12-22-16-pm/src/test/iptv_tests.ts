import { parseM3u } from '../data/parser/m3uParser';
import { parseJioTvResponse } from '../data/parser/jioTvParser';
import { resolveStreamUrl, detectStreamType, sanitizeUrlForLogging } from '../util/urlResolver';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

console.log('--- Running IPTV Mate Test Suite ---');

// Test 1: URL Resolver
console.log('\n[1] Testing URL Resolver & Sanitizer');
const absUrl = resolveStreamUrl('https://example.com/live.m3u8', 'http://unused.com');
assert(absUrl === 'https://example.com/live.m3u8', 'Absolute URL remains intact');

const relUrl = resolveStreamUrl('chunks/stream.m3u8', 'https://cdn.example.com/hls/master.m3u8');
assert(relUrl === 'https://cdn.example.com/hls/chunks/stream.m3u8', 'Relative URL correctly resolved against base');

const sanitized = sanitizeUrlForLogging('https://media.com/stream.m3u8?token=SECRET123&user=john');
assert(!sanitized.includes('SECRET123') && sanitized.includes('***REDACTED***'), 'Secrets and tokens are redacted from logs');

assert(detectStreamType('https://test.com/stream.mpd') === 'dash', 'Detects DASH stream type');
assert(detectStreamType('https://test.com/stream.m3u8') === 'hls', 'Detects HLS stream type');

// Test 2: M3U Parser
console.log('\n[2] Testing M3U / M3U8 Parser');
const sampleM3u = `#EXTM3U
#EXTINF:-1 tvg-id="ch_1" tvg-name="Sports 1" tvg-logo="https://logo.com/1.png" group-title="Sports",Premium Sports HD
https://cdn.example.com/sports/live.m3u8

#EXTINF:-1 tvg-id="ch_2" tvg-name="Movie DASH" tvg-logo="https://logo.com/2.png" group-title="Movies",Hollywood 4K
#KODIPROP:inputstream.adaptive.license_type=com.widevine.alpha
#KODIPROP:inputstream.adaptive.license_key=https://license.example.com/widevine
https://cdn.example.com/movies/manifest.mpd

#EXTINF:-1 tvg-name="Music Relative" group-title="Music",Hit Music TV
relative/stream.m3u8
`;

const m3uResult = parseM3u(sampleM3u, 'https://cdn.example.com/streams/');
assert(m3uResult.channels.length === 3, 'Parsed exactly 3 channels');
assert(m3uResult.channels[0].name === 'Premium Sports HD', 'Parsed channel 1 name');
assert(m3uResult.channels[0].group === 'Sports', 'Parsed channel 1 group');
assert(m3uResult.channels[0].streamType === 'hls', 'Parsed channel 1 HLS type');

assert(m3uResult.channels[1].name === 'Hollywood 4K', 'Parsed channel 2 name');
assert(m3uResult.channels[1].streamType === 'dash', 'Parsed channel 2 DASH type');
assert(m3uResult.channels[1].drmConfig?.keySystem === 'com.widevine.alpha', 'Parsed Widevine DRM keySystem');
assert(m3uResult.channels[1].drmConfig?.keyUrl === 'https://license.example.com/widevine', 'Parsed Widevine DRM keyUrl');

assert(m3uResult.channels[2].streamUrl === 'https://cdn.example.com/streams/relative/stream.m3u8', 'Resolved relative stream URL');

// Test 3: JioTV Go API Parser
console.log('\n[3] Testing JioTV Go JSON API Parser');
const sampleJioTvJson = {
  code: 200,
  message: 'Success',
  result: [
    {
      channel_id: 201,
      channel_name: 'Jio Cinema HD',
      channel_url: 'https://jiotv.live/cinema/master.mpd',
      key_url: 'https://drm.jiotv.live/widevine',
      channel_logo: 'https://jiotv.live/logos/cinema.png',
      group: 'Cinema'
    },
    {
      channel_id: 202,
      channel_name: 'Jio Sports 1',
      channel_url: 'https://jiotv.live/sports/live.m3u8',
      key_url: null,
      channel_logo: null
    }
  ]
};

const jioResult = parseJioTvResponse(sampleJioTvJson);
assert(jioResult.channels.length === 2, 'Parsed 2 JioTV channels from result envelope');
assert(jioResult.channels[0].name === 'Jio Cinema HD', 'Mapped Jio channel name');
assert(jioResult.channels[0].streamType === 'dash', 'Inferred DASH from .mpd');
assert(jioResult.channels[0].drmConfig?.keyUrl === 'https://drm.jiotv.live/widevine', 'Mapped Jio Widevine license URL');
assert(jioResult.channels[1].drmConfig === undefined, 'Non-DRM stream correctly has undefined drmConfig');

console.log('\n✅ All IPTV Mate Tests Passed Successfully!\n');
