import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./MusicBar.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/select";
import {
  Bolt,
  CloudRain,
  HeadphonesRoundSound,
  LightbulbBolt,
  MusicNotes,
  Palette2,
  PaletteRound,
  Pause,
  Play,
  Radio,
  Rocket2,
  RulerCrossPen,
  SkipNext,
  SkipPrevious,
  Soundwave,
  TeaCup,
  VolumeCross,
  VolumeLoud,
} from "@solar-icons/react";
import { CDSVG } from "./CD";
import {
  invertLightnessPreservingHue,
  parseColor,
} from "../../../canvas/color";
import { MUSIC_BAR_STORAGE_KEY } from "../../state/constants";
import type { LocaleMessages } from "../../../i18n";

const CATEGORY_ICONS = {
  lofi: HeadphonesRoundSound,
  ambient: Soundwave,
  rain: CloudRain,
  chill: TeaCup,
  energy: Bolt,
  creative: Rocket2,
  default: Radio,
} satisfies Record<string, typeof Radio>;

const CATEGORY_COLORS: Record<string, string> = {
  lofi: "#7C6CF2",
  ambient: "#3A6FF7",
  rain: "#6BA4B8",
  chill: "#4CB782",
  energy: "#FF8A3D",
  creative: "#E35D9A",
  default: "#3A6FF7",
};

const API_HOST = "https://url.shard.es";
const API_MUSIC_ROOT = `${API_HOST}/music`;
const CROSSFADE_DURATION_MS = 10_000;
const FADE_TICK_MS = 100;
const DEFAULT_VOLUME = 0.9;
const CD_ROTATION_MS = 10_000;
const CD_ACCELERATION_PER_MS = 0.00018;

const normalizePath = (value: string) =>
  value
    .replaceAll("\\", "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");

const extractStation = (rawValue: string) => {
  const normalized = normalizePath(rawValue);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
};

const formatTrackLabel = (pathOrUrl: string) => {
  const normalized = normalizePath(pathOrUrl);
  const parts = normalized.split("/").filter(Boolean);
  const filename = parts[parts.length - 1] ?? normalized;
  return filename.replace(/\.mp3$/i, "").replaceAll("-", " ");
};

const buildTrackUrl = (station: string, rawTrackPath: string) => {
  const normalized = normalizePath(rawTrackPath);
  if (normalized.startsWith("music/")) {
    return `${API_HOST}/${normalized}`;
  }

  if (normalized.endsWith(".mp3")) {
    return `${API_MUSIC_ROOT}/${station}/${normalized}`;
  }

  return `${API_MUSIC_ROOT}/${station}/${normalized}.mp3`;
};

const shuffleTracks = (tracks: string[]) => {
  const shuffled = [...tracks];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = current;
  }
  return shuffled;
};

interface TrackHistoryItem {
  station: string;
  url: string;
  label: string;
}

interface MusicBarProps {
  isOpen: boolean;
  onOpenChange: (nextIsOpen: boolean) => void;
  messages: LocaleMessages;
}

interface MusicBarStoredState {
  activeStation: string | null;
  currentTrackLabel: string;
  currentTrackUrl: string | null;
  isPlaying: boolean;
  hasPrevious: boolean;
  volume: number;
  activeAudioIndex: 0 | 1;
  tracksByStation: Record<string, string[]>;
  unplayedByStation: Record<string, string[]>;
  trackHistory: TrackHistoryItem[];
  currentTrack: TrackHistoryItem | null;
}

const clampVolume = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_VOLUME;

const isTrackHistoryItem = (value: unknown): value is TrackHistoryItem => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TrackHistoryItem>;
  return (
    typeof candidate.station === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.label === "string"
  );
};

const toStringArrayRecord = (value: unknown): Record<string, string[]> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, string[]> = {};

  for (const key of Object.keys(input)) {
    const entry = input[key];
    if (Array.isArray(entry)) {
      output[key] = entry.filter(
        (item): item is string => typeof item === "string",
      );
    }
  }

  return output;
};

