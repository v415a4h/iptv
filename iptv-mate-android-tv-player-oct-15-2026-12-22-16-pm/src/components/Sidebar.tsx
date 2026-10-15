import React from 'react';
import { Tv, Settings as SettingsIcon, ChevronRight } from 'lucide-react';

export type ScreenTab = 'livetv' | 'settings';

interface SidebarProps {
  isOpen: boolean;
  activeTab: ScreenTab;
  focusedItem: 'livetv' | 'settings';
  onSelectTab: (tab: ScreenTab) => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activeTab,
  focusedItem,
  onSelectTab,
  onClose,
}) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Android TV Sidebar - Strictly Contains ONLY "Live TV" and "Settings" */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-neutral-950/98 border-r border-neutral-800 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-neutral-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white tracking-wide">IPTV Mate</h1>
                <p className="text-[11px] text-neutral-400 font-mono">Android TV Edition</p>
              </div>
            </div>
          </div>

          {/* Navigation Items (Strictly Live TV & Settings) */}
          <div className="p-4 space-y-2">
            <button
              onClick={() => {
                onSelectTab('livetv');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all text-left font-medium ${
                focusedItem === 'livetv'
                  ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400 scale-[1.02]'
                  : activeTab === 'livetv'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Tv className="w-5 h-5" />
                <span className="text-base tracking-wide">Live TV</span>
              </div>
              {focusedItem === 'livetv' && <ChevronRight className="w-4 h-4 text-white/80" />}
            </button>

            <button
              onClick={() => {
                onSelectTab('settings');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all text-left font-medium ${
                focusedItem === 'settings'
                  ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400 scale-[1.02]'
                  : activeTab === 'settings'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-5 h-5" />
                <span className="text-base tracking-wide">Settings</span>
              </div>
              {focusedItem === 'settings' && <ChevronRight className="w-4 h-4 text-white/80" />}
            </button>
          </div>
        </div>

        {/* Sidebar TV footer guide */}
        <div className="p-4 border-t border-neutral-800 text-xs text-neutral-500 font-mono">
          <div className="flex items-center justify-between">
            <span>Close Sidebar:</span>
            <span className="text-neutral-300 font-sans">RIGHT or BACK</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span>Select:</span>
            <span className="text-neutral-300 font-sans">OK / ENTER</span>
          </div>
        </div>
      </div>
    </>
  );
};
