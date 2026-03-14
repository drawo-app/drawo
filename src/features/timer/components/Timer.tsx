import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Timer.css";
import "@features/music/components/MusicBar.css";
import {
  AlarmPause,
  AlarmPlay,
  ClockSquare,
  HourglassLine,
  Pause,
  Play,
  Stop,
} from "@solar-icons/react";
import { TIMER_STORAGE_KEY } from "@app/state/constants";
import type { LocaleMessages } from "@shared/i18n";

const PRESETS = [
  { label: "1 min", sec: 60 },
  { label: "5 min", sec: 300 },
  { label: "10 min", sec: 600 },
  { label: "25 min", sec: 1500 },
];

const DEFAULT_SECONDS = 300;
const MAX_SECONDS = 60 * 60;

interface TimerProps {
  isOpen: boolean;
  onOpenChange: (nextIsOpen: boolean) => void;
  messages: LocaleMessages;
}

interface TimerStoredState {
  total: number;
  remaining: number;
  running: boolean;
  done: boolean;
  updatedAt: number;
}

const clampSeconds = (value: number) =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_SECONDS, Math.floor(value)))
    : DEFAULT_SECONDS;

const getInitialTimerState = (): TimerStoredState => {
  const fallback: TimerStoredState = {
    total: DEFAULT_SECONDS,
    remaining: DEFAULT_SECONDS,
    running: false,
    done: false,
    updatedAt: Date.now(),
  };

  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<TimerStoredState>;
    const total = clampSeconds(parsed.total ?? fallback.total);
    const savedRemaining = clampSeconds(parsed.remaining ?? total);
    const updatedAt =
      typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now();
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - updatedAt) / 1000),
    );
    const wasRunning = parsed.running === true;
    const remaining = wasRunning
      ? Math.max(0, savedRemaining - elapsedSeconds)
      : savedRemaining;
    const running = wasRunning && remaining > 0;
    const done =
      remaining === 0 ? true : parsed.done === true && remaining === 0;

    return {
      total: Math.max(total, remaining),
      remaining,
      running,
      done,
      updatedAt: Date.now(),
    };
  } catch {
    return fallback;
  }
};

export const Timer = ({ isOpen, onOpenChange, messages }: TimerProps) => {
  const initialState = useMemo(() => getInitialTimerState(), []);
  const [total, setTotal] = useState(initialState.total);
  const [remaining, setRemaining] = useState(initialState.remaining);
  const [running, setRunning] = useState(initialState.running);
  const [done, setDone] = useState(initialState.done);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    if (running || remaining <= 0) {
      return;
    }
    setDone(false);
    setRunning(true);
  }, [remaining, running]);

  const pause = useCallback(() => stop(), [stop]);

  const reset = useCallback(() => {
    stop();
    setDone(false);
    setRemaining(total);
  }, [stop, total]);

  const applyPreset = useCallback(
    (sec: number) => {
      stop();
      setDone(false);
      setTotal(sec);
      setRemaining(sec);
    },
    [stop],
  );

  const addMinute = useCallback(() => {
    setDone(false);
    setTotal((current) => Math.min(MAX_SECONDS, current + 60));
    setRemaining((current) => Math.min(MAX_SECONDS, current + 60));
  }, []);

  useEffect(() => {
    if (!running) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setDone(true);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    const payload: TimerStoredState = {
      total,
      remaining,
      running,
      done,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore persistence errors.
    }
  }, [done, remaining, running, total]);

  return (
    <div className={"timer-container " + (isOpen ? "active" : "")}>
      <div className={`music-bar ${isOpen ? "music-bar-open" : ""}`}>
        <button
          type="button"
          className="music-bar-toggle"
          onClick={() => onOpenChange(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="timer-panel"
        >
          <div className="music-bar-toggle-content">
            <div className="music-bar-icon">
              {running ? (
                <AlarmPause weight="Bold" />
                
              ) : (
                <AlarmPlay weight="Bold" />
                  
              )}
            </div>
            <span className="music-bar-now-playing timer-font">{`${minutes.toString().length > 1 ? minutes : `0${minutes}`}:${seconds.toString().length > 1 ? seconds : `0${seconds}`}`}</span>
          </div>
        </button>

        {isOpen && (
          <div id="timer-panel" className="music-panel timer-panel">
            <div className="timer-content-container">
              <p className="timer-font timer-content">{`${minutes.toString().length > 1 ? minutes : `0${minutes}`}:${seconds.toString().length > 1 ? seconds : `0${seconds}`}`}</p>
              <p className="timer-font timer-content timer-background">88:88</p>
            </div>

            <div className="timer-progress-wrap">
              <div
                className="timer-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="timer-controls">
              <div className="timer-controls-section">
                <button className="timer-btn timer-textbtn" onClick={addMinute}>
                  +1 min
                </button>
              </div>
              <div className="timer-controls-section">
                <button className="timer-btn timer-iconbtn" onClick={reset}>
                  <Stop />
                </button>
                <button
                  className="timer-btn timer-iconbtn timer-btn--primary"
                  onClick={running ? pause : start}
                  disabled={done && !running}
                >
                  {running ? <Pause weight="Bold" /> : <Play weight="Bold" />}
                </button>
              </div>
            </div>

            <div className="timer-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.sec}
                  className="timer-preset"
                  onClick={() => applyPreset(p.sec)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