const getInitialMusicBarState = (): MusicBarStoredState => {
  const fallback: MusicBarStoredState = {
    activeStation: null,
    currentTrackLabel: "",
    currentTrackUrl: null,
    isPlaying: false,
    hasPrevious: false,
    volume: DEFAULT_VOLUME,
    activeAudioIndex: 0,
    tracksByStation: {},
    unplayedByStation: {},
    trackHistory: [],
    currentTrack: null,
  };

  try {
    const raw = localStorage.getItem(MUSIC_BAR_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<MusicBarStoredState>;
    const trackHistory = Array.isArray(parsed.trackHistory)
      ? parsed.trackHistory.filter(isTrackHistoryItem)
      : [];
    const currentTrack = isTrackHistoryItem(parsed.currentTrack)
      ? parsed.currentTrack
      : null;
    const currentTrackUrl =
      typeof parsed.currentTrackUrl === "string"
        ? parsed.currentTrackUrl
        : null;
    const currentTrackLabel =
      typeof parsed.currentTrackLabel === "string"
        ? parsed.currentTrackLabel
        : "";

    return {
      activeStation:
        typeof parsed.activeStation === "string" ? parsed.activeStation : null,
      currentTrackLabel,
      currentTrackUrl,
      isPlaying: parsed.isPlaying === true,
      hasPrevious: parsed.hasPrevious === true || trackHistory.length > 0,
      volume: clampVolume(parsed.volume ?? DEFAULT_VOLUME),
      activeAudioIndex: parsed.activeAudioIndex === 1 ? 1 : 0,
      tracksByStation: toStringArrayRecord(parsed.tracksByStation),
      unplayedByStation: toStringArrayRecord(parsed.unplayedByStation),
      trackHistory,
      currentTrack:
        currentTrack ??
        (currentTrackUrl
          ? {
              station:
                typeof parsed.activeStation === "string"
                  ? parsed.activeStation
                  : "",
              url: currentTrackUrl,
              label: currentTrackLabel || formatTrackLabel(currentTrackUrl),
            }
          : null),
    };
  } catch {
    return fallback;
  }
};

export const MusicBar = ({ isOpen, onOpenChange, messages }: MusicBarProps) => {
  const initialState = useMemo(getInitialMusicBarState, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(initialState.isPlaying);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<string[]>([]);
  const [activeStation, setActiveStation] = useState<string | null>(
    initialState.activeStation,
  );
  const [currentTrackLabel, setCurrentTrackLabel] = useState<string>(
    initialState.currentTrackLabel,
  );
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(
    initialState.currentTrackUrl,
  );
  const [hasPrevious, setHasPrevious] = useState(initialState.hasPrevious);
  const [volume, setVolume] = useState(initialState.volume);

  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioIndexRef = useRef<0 | 1>(initialState.activeAudioIndex);
  const fadeIntervalRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const tracksByStationRef = useRef<Record<string, string[]>>(
    initialState.tracksByStation,
  );
  const unplayedByStationRef = useRef<Record<string, string[]>>(
    initialState.unplayedByStation,
  );
  const trackHistoryRef = useRef<TrackHistoryItem[]>(initialState.trackHistory);
  const currentTrackRef = useRef<TrackHistoryItem | null>(
    initialState.currentTrack,
  );
  const volumeRef = useRef(initialState.volume);
  const cdSpinRef = useRef<HTMLDivElement | null>(null);
  const cdRafRef = useRef<number | null>(null);
  const cdLastTickRef = useRef<number | null>(null);
  const cdAngleRef = useRef(0);
  const cdVelocityRef = useRef(0);
  const cdTargetVelocityRef = useRef(0);
  const didRestoreAudioRef = useRef(false);

  const audios = useMemo(
    () => [audioARef, audioBRef] as const,
    [audioARef, audioBRef],
  );

  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current !== null) {
      window.clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const fetchStations = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${API_MUSIC_ROOT}/`);
      if (!response.ok) {
        throw new Error("No se pudieron cargar las radios");
      }

      const payload = (await response.json()) as string[];
      const nextStations = payload.map(extractStation).filter(Boolean);
      setStations(nextStations);
      if (nextStations.length > 0) {
        setActiveStation((current) => current ?? nextStations[0]);
      }
    } catch {
      setError("Error cargando radios");
    }
  }, []);

  const ensureTracksForStation = useCallback(async (station: string) => {
    const cached = tracksByStationRef.current[station];
    if (cached && cached.length > 0) {
      return cached;
    }

    const response = await fetch(`${API_MUSIC_ROOT}/${station}/`);
    if (!response.ok) {
      throw new Error("No se pudieron cargar canciones");
    }

    const payload = (await response.json()) as string[];
    const tracks = payload.map(normalizePath).filter(Boolean);
    tracksByStationRef.current[station] = tracks;
    return tracks;
  }, []);

  const takeNextTrackFromStation = useCallback(
    (station: string, tracks: string[]) => {
      if (tracks.length === 0) {
        return null;
      }

      const currentUrl = currentTrackRef.current?.url ?? currentTrackUrl;
      const currentNormalized = currentUrl ? normalizePath(currentUrl) : null;
      const currentIsFromStation = currentTrackRef.current?.station === station;

      if (
        !unplayedByStationRef.current[station] ||
        unplayedByStationRef.current[station].length === 0
      ) {
        const reshuffled = shuffleTracks(tracks);

        if (
          currentNormalized &&
          currentIsFromStation &&
          reshuffled.length > 1
        ) {
          const firstTrackUrl = normalizePath(
            buildTrackUrl(station, reshuffled[0]),
          );
          if (firstTrackUrl === currentNormalized) {
            const [first, ...rest] = reshuffled;
            unplayedByStationRef.current[station] = [...rest, first];
          } else {
            unplayedByStationRef.current[station] = reshuffled;
          }
        } else {
          unplayedByStationRef.current[station] = reshuffled;
        }
      }

      const nextTrack = unplayedByStationRef.current[station].shift();
      return nextTrack ?? null;
    },
    [currentTrackUrl],
  );

  const transitionToTrack = useCallback(
    async (
      nextTrackUrl: string,
      nextTrackLabel: string,
      options?: {
        pushToHistory?: boolean;
        station?: string;
        instant?: boolean;
      },
    ) => {
      if (isTransitioningRef.current) {
        return;
      }

      const fromIndex = activeAudioIndexRef.current;
      const toIndex = fromIndex === 0 ? 1 : 0;
      const fromAudio = audios[fromIndex].current;
      const toAudio = audios[toIndex].current;
      if (!toAudio) {
        return;
      }

      isTransitioningRef.current = true;
      clearFadeInterval();

      const shouldPushToHistory = options?.pushToHistory ?? true;
      const stationForTrack = options?.station ?? activeStation;
      const shouldBeInstant = options?.instant ?? false;
      if (
        shouldPushToHistory &&
        currentTrackRef.current &&
        currentTrackRef.current.url !== nextTrackUrl
      ) {
        trackHistoryRef.current.push(currentTrackRef.current);
        setHasPrevious(trackHistoryRef.current.length > 0);
      }

      toAudio.src = nextTrackUrl;
      toAudio.currentTime = 0;
      toAudio.volume = 0;

      try {
        await toAudio.play();
      } catch {
        isTransitioningRef.current = false;
        setError("El navegador bloqueó la reproducción automática");
        return;
      }

      setIsPlaying(true);
      activeAudioIndexRef.current = toIndex;

      if (shouldBeInstant) {
        clearFadeInterval();
        if (fromAudio) {
          fromAudio.pause();
          fromAudio.currentTime = 0;
          fromAudio.removeAttribute("src");
          fromAudio.load();
          fromAudio.volume = volumeRef.current;
        }
        toAudio.volume = volumeRef.current;
        setCurrentTrackUrl(nextTrackUrl);
        setCurrentTrackLabel(nextTrackLabel);
        currentTrackRef.current = {
          station: stationForTrack ?? "",
          url: nextTrackUrl,
          label: nextTrackLabel,
        };
        setIsPlaying(true);
        isTransitioningRef.current = false;
        return;
      }

      const fadeStart = performance.now();
      const fromStartVolume = fromAudio?.volume ?? 0;

      fadeIntervalRef.current = window.setInterval(() => {
        const elapsed = performance.now() - fadeStart;
        const progress = Math.min(1, elapsed / CROSSFADE_DURATION_MS);
        const targetVolume = volumeRef.current;

        toAudio.volume = targetVolume * progress;

        if (fromAudio && !fromAudio.paused) {
          fromAudio.volume = Math.max(0, fromStartVolume * (1 - progress));
        }

        if (progress >= 1) {
          clearFadeInterval();
          if (fromAudio) {
            fromAudio.pause();
            fromAudio.currentTime = 0;
            fromAudio.removeAttribute("src");
            fromAudio.load();
            fromAudio.volume = targetVolume;
          }
          toAudio.volume = targetVolume;
          setCurrentTrackUrl(nextTrackUrl);
          setCurrentTrackLabel(nextTrackLabel);
          currentTrackRef.current = {
            station: stationForTrack ?? "",
            url: nextTrackUrl,
            label: nextTrackLabel,
          };
          setIsPlaying(true);
          isTransitioningRef.current = false;
        }
      }, FADE_TICK_MS);
    },
    [activeStation, audios, clearFadeInterval],
  );

  const playRandomForStation = useCallback(
    async (station: string, options?: { instant?: boolean }) => {
      if (!station) {
        return;
      }

      setError(null);
      setIsLoading(true);

      try {
        const tracks = await ensureTracksForStation(station);
        const nextTrack = takeNextTrackFromStation(station, tracks);
        if (!nextTrack) {
          throw new Error("No hay canciones para esta radio");
        }

        const nextUrl = buildTrackUrl(station, nextTrack);
        await transitionToTrack(nextUrl, formatTrackLabel(nextTrack), {
          pushToHistory: true,
          station,
          instant: options?.instant ?? false,
        });
      } catch {
        setError("No se pudo reproducir la radio seleccionada");
      } finally {
        setIsLoading(false);
      }
    },
    [ensureTracksForStation, takeNextTrackFromStation, transitionToTrack],
  );

  const handleSelectStation = useCallback(
    async (station: string) => {
      setActiveStation(station);
      trackHistoryRef.current = [];
      setHasPrevious(false);
      unplayedByStationRef.current[station] = [];
      await playRandomForStation(station, { instant: true });
    },
    [playRandomForStation],
  );

  const handlePlayPause = useCallback(async () => {
    const activeAudio = audios[activeAudioIndexRef.current].current;
    if (!activeAudio) {
      return;
    }

    if (!activeStation) {
      if (stations.length > 0) {
        await handleSelectStation(stations[0]);
      }
      return;
    }

    if (activeAudio.paused) {
      if (!activeAudio.src) {
        await playRandomForStation(activeStation, { instant: true });
        return;
      }
      await activeAudio.play();
      setIsPlaying(true);
      return;
    }

    for (const audioRef of audios) {
      const audio = audioRef.current;
      if (!audio) {
        continue;
      }
      audio.pause();
    }
    setIsPlaying(false);
  }, [
    activeStation,
    audios,
    handleSelectStation,
    playRandomForStation,
    stations,
  ]);

  const handlePlay = useCallback(async () => {
    const activeAudio = audios[activeAudioIndexRef.current].current;
    if (!activeAudio) {
      return;
    }

    if (!activeStation) {
      if (stations.length > 0) {
        await handleSelectStation(stations[0]);
      }
      return;
    }

    if (!activeAudio.src) {
      await playRandomForStation(activeStation, { instant: true });
      return;
    }

    await activeAudio.play();
    setIsPlaying(true);
  }, [
    activeStation,
    audios,
    handleSelectStation,
    playRandomForStation,
    stations,
  ]);

  const handlePause = useCallback(() => {
    for (const audioRef of audios) {
      const audio = audioRef.current;
      if (!audio) {
        continue;
      }
      audio.pause();
    }

    setIsPlaying(false);
  }, [audios]);

  const handleSkip = useCallback(async () => {
    if (!activeStation) {
      return;
    }
    await playRandomForStation(activeStation, { instant: true });
  }, [activeStation, playRandomForStation]);

  const handlePrevious = useCallback(async () => {
    if (trackHistoryRef.current.length === 0) {
      return;
    }

    const previous = trackHistoryRef.current.pop();
    setHasPrevious(trackHistoryRef.current.length > 0);
    if (!previous) {
      return;
    }

    if (previous.station && previous.station !== activeStation) {
      setActiveStation(previous.station);
    }

    setError(null);
    setIsLoading(true);
    try {
      await transitionToTrack(previous.url, previous.label, {
        pushToHistory: false,
        station: previous.station,
        instant: true,
      });
    } catch {
      setError("No se pudo volver a la canción anterior");
    } finally {
      setIsLoading(false);
    }
  }, [activeStation, transitionToTrack]);

  const handleVolumeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextVolume = clampVolume(Number(event.target.value));
      setVolume(nextVolume);
      volumeRef.current = nextVolume;

      for (const audioRef of audios) {
        const audio = audioRef.current;
        if (!audio) {
          continue;
        }

        if (audio.paused) {
          continue;
        }

        audio.volume = nextVolume;
      }
    },
    [audios],
  );

  const saveSnapshot = useCallback(() => {
    const payload: MusicBarStoredState = {
      activeStation,
      currentTrackLabel,
      currentTrackUrl,
      isPlaying,
      hasPrevious: hasPrevious || trackHistoryRef.current.length > 0,
      volume,
      activeAudioIndex: activeAudioIndexRef.current,
      tracksByStation: tracksByStationRef.current,
      unplayedByStation: unplayedByStationRef.current,
      trackHistory: trackHistoryRef.current,
      currentTrack: currentTrackRef.current,
    };

    try {
      localStorage.setItem(MUSIC_BAR_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore persistence errors.
    }
  }, [
    activeStation,
    currentTrackLabel,
    currentTrackUrl,
    hasPrevious,
    isPlaying,
    volume,
  ]);

  useEffect(() => {
    if (didRestoreAudioRef.current) {
      return;
    }

    const firstAudio = audioARef.current;
    const secondAudio = audioBRef.current;
    if (!firstAudio || !secondAudio) {
      return;
    }

    didRestoreAudioRef.current = true;
    firstAudio.volume = volumeRef.current;
    secondAudio.volume = volumeRef.current;

    if (!currentTrackUrl) {
      return;
    }

    const activeAudio = audios[activeAudioIndexRef.current].current;
    if (!activeAudio) {
      return;
    }

    activeAudio.src = currentTrackUrl;
    activeAudio.load();
    if (!isPlaying) {
      return;
    }

    void activeAudio.play().catch(() => {
      setIsPlaying(false);
      setError("El navegador bloqueó la reproducción automática");
    });
  }, [audios, currentTrackUrl, isPlaying]);

  useEffect(() => {
    saveSnapshot();
  }, [saveSnapshot]);

  useEffect(() => {
    const persist = () => saveSnapshot();
    window.addEventListener("beforeunload", persist);

    return () => {
      persist();
      window.removeEventListener("beforeunload", persist);
    };
  }, [saveSnapshot]);

  useEffect(() => {
    void fetchStations();
  }, [fetchStations]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      return;
    }

    const mediaSession = navigator.mediaSession;
    mediaSession.setActionHandler("play", () => {
      void handlePlay();
    });
    mediaSession.setActionHandler("pause", () => {
      handlePause();
    });
    mediaSession.setActionHandler("nexttrack", () => {
      void handleSkip();
    });
    mediaSession.setActionHandler("previoustrack", () => {
      void handlePrevious();
    });
    mediaSession.setActionHandler("stop", () => {
      handlePause();
    });

    return () => {
      mediaSession.setActionHandler("play", null);
      mediaSession.setActionHandler("pause", null);
      mediaSession.setActionHandler("nexttrack", null);
      mediaSession.setActionHandler("previoustrack", null);
      mediaSession.setActionHandler("stop", null);
    };
  }, [handlePause, handlePlay, handlePrevious, handleSkip]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      return;
    }

    const mediaSession = navigator.mediaSession;
    const stationLabel = activeStation || "Unknown";
    mediaSession.metadata = new MediaMetadata({
      title: stationLabel[0].toUpperCase() + stationLabel.slice(1) + " radio",
      artist: "Drawo music",
    });
    mediaSession.playbackState = currentTrackUrl
      ? isPlaying
        ? "playing"
        : "paused"
      : "none";
  }, [activeStation, currentTrackLabel, currentTrackUrl, isPlaying]);

  useEffect(() => {
    const onEnded = () => {
      if (!activeStation) {
        return;
      }
      void playRandomForStation(activeStation);
    };

    const firstAudio = audioARef.current;
    const secondAudio = audioBRef.current;
    firstAudio?.addEventListener("ended", onEnded);
    secondAudio?.addEventListener("ended", onEnded);

    return () => {
      firstAudio?.removeEventListener("ended", onEnded);
      secondAudio?.removeEventListener("ended", onEnded);
    };
  }, [activeStation, playRandomForStation]);

  useEffect(() => {
    return () => {
      clearFadeInterval();
      if (cdRafRef.current !== null) {
        window.cancelAnimationFrame(cdRafRef.current);
        cdRafRef.current = null;
      }
      for (const audioRef of audios) {
        const audio = audioRef.current;
        if (!audio) {
          continue;
        }
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, [audios, clearFadeInterval]);

  useEffect(() => {
    const maxVelocity = 360 / CD_ROTATION_MS;
    const step = (timestamp: number) => {
      cdRafRef.current = window.requestAnimationFrame(step);

      if (cdLastTickRef.current === null) {
        cdLastTickRef.current = timestamp;
      }

      const deltaMs = Math.min(64, timestamp - cdLastTickRef.current);
      cdLastTickRef.current = timestamp;

      const targetVelocity = cdTargetVelocityRef.current;
      const currentVelocity = cdVelocityRef.current;
      const velocityDelta = targetVelocity - currentVelocity;
      const maxStep = CD_ACCELERATION_PER_MS * deltaMs;
      const nextVelocity =
        Math.abs(velocityDelta) <= maxStep
          ? targetVelocity
          : currentVelocity + Math.sign(velocityDelta) * maxStep;

      cdVelocityRef.current = Math.max(0, Math.min(maxVelocity, nextVelocity));
      cdAngleRef.current =
        (cdAngleRef.current + cdVelocityRef.current * deltaMs) % 360;

      const cdElement = cdSpinRef.current;
      if (cdElement) {
        cdElement.style.transform = `translate(-50%, -50%) rotate(${cdAngleRef.current}deg)`;
      }
    };

    cdRafRef.current = window.requestAnimationFrame(step);

    return () => {
      if (cdRafRef.current !== null) {
        window.cancelAnimationFrame(cdRafRef.current);
        cdRafRef.current = null;
      }
      cdLastTickRef.current = null;
    };
  }, []);

  useEffect(() => {
    cdTargetVelocityRef.current = isPlaying ? 360 / CD_ROTATION_MS : 0;
  }, [isPlaying]);

  const stationLabel = activeStation ?? "sin radio";

  const getCategoryIcon = (stationName: string) => {
    // Simple heuristic to match categories, you can adjust this based on your actual station names
    const lowerName = stationName.toLowerCase() as keyof typeof CATEGORY_ICONS;
    return CATEGORY_ICONS[lowerName] || CATEGORY_ICONS.default;
  };

  const getCategoryColor = (stationName: string) => {
    const lowerName = stationName.toLowerCase() as keyof typeof CATEGORY_COLORS;
    return CATEGORY_COLORS[lowerName] || CATEGORY_COLORS.default;
  };

  const ActiveCategoryIcon = getCategoryIcon(stationLabel);

  function CD() {
    return (
      <div
        style={{
          display: "flex",
          width: "90%",
          margin: "0px auto",
          zIndex: 5,
          position: "relative",
          transform: "translateY(18%)",
        }}
      >
        <div
          ref={cdSpinRef}
          className="music-cd-disc"
          style={{
            width: "66%",
            height: "66%",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(0deg)",
            transformOrigin: "center center",
            borderRadius: "50%",
            overflow: "hidden",
            zIndex: 5,
            backdropFilter: "blur(200px)",
            background: `linear-gradient(to right, ${getCategoryColor(stationLabel)}, ${getCategoryColor(stationLabel)}50)`,
          }}
        >
          <p>a</p>
          <ActiveCategoryIcon
            style={{
              width: "50%",
              height: "50%",
              top: "50%",
              left: "50%",
              color: "white",
              zIndex: 10,
              position: "absolute",
              transform: "translate(-50%, -50%)",
            }}
            weight="BoldDuotone"
          />
        </div>
        <span
          dangerouslySetInnerHTML={{
            __html: CDSVG,
          }}
        />
      </div>
    );
  }

  const parsedColor = parseColor(CATEGORY_COLORS[activeStation] || "#000000");

  return (
    <div className="music-bar-container">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .music-bar-container *, html.dark .music-bar-container * {
          --accent: rgba(${parsedColor.r}, ${parsedColor.g}, ${parsedColor.b}, ${parsedColor.a})!important;
          --accent-rgb: ${parsedColor.r}, ${parsedColor.g}, ${parsedColor.b}!important;
          }
        `,
        }}
      />
      <div className={`music-bar ${isOpen ? "music-bar-open" : ""}`}>
        <button
          type="button"
          className="music-bar-toggle"
          onClick={() => onOpenChange(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="music-panel"
          style={{
            background: isPlaying ? "rgba(var(--accent-rgb), .5)" : undefined,
          }}
        >
          <div className="music-bar-toggle-content">
            {isPlaying ? (
              <>
                <div className={`music-bar-icon`}>
                  <ActiveCategoryIcon weight="Bold" />
                </div>
                <span className="music-bar-now-playing">
                  {stationLabel}{" "}
                  <span
                    style={{
                      fontWeight: "normal",
                      opacity: 0.5,
                    }}
                  >
                    {messages.panels.playing}
                  </span>
                </span>
              </>
            ) : (
              <>
                <div className={`music-bar-icon`}>
                  <MusicNotes weight="Bold" />
                </div>
                <span className="music-bar-now-playing">
                  {messages.panels.music}
                </span>
              </>
            )}
          </div>
        </button>

        {isOpen ? (
          <div id="music-panel" className="music-panel">
            <div
              style={{ transform: "translateY(-10%)" }}
              className="music-station-select-container"
            >
              <div
                style={{
                  background: CATEGORY_COLORS[activeStation],
                  height: "10%",
                  width: "80%",
                  filter: "blur(100px)",
                  position: "absolute",
                  top: 0,
                  transform: "translateX(-50%)",
                  left: "50%",
                  zIndex: -1,
                }}
              />
              <CD />
              <Select
                value={activeStation ?? ""}
                onValueChange={(value) => void handleSelectStation(value)}
              >
                <SelectTrigger
                  className="music-selecttrigger"
                  style={{
                    zIndex: 10,
                    position: "relative",
                  }}
                >
                  <SelectValue placeholder="Selecciona una radio..." />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => {
                    const Icon = getCategoryIcon(station);
                    return (
                      <SelectItem key={station} value={station}>
                        <div className="music-elem">
                          <span className={getCategoryColor(station)}>
                            <Icon />
                          </span>
                          <span>
                            {station[0].toUpperCase()}
                            {station.slice(1)}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div
              className="music-controls-row"
              style={{ transform: "translateY(-30%)" }}
            >
              <button
                type="button"
                className="music-ctl"
                onClick={() => void handlePrevious()}
                disabled={!hasPrevious || isLoading}
                title="Anterior"
              >
                <SkipPrevious size={20} />
              </button>
              <button
                type="button"
                className="music-ctl music-ctl-play"
                onClick={() => void handlePlayPause()}
                title={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? (
                  <Pause weight="Bold" size={24} />
                ) : (
                  <Play weight="Bold" size={24} />
                )}
              </button>
              <button
                type="button"
                className="music-ctl"
                onClick={() => void handleSkip()}
                title="Saltar"
              >
                <SkipNext size={20} />
              </button>
            </div>

            <div className="music-volume-row">
              {volume <= 0.01 ? (
                <VolumeCross size={24} />
              ) : (
                <VolumeLoud size={24} />
              )}
              <input
                className="music-volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                aria-label="Volumen"
              />
              <span className="music-volume-value">
                {Math.round(volume * 100)}%
              </span>
            </div>

            {error ? (
              <p className="music-status music-status-error">{error}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <audio ref={audioARef} className="music-audio-hidden" preload="none" />
      <audio ref={audioBRef} className="music-audio-hidden" preload="none" />
    </div>
  );
};
