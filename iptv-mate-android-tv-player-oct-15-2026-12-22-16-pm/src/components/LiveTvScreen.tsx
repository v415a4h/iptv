import React, { useRef, useEffect } from 'react';
import { Channel } from '../types/iptv';
import { ShieldCheck, Radio } from 'lucide-react';

interface LiveTvScreenProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  focusedIndex: number;
  activeCategory: string;
  categories: string[];
  showChannelList: boolean;
  onSelectCategory: (cat: string) => void;
  onSelectChannel: (channel: Channel, index: number) => void;
  onChannelClick: (channel: Channel, index: number) => void;
}

export const LiveTvScreen: React.FC<LiveTvScreenProps> = ({
  channels,
  selectedChannel,
  focusedIndex,
  activeCategory,
  categories,
  showChannelList,
  onSelectCategory,
  onSelectChannel,
  onChannelClick,
}) => {
  const channelListRef = useRef<HTMLDivElement>(null);
  const focusedItemRef = useRef<HTMLDivElement>(null);

  // Auto-scroll focused channel into view smoothly for TV 10-foot experience
  useEffect(() => {
    if (focusedItemRef.current) {
      focusedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [focusedIndex]);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
      {/* Top Bar: Categories */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 max-w-[80vw]">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all uppercase whitespace-nowrap backdrop-blur-md ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Channel List Overlay (Visible directly on launch per specification) */}
      {showChannelList && (
        <div className="w-96 max-h-[75vh] mt-4 flex flex-col rounded-3xl bg-neutral-950/90 border border-neutral-800 shadow-2xl backdrop-blur-xl pointer-events-auto overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-neutral-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-neutral-100 tracking-wide">Channels</span>
              <span className="text-xs text-neutral-400 font-mono">({channels.length})</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="hidden sm:inline">Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px] border border-neutral-700">LEFT</kbd>
              <span>for Sidebar</span>
            </div>
          </div>

          {/* Channels Scrollable View */}
          <div
            ref={channelListRef}
            className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-800"
          >
            {channels.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-xs">
                No channels found in this group.
              </div>
            ) : (
              channels.map((channel, idx) => {
                const isFocused = idx === focusedIndex;
                const isSelected = selectedChannel?.id === channel.id;

                return (
                  <div
                    key={channel.id}
                    ref={isFocused ? focusedItemRef : null}
                    onClick={() => onChannelClick(channel, idx)}
                    className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
                      isFocused
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300 scale-[1.02] shadow-lg shadow-blue-900/40'
                        : isSelected
                        ? 'bg-neutral-800/90 text-blue-300 border border-neutral-700'
                        : 'bg-neutral-900/50 hover:bg-neutral-800/60 text-neutral-200'
                    }`}
                  >
                    {/* Channel Number & Logo */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 text-center font-mono font-bold text-xs shrink-0 ${
                          isFocused ? 'text-blue-100' : 'text-neutral-400'
                        }`}
                      >
                        {channel.number}
                      </span>

                      {/* TV Channel Logo with Graceful Fallback */}
                      <div className="w-10 h-10 rounded-xl bg-neutral-800/80 border border-neutral-700/60 overflow-hidden shrink-0 flex items-center justify-center">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback on invalid or broken URL
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Radio className="w-4 h-4 text-neutral-500" />
                        )}
                      </div>

                      {/* Name & Group */}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate leading-tight">
                          {channel.name}
                        </div>
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isFocused ? 'text-blue-100/80' : 'text-neutral-400'
                          }`}
                        >
                          {channel.group}
                        </div>
                      </div>
                    </div>

                    {/* Stream Badges */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {channel.drmConfig && (
                        <span
                          title="Widevine DRM Protected"
                          className={`p-1 rounded-md ${
                            isFocused ? 'bg-blue-700 text-emerald-300' : 'bg-neutral-800 text-emerald-400'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          isFocused ? 'bg-blue-700 text-blue-100' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {channel.streamType}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick D-Pad Hint Footer */}
          <div className="px-4 py-2 border-t border-neutral-800/80 text-[11px] text-neutral-500 flex items-center justify-between font-mono">
            <span>OK: Play Channel</span>
            <span>RIGHT: Hide/Show List</span>
          </div>
        </div>
      )}

      {/* Empty bottom space placeholder */}
      <div />
    </div>
  );
};
