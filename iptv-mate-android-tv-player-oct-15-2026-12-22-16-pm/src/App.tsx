import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Channel, Settings } from './types/iptv';
import { PlaylistRepository } from './data/repository/playlistRepository';
import { VideoPlayerView } from './components/VideoPlayerView';
import { LiveTvScreen } from './components/LiveTvScreen';
import { Sidebar, ScreenTab } from './components/Sidebar';
import { SettingsScreen } from './components/SettingsScreen';
import { AndroidTvRemote } from './components/AndroidTvRemote';
import { logger } from './util/safeLogger';

export default function App() {
  const repo = PlaylistRepository.getInstance();

  const [settings, setSettings] = useState<Settings>(() => repo.getSettings());
  const [activeTab, setActiveTab] = useState<ScreenTab>('livetv');
  const [sidebarFocusedItem, setSidebarFocusedItem] = useState<'livetv' | 'settings'>('livetv');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Channels state
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  // OSD & Remote
  const [showOsd, setShowOsd] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showChannelList, setShowChannelList] = useState(true);

  // Direct channel number input buffer (e.g., typing '1', '2' to tune to CH 12)
  const numBufferRef = useRef<string>('');
  const numBufferTimerRef = useRef<number | null>(null);

  // Load channels for active playlist
  const loadChannels = useCallback(() => {
    const list = repo.getChannels(settings.activePlaylistId);
    setAllChannels(list);
    if (list.length > 0 && !selectedChannel) {
      setSelectedChannel(list[0]);
    }
  }, [settings.activePlaylistId, selectedChannel, repo]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    allChannels.forEach((ch) => {
      if (ch.group) set.add(ch.group);
    });
    return Array.from(set);
  }, [allChannels]);

  // Filtered channels
  const filteredChannels = useMemo(() => {
    if (activeCategory === 'All') return allChannels;
    return allChannels.filter((ch) => ch.group === activeCategory);
  }, [allChannels, activeCategory]);

  // Ensure focused index is within bounds
  useEffect(() => {
    if (focusedIndex >= filteredChannels.length && filteredChannels.length > 0) {
      setFocusedIndex(filteredChannels.length - 1);
    }
  }, [filteredChannels, focusedIndex]);

  // Direct channel number tuning
  const handleNumberInput = useCallback((num: number) => {
    numBufferRef.current += String(num);
    if (numBufferTimerRef.current) clearTimeout(numBufferTimerRef.current);

    numBufferTimerRef.current = window.setTimeout(() => {
      const targetNum = parseInt(numBufferRef.current, 10);
      numBufferRef.current = '';
      const match = allChannels.find((ch) => ch.number === targetNum);
      if (match) {
        setSelectedChannel(match);
        const idxInFiltered = filteredChannels.findIndex((c) => c.id === match.id);
        if (idxInFiltered !== -1) {
          setFocusedIndex(idxInFiltered);
        }
        logger.info('PLAYER', `Tuned directly to channel ${targetNum}: ${match.name}`);
      }
    }, 1200);
  }, [allChannels, filteredChannels]);

  // Navigation handlers
  const handleDpadUp = useCallback(() => {
    if (isSidebarOpen) {
      setSidebarFocusedItem('livetv');
      return;
    }
    setFocusedIndex((prev) => Math.max(0, prev - 1));
  }, [isSidebarOpen]);

  const handleDpadDown = useCallback(() => {
    if (isSidebarOpen) {
      setSidebarFocusedItem('settings');
      return;
    }
    setFocusedIndex((prev) => Math.min(filteredChannels.length - 1, prev + 1));
  }, [isSidebarOpen, filteredChannels.length]);

  const handleDpadLeft = useCallback(() => {
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
      setSidebarFocusedItem(activeTab);
    }
  }, [isSidebarOpen, activeTab]);

  const handleDpadRight = useCallback(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    } else {
      // Toggle channel list overlay visibility
      setShowChannelList((prev) => !prev);
    }
  }, [isSidebarOpen]);

  const handleDpadSelect = useCallback(() => {
    if (isSidebarOpen) {
      setActiveTab(sidebarFocusedItem);
      setIsSidebarOpen(false);
      return;
    }

    // Direct channel playback
    if (filteredChannels[focusedIndex]) {
      setSelectedChannel(filteredChannels[focusedIndex]);
    }
  }, [isSidebarOpen, sidebarFocusedItem, filteredChannels, focusedIndex]);

  const handleBack = useCallback(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
      return;
    }

    if (activeTab === 'settings') {
      setActiveTab('livetv');
      return;
    }

    if (!showChannelList) {
      setShowChannelList(true);
      return;
    }

    if (showOsd) {
      setShowOsd(false);
    }
  }, [isSidebarOpen, activeTab, showChannelList, showOsd]);

  // Global Keyboard Navigation (TV Remote)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text inputs or textareas
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Check numbers 0-9
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(parseInt(e.key, 10));
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleDpadUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleDpadDown();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleDpadLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleDpadRight();
          break;
        case 'Enter':
        case ' ': // Space
          e.preventDefault();
          handleDpadSelect();
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          handleBack();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          setShowOsd((prev) => !prev);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsSidebarOpen((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    handleDpadUp,
    handleDpadDown,
    handleDpadLeft,
    handleDpadRight,
    handleDpadSelect,
    handleBack,
    handleNumberInput,
  ]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none font-sans">
      {/* Background Media Player */}
      <VideoPlayerView
        currentChannel={selectedChannel}
        settings={settings}
        showOsd={showOsd}
        onCloseOsd={() => setShowOsd(false)}
        isMuted={isMuted}
      />

      {/* Live TV Screen with Channels (Opens directly on launch) */}
      {activeTab === 'livetv' && (
        <LiveTvScreen
          channels={filteredChannels}
          selectedChannel={selectedChannel}
          focusedIndex={focusedIndex}
          activeCategory={activeCategory}
          categories={categories}
          showChannelList={showChannelList}
          onSelectCategory={(cat) => {
            setActiveCategory(cat);
            setFocusedIndex(0);
          }}
          onSelectChannel={(ch, idx) => {
            setFocusedIndex(idx);
            setSelectedChannel(ch);
          }}
          onChannelClick={(ch, idx) => {
            setFocusedIndex(idx);
            setSelectedChannel(ch);
          }}
        />
      )}

      {/* Settings Screen */}
      {activeTab === 'settings' && (
        <SettingsScreen
          settings={settings}
          onSaveSettings={(newSettings) => setSettings(newSettings)}
          onPlaylistChange={() => {
            loadChannels();
            setActiveTab('livetv');
          }}
          onBack={() => setActiveTab('livetv')}
        />
      )}

      {/* Android TV Sidebar - Strictly Contains ONLY "Live TV" and "Settings" */}
      <Sidebar
        isOpen={isSidebarOpen}
        activeTab={activeTab}
        focusedItem={sidebarFocusedItem}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Floating Android TV Remote Controller */}
      <AndroidTvRemote
        onDpadUp={handleDpadUp}
        onDpadDown={handleDpadDown}
        onDpadLeft={handleDpadLeft}
        onDpadRight={handleDpadRight}
        onDpadSelect={handleDpadSelect}
        onBack={handleBack}
        onMenu={() => setIsSidebarOpen((prev) => !prev)}
        onInfo={() => setShowOsd((prev) => !prev)}
        onNumberPress={handleNumberInput}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        isMuted={isMuted}
      />
    </div>
  );
}
