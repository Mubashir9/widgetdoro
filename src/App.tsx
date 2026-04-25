import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw, Settings as SettingsIcon, X, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

type Mode = 'focus' | 'shortBreak' | 'longBreak';
interface AppSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  soundEnabled: true,
};

const MODES: Record<Mode, { label: string; sessionColor: string; dotColor: string; shadowColor: string }> = {
  focus: { label: 'Focus', sessionColor: 'text-red-500', dotColor: 'bg-red-500', shadowColor: 'shadow-[0_0_12px_rgba(239,68,68,0.8)]' },
  shortBreak: { label: 'Short Break', sessionColor: 'text-emerald-500', dotColor: 'bg-emerald-500', shadowColor: 'shadow-[0_0_12px_rgba(16,185,129,0.8)]' },
  longBreak: { label: 'Long Break', sessionColor: 'text-blue-500', dotColor: 'bg-blue-500', shadowColor: 'shadow-[0_0_12px_rgba(59,130,246,0.8)]' },
};

const playAudioNotification = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(523.25, now, 0.4); // C5
    playTone(659.25, now + 0.15, 0.4); // E5
    playTone(783.99, now + 0.3, 0.6); // G5
  } catch (err) {
    console.error("Audio playback failed", err);
  }
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('pomodoroSettings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [mode, setMode] = useState<Mode>('focus');
  const [timeLeft, setTimeLeft] = useState(settings[mode] * 60);
  const [isActive, setIsActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Picture-in-Picture State
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const isPipSupported = 'documentPictureInPicture' in window;

  useEffect(() => {
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(settings[mode] * 60);
    }
  }, [mode, settings, isActive]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isActive) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsActive(false);
            if (settings.soundEnabled) playAudioNotification();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, settings.soundEnabled]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(settings[mode] * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const togglePip = async () => {
    if (pipWindow) {
      pipWindow.close();
      return;
    }

    try {
      // @ts-ignore
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: 520,
      });

      // Copy all style sheets attached to the main document into the pip window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pip.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = styleSheet.type;
          link.media = styleSheet.media;
          if (styleSheet.href) {
            link.href = styleSheet.href;
            pip.document.head.appendChild(link);
          }
        }
      });

      // Add a custom style to remove border radius/padding for the pip window specifically
      const pipStyle = document.createElement('style');
      pipStyle.textContent = `
        body { margin: 0; padding: 0; background-color: #161618; }
        #pip-root { height: 100vh; display: flex; flex-direction: column; }
      `;
      pip.document.head.appendChild(pipStyle);

      setPipWindow(pip);
      pip.addEventListener('pagehide', () => setPipWindow(null));
    } catch (e) {
      console.error("Failed to open PiP window", e);
      alert("Uh oh! Failed to open floating window.");
    }
  };

  const totalTime = settings[mode] * 60;
  const percentage = totalTime > 0 ? timeLeft / totalTime : 0;

  const MainWidget = (
    <div id="pip-root" data-tauri-drag-region className={`relative w-full ${pipWindow ? 'max-w-full h-full rounded-none border-0' : 'max-w-[360px] h-[520px] rounded-[40px] border border-[#2D2D30]'} bg-[#161618] shadow-2xl flex flex-col overflow-hidden`}>
      
      {/* Header */}
      <div className="flex justify-between items-center p-8 pb-4">
        <button
          onClick={() => {
            const modeKeys = Object.keys(MODES) as Mode[];
            const nextMode = modeKeys[(modeKeys.indexOf(mode) + 1) % modeKeys.length];
            setMode(nextMode);
            setIsActive(false);
          }}
          className={`text-[10px] uppercase tracking-[0.2em] font-bold ${MODES[mode].sessionColor} hover:opacity-80 transition-opacity focus:outline-none`}
          title="Click to change session type"
        >
          Session: {MODES[mode].label}
        </button>
        <div className="flex items-center gap-2" data-tauri-drag-region>
          {!pipWindow && isPipSupported && !isTauri && (
            <button
              onClick={togglePip}
              className="w-8 h-8 rounded-full bg-[#242427] flex items-center justify-center hover:bg-[#2D2D30] transition-colors focus:outline-none"
              title="Pop out into floating widget"
            >
              <ExternalLink size={14} strokeWidth={2.5} className="text-[#888] hover:text-white transition-colors" />
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-full bg-[#242427] flex items-center justify-center hover:bg-[#2D2D30] transition-colors focus:outline-none"
            title="Settings"
          >
            <SettingsIcon size={16} strokeWidth={2.5} />
          </button>
          {isTauri && (
            <button
              onClick={() => getCurrentWindow().close()}
              className="w-8 h-8 rounded-full bg-[#242427] flex items-center justify-center hover:bg-red-500/20 group transition-colors focus:outline-none"
              title="Close App"
            >
              <X size={16} strokeWidth={2.5} className="group-hover:text-red-500 transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Timer Visual */}
      <div className="flex-grow flex flex-col items-center justify-center mt-[-2rem]">
        <div className="text-[112px] font-black leading-none tracking-tighter text-white mb-2 tabular-nums">
          {formatTime(timeLeft)}
        </div>
        <div className={`w-1.5 h-1.5 rounded-full ${MODES[mode].dotColor} ${MODES[mode].shadowColor}`} />
      </div>

      {/* Controls */}
      <div className="mt-auto px-8 pb-8 flex flex-col gap-6">
        <div className="h-1.5 w-full bg-[#242427] rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-1000 ease-linear" 
            style={{ width: `${percentage * 100}%` }} 
          />
        </div>
        
        <div className="flex justify-center items-center gap-8">
          <button
            onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className="text-[#666] hover:text-white transition-colors focus:outline-none"
            title={settings.soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {settings.soundEnabled ? <Volume2 size={24} strokeWidth={2} /> : <VolumeX size={24} strokeWidth={2} />}
          </button>

          <button
            onClick={toggleTimer}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none"
          >
            {isActive ? <Pause size={32} className="fill-current" /> : <Play size={32} className="fill-current ml-1" />}
          </button>

          <button
            onClick={resetTimer}
            className="text-[#666] hover:text-white transition-colors focus:outline-none"
            title="Reset Timer"
          >
            <RotateCcw size={24} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Settings Modal Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-sm flex items-center justify-center ${pipWindow ? 'p-0' : 'p-4'}`}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`w-full h-full max-h-[520px] bg-[#1C1C1E] border-[#3A3A3C] p-8 flex flex-col ${pipWindow ? 'rounded-none border-0' : 'rounded-[40px] border'}`}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold tracking-tight text-white">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-[#666] hover:text-white transition-colors focus:outline-none"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto pr-1 pb-4 flex-1 custom-scrollbar">
                <SettingsRange
                  label="Focus Duration"
                  value={settings.focus}
                  valueColor="text-red-500"
                  onChange={(val) => setSettings({ ...settings, focus: val })}
                />
                <SettingsRange
                  label="Short Break"
                  value={settings.shortBreak}
                  valueColor="text-white"
                  onChange={(val) => setSettings({ ...settings, shortBreak: val })}
                />
                <SettingsRange
                  label="Long Break"
                  value={settings.longBreak}
                  valueColor="text-white"
                  onChange={(val) => setSettings({ ...settings, longBreak: val })}
                />

                <div className="pt-2">
                  <div 
                    className="flex items-center justify-between p-4 bg-[#2C2C2E] rounded-2xl cursor-pointer" 
                    onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                  >
                    <span className="font-medium text-sm text-white">Sound Notifications</span>
                    <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${settings.soundEnabled ? 'bg-red-500 justify-end' : 'bg-neutral-600 justify-start'}`}>
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="mt-4 w-full py-4 bg-white text-black font-bold rounded-2xl text-sm uppercase tracking-wider hover:bg-neutral-200 transition-colors focus:outline-none shrink-0"
              >
                Save Changes
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={`min-h-screen ${isTauri ? 'bg-transparent' : 'bg-[#0A0A0B]'} text-white flex flex-col items-center justify-center p-4 sm:p-8 font-sans overflow-hidden select-none`}>
      {!pipWindow && !isTauri && (
        <div className="text-center mb-8 hidden sm:block">
          <h1 className="text-3xl font-black tracking-tighter text-white">Widget<span className="text-red-500">Doro</span></h1>
          <p className="text-sm text-neutral-500 mt-2 font-bold tracking-widest uppercase">
            {isPipSupported ? 'Pop out or adjust browser window to use as a widget.' : 'Adjust browser window to use as a widget.'}
          </p>
        </div>
      )}

      {pipWindow ? (
        <div className="text-center">
          <p className="text-neutral-500 mb-4 tracking-widest uppercase font-bold text-sm">Timer is running in a floating window</p>
          <button 
            onClick={togglePip}
            className="px-6 py-3 bg-white text-black rounded-full font-bold uppercase tracking-wider text-sm hover:scale-105 transition-transform"
          >
            Bring Back Here
          </button>
          
          {/* We portal the widget into the PiP window's body */}
          {createPortal(MainWidget, pipWindow.document.body)}
        </div>
      ) : (
        MainWidget
      )}
    </div>
  );
}

interface SettingsRangeProps {
  label: string;
  value: number;
  valueColor: string;
  onChange: (val: number) => void;
}

function SettingsRange({ label, value, valueColor, onChange }: SettingsRangeProps) {
  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <label className="text-[11px] uppercase tracking-widest font-bold text-neutral-500">{label}</label>
        <span className={`text-xl font-bold italic ${valueColor}`}>{value}m</span>
      </div>
      <input
        type="range"
        min="1"
        max="60"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-white bg-neutral-800 h-1 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}


