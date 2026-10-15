import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Menu,
  Info,
  Tv,
  Volume2,
  VolumeX,
  X,
  Keyboard,
} from 'lucide-react';

interface AndroidTvRemoteProps {
  onDpadUp: () => void;
  onDpadDown: () => void;
  onDpadLeft: () => void;
  onDpadRight: () => void;
  onDpadSelect: () => void;
  onBack: () => void;
  onMenu: () => void;
  onInfo: () => void;
  onNumberPress: (num: number) => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export const AndroidTvRemote: React.FC<AndroidTvRemoteProps> = ({
  onDpadUp,
  onDpadDown,
  onDpadLeft,
  onDpadRight,
  onDpadSelect,
  onBack,
  onMenu,
  onInfo,
  onNumberPress,
  onToggleMute,
  isMuted,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showKeymap, setShowKeymap] = useState(false);

  return (
    <>
      {/* Floating remote toggle button if closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl transition border border-blue-400/30 text-sm font-medium backdrop-blur-md"
          title="Open Android TV Remote Control"
        >
          <Tv className="w-4 h-4" />
          <span>TV Remote</span>
        </button>
      )}

      {/* Floating Virtual Android TV Remote */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-72 bg-neutral-900/95 border border-neutral-700/80 rounded-3xl shadow-2xl p-4 backdrop-blur-xl text-neutral-200 select-none transition-all">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Android TV Remote
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowKeymap(!showKeymap)}
                className={`p-1.5 rounded-lg text-xs transition ${
                  showKeymap ? 'bg-blue-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'
                }`}
                title="Keyboard Shortcuts Map"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition"
                title="Minimize Remote"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Keyboard map tooltip */}
          {showKeymap && (
            <div className="mb-3 p-2.5 bg-neutral-800/90 rounded-xl text-xs text-neutral-300 space-y-1 border border-neutral-700 font-mono">
              <div className="font-semibold text-neutral-100 font-sans mb-1">Keyboard Shortcuts:</div>
              <div className="flex justify-between"><span>D-pad:</span> <span className="text-blue-400">Arrow Keys</span></div>
              <div className="flex justify-between"><span>Select/Play:</span> <span className="text-blue-400">Enter / Space</span></div>
              <div className="flex justify-between"><span>Sidebar:</span> <span className="text-blue-400">Left Arrow</span></div>
              <div className="flex justify-between"><span>Back:</span> <span className="text-blue-400">Esc / Backspace</span></div>
              <div className="flex justify-between"><span>Info / OSD:</span> <span className="text-blue-400">I key</span></div>
              <div className="flex justify-between"><span>Direct Tune:</span> <span className="text-blue-400">0 - 9 Keys</span></div>
            </div>
          )}

          {/* D-Pad Controller */}
          <div className="relative w-44 h-44 mx-auto my-3 bg-neutral-800/80 rounded-full border-2 border-neutral-700 flex items-center justify-center shadow-inner">
            {/* UP */}
            <button
              onClick={onDpadUp}
              className="absolute top-2 w-12 h-10 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700/60 rounded-t-full active:bg-blue-600 transition"
              title="D-Pad Up (Arrow Up)"
            >
              <ChevronUp className="w-6 h-6" />
            </button>

            {/* DOWN */}
            <button
              onClick={onDpadDown}
              className="absolute bottom-2 w-12 h-10 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700/60 rounded-b-full active:bg-blue-600 transition"
              title="D-Pad Down (Arrow Down)"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            {/* LEFT */}
            <button
              onClick={onDpadLeft}
              className="absolute left-2 w-10 h-12 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700/60 rounded-l-full active:bg-blue-600 transition"
              title="D-Pad Left (Arrow Left - opens sidebar)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* RIGHT */}
            <button
              onClick={onDpadRight}
              className="absolute right-2 w-10 h-12 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700/60 rounded-r-full active:bg-blue-600 transition"
              title="D-Pad Right (Arrow Right)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* CENTER OK / SELECT BUTTON */}
            <button
              onClick={onDpadSelect}
              className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-sm bg-neutral-700 hover:bg-neutral-600 active:bg-blue-600 text-neutral-100 transition shadow-lg"
              title="OK / Select (Press to Play Channel)"
            >
              <span>OK</span>
            </button>
          </div>

          {/* Primary Function Buttons: Back, Menu, Info, Mute */}
          <div className="grid grid-cols-4 gap-2 my-2">
            <button
              onClick={onBack}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 transition text-neutral-300"
              title="Back / Exit (Esc / Backspace)"
            >
              <RotateCcw className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Back</span>
            </button>

            <button
              onClick={onMenu}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 transition text-neutral-300"
              title="TV Menu (M key)"
            >
              <Menu className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Menu</span>
            </button>

            <button
              onClick={onInfo}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 transition text-neutral-300"
              title="Channel Info / OSD (I key)"
            >
              <Info className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Info</span>
            </button>

            <button
              onClick={onToggleMute}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
                isMuted
                  ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
              title="Mute / Unmute"
            >
              {isMuted ? <VolumeX className="w-4 h-4 mb-0.5 text-rose-400" /> : <Volume2 className="w-4 h-4 mb-0.5" />}
              <span className="text-[10px]">{isMuted ? 'Muted' : 'Sound'}</span>
            </button>
          </div>

          {/* Numeric Keypad for direct channel tuning */}
          <div className="mt-2 pt-2 border-t border-neutral-800">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold text-center">
              Direct Channel Tuning
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => onNumberPress(num)}
                  className="py-1.5 bg-neutral-800/70 hover:bg-neutral-700 active:bg-blue-600 rounded-lg text-xs font-semibold text-neutral-200 transition"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                onClick={() => onNumberPress(0)}
                className="py-1.5 bg-neutral-800/70 hover:bg-neutral-700 active:bg-blue-600 rounded-lg text-xs font-semibold text-neutral-200 transition"
              >
                0
              </button>
              <div />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
