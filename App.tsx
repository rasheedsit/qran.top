import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { SurahReference, SurahData, Ayah, QuranEdition, QuranFont, Collections, SavedItem, FontSize, BrowsingMode } from './types';
import { useNotebook } from './hooks/useNotebook';
import { AuthProvider } from './hooks/useAuth';
import SurahDetailView from './components/SurahDetailView';
import { SearchView } from './components/SearchView';
import SettingsView from './components/SettingsView';
import AdminView from './components/AdminView';
import LoadingScreen from './components/LoadingScreen';
import TopProgressBar from './components/TopProgressBar';
import CommentsCloudView from './components/CommentsCloudView';
import SavedView from './components/SavedView';
import SaveItemModal from './components/SaveItemModal';
import SidePanel from './components/SidePanel';
import AudioPlayerBar from './components/AudioPlayerBar';
import Toolbox from './components/Toolbox';
import KhatmiyahView from './components/KhatmiyahView';
import AudioKhatmiyahView from './components/AudioKhatmiyahView';
import ThemeToggleButton from './components/ThemeToggleButton';
import EditionChoiceModal from './components/EditionChoiceModal';
import HomeView from './components/HomeView';
import UpdateNotification from './components/UpdateNotification';
import { ArrowUpIcon, SearchIcon, MenuIcon, MicrophoneIcon } from './components/icons';
import { normalizeArabicText, formatSurahNameForDisplay } from './utils/text';
import { db } from './firebase';

const QURAN_EDITION_KEY = 'qran_app_edition';
const ACTIVE_EDITIONS_KEY = 'qran_app_active_editions';
const FONT_KEY = 'qran_app_selected_font';
const FONT_SIZE_KEY = 'qran_app_font_size';
const AUDIO_EDITION_KEY = 'qran_app_audio_edition';
const KHATMIYAH_AUDIO_PROGRESS_KEY = 'qran_khatmiyah_audio_progress';
const EDITION_PROMPT_SEEN_KEY = 'qran_edition_prompt_seen';
const BROWSING_MODE_KEY = 'qran_app_browsing_mode';

// --- Default Data for Fallback ---
const DEFAULT_FONTS: QuranFont[] = [
    { name: "خط الجهاز (عثماني)", font_family: "Uthman" },
    { name: "أميري قرآن", font_family: "Amiri Quran" },
    { name: "نوتو نسخ عربي", font_family: "Noto Naskh Arabic" },
    { name: "شهرزاد الجديد", font_family: "Scheherazade New" },
    { name: "ريم كوفي", font_family: "Reem Kufi" },
    { name: "نوتو كوفي عربي", font_family: "Noto Kufi Arabic" },
    { name: "تجوال", font_family: "Tajawal" },
];

const ALL_AUDIO_EDITIONS: QuranEdition[] = [
    {
        identifier: "ar.abdulbasitmurattal", language: "ar", name: "عبد الباسط عبد الصمد", englishName: "Abdul Basit 'Abdus Samad",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "alquran.cloud"
    },
    {
        identifier: "ar.mahermuaiqly", language: "ar", name: "ماهر المعيقلي", englishName: "Maher Al Muaiqly",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "alquran.cloud"
    },
    {
        identifier: "ar.alafasy", language: "ar", name: "مشاري راشد العفاسي", englishName: "Mishary Rashid Alafasy",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "alquran.cloud"
    },
    {
        identifier: "ar.sudais", language: "ar", name: "عبدالرحمن السديس", englishName: "Abdurrahmaan As-Sudais",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "versebyversequran.com", reciterIdentifier: "Abdurrahmaan_As-Sudais_192kbps"
    },
    {
        identifier: "ar.shuraim", language: "ar", name: "سعود الشريم", englishName: "Saood Ash-Shuraym",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "versebyversequran.com", reciterIdentifier: "Saood_ash-Shuraym_128kbps"
    },
    {
        identifier: "ar.husarymujawwad", language: "ar", name: "محمود خليل الحصري (مجود)", englishName: "Mahmoud Khalil Al-Husary (Mujawwad)",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "versebyversequran.com", reciterIdentifier: "Husary_128kbps_Mujawwad"
    },
     {
        identifier: "ar.minshawimujawwad", language: "ar", name: "محمد صديق المنشاوي (مجود)", englishName: "Mohamed Siddiq al-Minshawi (Mujawwad)",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "versebyversequran.com", reciterIdentifier: "Minshawy_Mujawwad_192kbps"
    },
    {
        identifier: "ar.hudhaify", language: "ar", name: "علي الحذيفي", englishName: "Ali al-Hudhaify",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "versebyversequran.com", reciterIdentifier: "Hudhaify_128kbps"
    },
    {
        identifier: "ar.basfar", language: "ar", name: "عبدالله بصفر", englishName: "Abdullah Basfar",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "versebyversequran.com", reciterIdentifier: "Abdullah_Basfar_192kbps"
    },
    {
        identifier: "ar.shaatree", language: "ar", name: "أبو بكر الشاطري", englishName: "Abu Bakr Ash-Shaatree",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "versebyversequran.com", reciterIdentifier: "Abu_Bakr_Ash-Shaatree_128kbps"
    },
    {
        identifier: "ar.jibreel", language: "ar", name: "محمد جبريل", englishName: "Mohammad Jibreel",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "versebyversequran.com", reciterIdentifier: "Muhammad_Jibreel_128kbps"
    },
    {
        identifier: "ar.dussary", language: "ar", name: "ياسر الدوسري", englishName: "Yasser Ad-Dussary",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "versebyversequran.com", reciterIdentifier: "Yasser_Ad-Dussary_128kbps"
    },
    {
        identifier: "ar.ahmedajamy", language: "ar", name: "أحمد العجمي", englishName: "Ahmed Al-Ajmi",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "islamic-network"
    },
    {
        identifier: "ar.muhammadayyoub", language: "ar", name: "محمد أيوب", englishName: "Muhammad Ayyub",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "islamic-network"
    },
    {
        identifier: "ar.ghamdi.verse", language: "ar", name: "سعد الغامدي", englishName: "Saad Al Ghamdi",
        format: "audio", type: "versebyverse", direction: "rtl", sourceApi: "versebyversequran.com", reciterIdentifier: "Ghamadi_40kbps"
    },
];

const DEFAULT_EDITIONS: QuranEdition[] = [
    {
      identifier: "quran-simple-clean", language: "ar", name: "المصحف الشريف المبسط (بدون تشكيل)",
      englishName: "Simple Clean", format: "text", type: "quran", direction: "rtl", sourceApi: "alquran.cloud"
    },
    {
      identifier: "quran-uthmani", language: "ar", name: "المصحف الشريف برسم العثماني",
      englishName: "Uthmani", format: "text", type: "quran", direction: "rtl", sourceApi: "alquran.cloud"
    },
    {
      identifier: "ar.muyassar", language: "ar", name: "تفسير المیسر", englishName: "Tafsir al-Muyassar",
      format: "text", type: "tafsir", direction: "rtl", sourceApi: "alquran.cloud"
    },
    {
      identifier: "en.sahih", language: "en", name: "ترجمة صحيح الدولية (إنجليزية)", englishName: "Saheeh International",
      format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.ahmedali", language: "en", name: "Ahmed Ali", englishName: "Ahmed Ali",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.ahmedraza", language: "en", name: "Ahmed Raza Khan", englishName: "Ahmed Raza Khan",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.arberry", language: "en", name: "Arberry", englishName: "A. J. Arberry",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.asad", language: "en", name: "Asad", englishName: "Muhammad Asad",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.daryabadi", language: "en", name: "Daryabadi", englishName: "Abdul Majid Daryabadi",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.hilali", language: "en", name: "Hilali & Khan", englishName: "Muhammad Taqi-ud-Din al-Hilali and Muhammad Muhsin Khan",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.pickthall", language: "en", name: "Pickthall", englishName: "Mohammed Marmaduke William Pickthall",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.qaribullah", language: "en", name: "Qaribullah & Darwish", englishName: "Hasan al-Fatih Qaribullah and Ahmad Darwish",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.sarwar", language: "en", name: "Sarwar", englishName: "Muhammad Sarwar",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.yusufali", language: "en", name: "Yusuf Ali", englishName: "Abdullah Yusuf Ali",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.maududi", language: "en", name: "Maududi", englishName: "Abul Ala Maududi",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.shakir", language: "en", name: "Shakir", englishName: "Mohammad Habib Shakir",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.itani", language: "en", name: "Clear Qur'an - Talal Itani", englishName: "Clear Qur'an by Talal Itani",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.mubarakpuri", language: "en", name: "Mubarakpuri", englishName: "Mubarakpuri",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.qarai", language: "en", name: "Qarai", englishName: "Qarai",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
    {
        identifier: "en.wahiduddin", language: "en", name: "Wahiduddin Khan", englishName: "Wahiduddin Khan",
        format: "text", type: "translation", direction: "ltr", sourceApi: "alquran.cloud"
    },
];

const SearchForm: React.FC<{ onSearch: (query: string) => void }> = ({ onSearch }) => {
    const [query, setQuery] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };
    
    const playTone = (frequency: number, duration: number) => {
        try {
            const audioCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
            if (!audioCtx) return;

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
            
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.error("Web Audio API error:", e);
        }
    };
    
    const handleVoiceSearch = async () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("عذراً، البحث الصوتي غير مدعوم في متصفحك.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
        } catch (err: any) {
            console.error("Microphone permission error", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                 alert("للبحث الصوتي، يرجى السماح بالوصول إلى الميكروفون في إعدادات متصفحك أو عند الطلب.");
            } else {
                 alert("لم يتم العثور على ميكروفون أو حدث خطأ عند محاولة الوصول إليه.");
            }
            return;
        }
        
        playTone(880, 0.15);

        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            let transcript = event.results[0][0].transcript;
            // إزالة علامات الترقيم الشائعة
            transcript = transcript.replace(/[.?!؟,]/g, '').trim();
            setQuery(transcript);
            onSearch(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            if (event.error !== 'not-allowed' && event.error !== 'service-not-allowed' && event.error !== 'no-speech') {
                 alert("حدث خطأ أثناء التعرف على الصوت.");
            }
        };
        
        recognition.onend = () => {
            playTone(523, 0.2);
            setIsListening(false);
            recognitionRef.current = null;
        };
        
        recognition.start();
    };

    return (
        <form onSubmit={handleSubmit} className="flex-grow w-full max-w-xl">
            <div className="relative">
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث عن كلمة، أو أدخل مرجعاً مثل (البقرة ٢٥٥)..."
                    className="w-full text-base py-3 pl-20 pr-4 bg-surface border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    aria-label="بحث في المصحف الشريف"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={handleVoiceSearch} className={`p-1 text-text-subtle rounded-full ${isListening ? 'text-red-500 animate-pulse-mic' : 'hover:text-primary'}`} aria-label="بحث صوتي" title="بحث صوتي">
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                    <button type="submit" className="p-1 text-text-subtle hover:text-primary" aria-label="بحث">
                        <SearchIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </form>
    );
};


// --- Audio Player Helper Functions ---
const getAudioUrl = (ayah: Ayah, audioEditionDetails: QuranEdition): string | undefined => {
  const { sourceApi, reciterIdentifier, identifier } = audioEditionDetails;
  if (!ayah.surah?.number) return undefined;

  switch (sourceApi) {
    case 'versebyversequran.com':
      if (!reciterIdentifier) return undefined;
      const surahNumPad = ayah.surah.number.toString().padStart(3, '0');
      const ayahNumPad = ayah.numberInSurah.toString().padStart(3, '0');
      return `https://everyayah.com/data/${reciterIdentifier}/${surahNumPad}${ayahNumPad}.mp3`;

    case 'islamic-network':
      if (!ayah.number) return undefined;
      return `https://cdn.islamic.network/quran/audio/128/${identifier}/${ayah.number}.mp3`;

    default:
      return undefined;
  }
};

const getBismillahAudioUrl = (audioEditionDetails: QuranEdition): string | undefined => {
  const { sourceApi, reciterIdentifier, identifier } = audioEditionDetails;
  switch (sourceApi) {
    case 'versebyversequran.com':
      return reciterIdentifier ? `https://everyayah.com/data/${reciterIdentifier}/001001.mp3` : undefined;
    case 'islamic-network':
    case 'alquran.cloud': // Fallthrough is intentional
      return `https://cdn.islamic.network/quran/audio/128/${identifier}/1.mp3`;
    default:
      return undefined;
  }
};

// --- Levenshtein Distance Helper ---
const levenshtein = (s1: string, s2: string): number => {
    if (s1.length < s2.length) { return levenshtein(s2, s1); }
    if (s2.length === 0) { return s1.length; }
    let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
    for (let i = 0; i < s1.length; i++) {
        let currentRow = [i + 1];
        for (let j = 0; j < s2.length; j++) {
            let insertions = previousRow[j + 1] + 1;
            let deletions = currentRow[j] + 1;
            let substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
            currentRow.push(Math.min(insertions, deletions, substitutions));
        }
        previousRow = currentRow;
    }
    return previousRow[s2.length];
};

const App: React.FC = () => {
    const [allQuranData, setAllQuranData] = useState<{ [key: string]: SurahData[] } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPath, setCurrentPath] = useState(window.location.hash || '#/');
    const [showScroll, setShowScroll] = useState(false);
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    
    const [adminClickCount, setAdminClickCount] = useState(0);
    const adminClickTimeout = useRef<number | null>(null);
    
    const [availableFonts, setAvailableFonts] = useState<QuranFont[]>(DEFAULT_FONTS);
    const [availableEditions, setAvailableEditions] = useState<QuranEdition[]>(DEFAULT_EDITIONS);
    
    const [loadingEditions, setLoadingEditions] = useState<string[]>([]);

    const [selectedFontFamily, setSelectedFontFamily] = useState<string>(() => localStorage.getItem(FONT_KEY) || 'Amiri Quran');
    const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem(FONT_SIZE_KEY) as FontSize) || 'md');
    
    const [browsingMode, setBrowsingMode] = useState<BrowsingMode>(() => {
        const storedMode = localStorage.getItem(BROWSING_MODE_KEY) as BrowsingMode;
        if (storedMode) return storedMode;

        const initialEdition = localStorage.getItem(QURAN_EDITION_KEY);
        // Default to page view for readers (Uthmani), full view for searchers (Imla'i)
        return initialEdition === 'quran-uthmani' ? 'page' : 'full';
    });

    const [activeEditions, setActiveEditions] = useState<QuranEdition[]>(() => {
        try {
            const stored = localStorage.getItem(ACTIVE_EDITIONS_KEY);
            return stored ? JSON.parse(stored) : DEFAULT_EDITIONS.slice(0, 2); // Default to first two
        } catch (e) {
            console.error("Failed to parse active editions from localStorage", e);
            return DEFAULT_EDITIONS.slice(0, 2);
        }
    });

    const [selectedEdition, setSelectedEdition] = useState<string>(
        () => localStorage.getItem(QURAN_EDITION_KEY) || 'quran-uthmani'
    );

    const [selectedAudioEdition, setSelectedAudioEdition] = useState<string>(
        () => localStorage.getItem(AUDIO_EDITION_KEY) || 'ar.alafasy'
    );
    
    const [showEditionPrompt, setShowEditionPrompt] = useState(false);

    // --- State for PWA update notification ---
    const [showUpdateNotification, setShowUpdateNotification] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    // --- State for Saved Items (Tadabbur Notebook) - Now managed by useNotebook hook ---
    const {
        collections,
        itemToSave,
        setItemToSave,
        handleSaveItem,
        handleConfirmSave,
        handleDeleteCollection,
        handleDeleteSavedItem,
        handleExportNotebook,
        handleImportNotebook,
        updateItemNotes,
    } = useNotebook();
    
    // --- New State for Audio Playback ---
    const [playbackInfo, setPlaybackInfo] = useState<{
        playlist: Ayah[];
        currentIndex: number;
        isPlaying: boolean;
        trigger?: { 
            ayahsForPlaylist: Ayah[],
            audioEditionIdentifier: string,
            startIndex?: number,
        }
    } | null>(null);

    const [audioKhatmiyahProgress, setAudioKhatmiyahProgress] = useState<{ ayahNumber: number } | null>(() => {
        try {
            const stored = localStorage.getItem(KHATMIYAH_AUDIO_PROGRESS_KEY);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse audio khatmiyah progress", e);
        }
        return { ayahNumber: 1 }; // Default to starting at Al-Fatiha
    });
    
    const displayEdition = useMemo(() => {
        const foundEdition = activeEditions.find(e => e.identifier === selectedEdition) || availableEditions.find(e => e.identifier === selectedEdition) || DEFAULT_EDITIONS[1];
        
        // Smart filter to correct names from Firestore
        if (foundEdition.name.includes('القرآن الكريم')) {
            return {
                ...foundEdition,
                name: foundEdition.name.replace(/القرآن الكريم/g, 'المصحف الشريف')
            };
        }
        return foundEdition;
    }, [activeEditions, selectedEdition, availableEditions]);


    useEffect(() => {
        localStorage.setItem(QURAN_EDITION_KEY, selectedEdition);
    }, [selectedEdition]);
    
    useEffect(() => {
        localStorage.setItem(ACTIVE_EDITIONS_KEY, JSON.stringify(activeEditions));
    }, [activeEditions]);
    
    useEffect(() => {
        localStorage.setItem(FONT_KEY, selectedFontFamily);
    }, [selectedFontFamily]);

    useEffect(() => {
        localStorage.setItem(FONT_SIZE_KEY, fontSize);
    }, [fontSize]);
    
    const handleBrowsingModeChange = (mode: BrowsingMode) => {
        setBrowsingMode(mode);
        localStorage.setItem(BROWSING_MODE_KEY, mode);
    };

    useEffect(() => {
        localStorage.setItem(AUDIO_EDITION_KEY, selectedAudioEdition);
    }, [selectedAudioEdition]);

    const handleSaveAudioKhatmiyahProgress = useCallback((ayahNumber: number) => {
        const newProgress = { ayahNumber };
        setAudioKhatmiyahProgress(newProgress);
        localStorage.setItem(KHATMIYAH_AUDIO_PROGRESS_KEY, JSON.stringify(newProgress));
    }, []);

    // Effect to register service worker and handle updates
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            // Using a relative path is simpler and more robust. The browser resolves it
            // correctly against the current location, respecting the <base> tag.
            // This avoids potential issues with `new URL()` if `window.location.href` is unusual.
            navigator.serviceWorker.register('service-worker.js', { scope: './' }).then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        console.log('Service Worker: New version found, installing.');
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    console.log('Service Worker: New version installed and waiting.');
                                    setWaitingWorker(newWorker);
                                    setShowUpdateNotification(true);
                                }
                            }
                        });
                    }
                });
            }).catch(error => {
                console.error('Service Worker registration failed:', error);
            });
        }
    }, []);

    const handleUpdate = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                window.location.reload();
                refreshing = true;
            });
        }
    };


    const getEditionUrl = (edition: QuranEdition): string => {
        const { identifier, sourceApi } = edition;

        if (sourceApi === 'manual' || identifier.startsWith('http')) {
            return identifier;
        }
        if (sourceApi === 'fawazahmed0') {
            return `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/${identifier}.json`;
        }
        // Default to alquran.cloud
        return `https://api.alquran.cloud/v1/quran/${identifier}`;
    };

    const fetchCustomEditionData = useCallback(async (editionIdentifier: string) => {
        if (!editionIdentifier || (allQuranData && allQuranData[editionIdentifier])) return;
        
        setLoadingEditions(prev => [...prev, editionIdentifier]);
        setError(null);

        const editionDetails = availableEditions.find(e => e.identifier === editionIdentifier);
        const sourceApi = editionDetails?.sourceApi;
        const isManualUrl = editionIdentifier.startsWith('http');

        let fetchUrl: string;
        let apiType: 'alquran.cloud' | 'fawazahmed0' | 'manual' | undefined;

        if (isManualUrl) {
            fetchUrl = editionIdentifier;
            apiType = 'manual';
        } else if (sourceApi === 'fawazahmed0') {
            fetchUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/${editionIdentifier}.json`;
            apiType = 'fawazahmed0';
        } else {
            fetchUrl = `https://api.alquran.cloud/v1/quran/${editionIdentifier}`;
            apiType = 'alquran.cloud';
        }
        
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`فشل تحميل المصدر: ${response.statusText}`);
            const apiData = await response.json();
            let processedSurahs: SurahData[];

            if (apiType === 'fawazahmed0') {
                if (!apiData.quran || !Array.isArray(apiData.quran)) throw new Error('تنسيق بيانات غير صالح من مصدر fawazahmed0.');
                let absoluteAyahNumber = 1;
                processedSurahs = apiData.quran.map((surah: any) => ({
                    number: surah.chapter,
                    name: `سورة ${surah.chapter}`, // Placeholder name
                    englishName: `Surah ${surah.chapter}`,
                    englishNameTranslation: '', revelationType: '',
                    numberOfAyahs: surah.verses.length,
                    ayahs: surah.verses.map((ayah: any) => ({
                        number: absoluteAyahNumber++,
                        text: ayah.text,
                        numberInSurah: ayah.verse,
                    }))
                }));
            } else {
                if (apiData.code !== 200 || !apiData.data || !apiData.data.surahs) throw new Error('البيانات المستلمة من المصدر المخصص غير صالحة.');
                processedSurahs = apiData.data.surahs;
            }
            
            // --- Bismillah Data Cleaning Logic ---
            if (editionDetails && (editionDetails.type === 'quran' || editionDetails.type === 'tafsir')) {
                // Get the definitive Bismillah text from Al-Fatiha
                const fatiha = processedSurahs.find(s => s.number === 1);
                const definitiveBismillahText = fatiha?.ayahs[0]?.text || 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

                processedSurahs = processedSurahs.map(surah => {
                    if (surah.number === 1 || surah.number === 9) return surah;
                    if (!surah.ayahs || surah.ayahs.length === 0) return surah;

                    let ayahs = surah.ayahs;
                    
                    // Stage 1: Remove dedicated Bismillah objects (numberInSurah: 0)
                    if (ayahs[0].numberInSurah === 0) {
                        ayahs = ayahs.slice(1);
                    }
                    if (ayahs.length === 0) {
                        return { ...surah, ayahs: [], numberOfAyahs: 0 };
                    }
                    
                    // Stage 2: Clean prepended Bismillah text from the first actual ayah
                    const firstAyah = ayahs[0];
                    const normalizedAyahText = normalizeArabicText(firstAyah.text).replace(/\s/g, '');
                    const normalizedBismillah = normalizeArabicText(definitiveBismillahText).replace(/\s/g, '');

                    if (firstAyah.text && normalizedAyahText.startsWith(normalizedBismillah)) {
                        
                        const wordsInBismillah = definitiveBismillahText.split(' ').length;
                        const wordsInAyah = firstAyah.text.split(' ');
                        const cleanedText = wordsInAyah.slice(wordsInBismillah).join(' ').trim();
                        
                        // If ayah becomes empty, it was *only* the Bismillah. Remove it and re-index.
                        if (cleanedText === '') {
                             const cleanedAyahs = ayahs.slice(1).map((ayah, index) => ({
                                ...ayah,
                                numberInSurah: index + 1,
                            }));
                             return { ...surah, ayahs: cleanedAyahs, numberOfAyahs: cleanedAyahs.length };
                        } else {
                             // Otherwise, Bismillah was just prepended. Update the text.
                            const newAyahs = [...ayahs];
                            newAyahs[0] = { ...firstAyah, text: cleanedText };
                            return { ...surah, ayahs: newAyahs };
                        }
                    }

                    return { ...surah, ayahs };
                });
            }


            setAllQuranData(prevData => ({ ...prevData, [editionIdentifier]: processedSurahs, }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير معروف أثناء تحميل المصدر المخصص.';
            setError(errorMessage);
            alert(`خطأ: ${errorMessage}`);
        } finally {
            setLoadingEditions(prev => prev.filter(id => id !== editionIdentifier));
        }
    }, [allQuranData, availableEditions]);
    
    useEffect(() => {
        // Check for first-time visit to show edition prompt
        const promptSeen = localStorage.getItem(EDITION_PROMPT_SEEN_KEY);
        if (!promptSeen) {
            setShowEditionPrompt(true);
        }
        
        const initializeAppConfig = async () => {
            try {
                const fontsSnapshot = await db.collection('qran_fonts').get();
                if (!fontsSnapshot.empty) {
                    const fetchedFonts = fontsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
                    setAvailableFonts(fetchedFonts);
                }
            } catch (error: any) {
                console.warn("Could not fetch 'qran_fonts' from Firestore. Using default data.", error.message);
            }

            try {
                // Step 1: Fetch from API (non-critical, can fail)
                let apiEditions: QuranEdition[] = [];
                try {
                    const response = await fetch('https://api.alquran.cloud/v1/edition');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.code === 200 && Array.isArray(data.data)) {
                            apiEditions = data.data.map((e: any) => ({
                                identifier: e.identifier,
                                language: e.language,
                                name: e.name,
                                englishName: e.englishName,
                                format: e.format,
                                type: e.type,
                                direction: e.direction || (e.language === 'ar' ? 'rtl' : 'ltr'),
                                sourceApi: 'alquran.cloud'
                            }));
                        }
                    }
                } catch (error) {
                    console.warn("Could not fetch additional editions from alquran.cloud API.", error);
                }

                // Step 2: Fetch from Firestore (non-critical, can fail)
                let firestoreEditions: QuranEdition[] = [];
                try {
                    const editionsSnapshot = await db.collection('qran_editions').get();
                    if (!editionsSnapshot.empty) {
                        firestoreEditions = editionsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
                    }
                } catch (error: any) {
                     console.warn("Could not fetch 'qran_editions' from Firestore. Using default data.", error.message);
                }
                
                // Step 3: Merge all sources with priorities
                const editionMap = new Map<string, QuranEdition>();
                
                // Priority 3 (Lowest): API editions
                apiEditions.forEach(e => editionMap.set(e.identifier, e));

                // Priority 2: Firestore editions
                firestoreEditions.forEach(e => editionMap.set(e.identifier, e));
                
                // Priority 1 (Highest): Hardcoded default editions
                DEFAULT_EDITIONS.forEach(e => editionMap.set(e.identifier, e));

                setAvailableEditions(Array.from(editionMap.values()));

            } catch (error: any) {
                // This is a catch-all for the entire process. If anything unexpected happens,
                // we will still have the default editions from the initial state.
                console.error("A critical error occurred during edition initialization:", error);
            }
        };

        initializeAppConfig();
    }, []);

    useEffect(() => {
        availableFonts.forEach(font => {
            if (font.url) {
                if (!document.querySelector(`link[href="${font.url}"]`)) {
                    const link = document.createElement('link');
                    link.href = font.url;
                    link.rel = 'stylesheet';
                    document.head.appendChild(link);
                }
            }
        });
    }, [availableFonts]);
    
    const handleAddEdition = useCallback((identifier: string) => {
        if (activeEditions.some(e => e.identifier === identifier)) {
            alert("هذا المصدر مضاف بالفعل.");
            return;
        }

        const editionToAdd = availableEditions.find(e => e.identifier === identifier);
        
        let newEdition: QuranEdition;

        if (editionToAdd) {
            newEdition = editionToAdd;
        } else if (identifier.startsWith('http')) {
            let hostname: string;
            try {
                hostname = new URL(identifier).hostname;
            } catch (e) {
                alert("الرابط المدخل غير صالح. الرجاء التأكد من إدخال رابط URL كامل وصحيح (مثال: https://example.com/quran.json).");
                return; // Stop the process if the URL is invalid.
            }
            newEdition = {
                identifier: identifier, language: 'ar', name: `مصدر مخصص (${hostname})`,
                englishName: 'Custom Source', format: 'text', type: 'quran', direction: 'rtl', sourceApi: 'manual',
            };
        } else {
            alert("لم يتم العثور على المصدر المطلوب.");
            return;
        }

        setActiveEditions(prev => [...prev, newEdition]);
        fetchCustomEditionData(newEdition.identifier);
    }, [activeEditions, availableEditions, fetchCustomEditionData]);

    const handleDeleteEdition = useCallback((identifier: string) => {
        if (identifier === 'quran-simple-clean' || identifier === 'quran-uthmani') {
            alert("لا يمكن حذف المصادر الأساسية.");
            return;
        }
        setActiveEditions(prev => {
            const newEditions = prev.filter(e => e.identifier !== identifier);
            if (selectedEdition === identifier) {
                setSelectedEdition('quran-uthmani');
            }
            return newEditions;
        });
    }, [selectedEdition]);

    useEffect(() => {
        const fetchInitialTextData = async () => {
            setIsLoading(true);
            try {
                await Promise.all([
                    fetchCustomEditionData('quran-simple-clean'),
                    fetchCustomEditionData('quran-uthmani')
                ]);
            } catch (err) {
                console.error("Failed to fetch critical initial data:", err);
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setError(`Failed to load essential Quran data: ${errorMessage}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialTextData();
    }, [fetchCustomEditionData]); 

    useEffect(() => {
        if (!allQuranData || !allQuranData[selectedEdition]) {
            fetchCustomEditionData(selectedEdition);
        }
    }, [selectedEdition, allQuranData, fetchCustomEditionData]);

    const quranData = useMemo(() => {
        if (!allQuranData) return null;
        return allQuranData[selectedEdition];
    }, [allQuranData, selectedEdition]);

    const simpleSearchableAyahs = useMemo(() => {
        if (!allQuranData || !allQuranData['quran-simple-clean']) return [];
        const simpleData = allQuranData['quran-simple-clean'];
        return simpleData.flatMap(surah =>
            surah.ayahs.map(ayah => ({
                ...ayah,
                surah: {
                    number: surah.number, name: surah.name, englishName: surah.englishName,
                    englishNameTranslation: surah.englishNameTranslation, revelationType: surah.revelationType,
                }
            }))
        );
    }, [allQuranData]);

    const quranicWordList = useMemo(() => {
        if (!simpleSearchableAyahs) return new Set<string>();
        const words = new Set<string>();
        simpleSearchableAyahs.forEach(ayah => {
            normalizeArabicText(ayah.text).split(/\s+/).forEach(word => {
                if (word) words.add(word);
            });
        });
        return words;
    }, [simpleSearchableAyahs]);

    const handleHashChange = useCallback(() => {
        setCurrentPath(window.location.hash || '#/');
        setIsSidePanelOpen(false);
    }, []);
    
    useEffect(() => {
        window.addEventListener('hashchange', handleHashChange, false);
        return () => window.removeEventListener('hashchange', handleHashChange, false);
    }, [handleHashChange]);
    
    useEffect(() => {
        const checkScrollTop = () => setShowScroll(window.pageYOffset > 400);
        window.addEventListener('scroll', checkScrollTop);
        return () => window.removeEventListener('scroll', checkScrollTop);
    }, []);

    const surahNameMap = useMemo(() => {
        if (!allQuranData || !allQuranData['quran-simple-clean']) return null;
        
        const map = new Map<string, number>();
        const surahList = allQuranData['quran-simple-clean'];

        surahList.forEach(surah => {
            map.set(normalizeArabicText(surah.name.replace(/^سُورَةُ\s*/, '')), surah.number);
            map.set(normalizeArabicText(surah.name.replace(/^سُورَةُ\s*ال/, '')), surah.number);
        });
        return map;
    }, [allQuranData]);

    const tryParseAyahReference = useCallback((query: string): { surah: number; ayah: number } | null => {
        if (!surahNameMap) return null;
    
        const cleanedQuery = query.trim()
            .replace(/[أإآ]/g, 'ا')
            .replace(/[آا]ية/g, '')
            .replace(/سورة/g, '');
    
        // Regex for name then number, allows for space or colon as separator.
        const nameRegex = /^\s*([^\d\s:]+(?:\s+[^\d\s:]+)*)\s*[:\s]\s*(\d+)\s*$/;
        const nameMatch = cleanedQuery.match(nameRegex);
        if (nameMatch) {
            const surahName = normalizeArabicText(nameMatch[1].trim());
            const ayahNumber = parseInt(nameMatch[2], 10);
            if (surahNameMap.has(surahName)) {
                return { surah: surahNameMap.get(surahName)!, ayah: ayahNumber };
            }
        }
        
        // Regex for number then number (e.g., "2:255" or "2 255").
        const numberRegex = /^\s*(\d+)\s*[:\s]\s*(\d+)\s*$/;
        const numberMatch = cleanedQuery.match(numberRegex);
        if (numberMatch) {
            const surahNumber = parseInt(numberMatch[1], 10);
            const ayahNumber = parseInt(numberMatch[2], 10);
            if (surahNumber > 0 && surahNumber <= 114 && ayahNumber > 0) {
                 return { surah: surahNumber, ayah: ayahNumber };
            }
        }
        
        return null;
    }, [surahNameMap]);

    const handleSearch = (query: string, sourceEdition?: string, position?: { surah: number; ayah: number; wordIndex: number; }) => {
        const ayahRef = tryParseAyahReference(query);
        if (ayahRef && !position) { // Make sure it's not a word click from SurahDetailView
            window.location.hash = `#/surah/${ayahRef.surah}?ayah=${ayahRef.ayah}`;
            return;
        }

        setIsSearching(true);
        
        // The query received from SurahDetailView will now be the correct, simple word.
        // The complex mapping logic is no longer needed here.
        const finalQuery = query;
        const finalSearchEdition = sourceEdition || 'quran-simple-clean';

        let url = `#/search/${encodeURIComponent(finalQuery)}?search_edition=${finalSearchEdition}`;
        
        if (position) {
            url += `&s=${position.surah}&a=${position.ayah}&w=${position.wordIndex}`;
        }
        
        window.location.hash = url;
    };


    const handleSearchByAyahNumber = (ayahNumber: number) => {
        setIsSearching(true);
        window.location.hash = `#/search/number/${ayahNumber}`;
    };

    const performSearch = useCallback((query: string): { results: Ayah[], finalSearchEdition: string, correctedQuery?: string } => {
        if (!allQuranData) return { results: [], finalSearchEdition: 'quran-simple-clean' };
    
        const executeSearch = (searchQuery: string) => {
            const trimmedQuery = searchQuery.trim();
            const isExactPhrase = trimmedQuery.startsWith('"') && trimmedQuery.endsWith('"');
            const queryContent = isExactPhrase ? trimmedQuery.substring(1, trimmedQuery.length - 1) : trimmedQuery;
    
            if (!queryContent) {
                return { results: [], finalSearchEdition: 'quran-simple-clean' };
            }
    
            const searchWords = queryContent.split(/\s+/).filter(Boolean).map(normalizeArabicText);
            const hasDiacritics = /[\u064B-\u065F]/.test(queryContent);
    
            const doSearch = (editionId: string): number[] => {
                const dataSource = allQuranData[editionId];
                if (!dataSource) return [];
                
                const matchingAyahNumbers: number[] = [];
                dataSource.forEach(surah => {
                    surah.ayahs.forEach(ayah => {
                        const ayahText = normalizeArabicText(ayah.text);
                        if (isExactPhrase) {
                            if (ayahText.includes(searchWords.join(' '))) {
                                matchingAyahNumbers.push(ayah.number);
                            }
                        } else {
                            if (searchWords.every(word => ayahText.includes(word))) {
                                matchingAyahNumbers.push(ayah.number);
                            }
                        }
                    });
                });
                return matchingAyahNumbers;
            };
    
            let matchingIdentifiers: number[] = [];
            let finalSearchEdition = 'quran-simple-clean';
            
            // Prefer Uthmani search if diacritics are present, otherwise simple-clean is better
            if (hasDiacritics && allQuranData['quran-uthmani']) {
                matchingIdentifiers = doSearch('quran-uthmani');
                if (matchingIdentifiers.length > 0) {
                    finalSearchEdition = 'quran-uthmani';
                } else {
                    matchingIdentifiers = doSearch('quran-simple-clean');
                }
            } else {
                matchingIdentifiers = doSearch('quran-simple-clean');
            }
    
            const matchingSet = new Set(matchingIdentifiers);
            const results = simpleSearchableAyahs.filter(ayah => matchingSet.has(ayah.number));
            return { results, finalSearchEdition };
        };
    
        const initialResult = executeSearch(query);
    
        // Spell correction for single words only if the main search yields no results.
        if (initialResult.results.length === 0 && !query.includes(' ') && !query.startsWith('"') && quranicWordList.size > 0) {
            let minDistance = 3;
            let bestMatch = '';
            const normalizedQuery = normalizeArabicText(query);
            for (const dictWord of quranicWordList) {
                const distance = levenshtein(normalizedQuery, dictWord);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = dictWord;
                }
                if (minDistance === 1) break;
            }
            if (bestMatch) {
                const correctedResult = executeSearch(bestMatch);
                if (correctedResult.results.length > 0) {
                    return { ...correctedResult, correctedQuery: bestMatch };
                }
            }
        }
    
        return initialResult;
    }, [allQuranData, simpleSearchableAyahs, quranicWordList]);

    const performSearchByAyahNumber = useCallback((ayahNumber: number): Ayah[] => {
        if (!simpleSearchableAyahs) return [];
        return simpleSearchableAyahs.filter(ayah => ayah.numberInSurah === ayahNumber);
    }, [simpleSearchableAyahs]);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const handleAdminAccess = useCallback(() => {
        if (adminClickTimeout.current) clearTimeout(adminClickTimeout.current);
        
        const newCount = adminClickCount + 1;
        setAdminClickCount(newCount);

        if (newCount >= 12) {
            window.location.hash = '#/admin';
            setAdminClickCount(0);
        } else {
            window.location.hash = '#/'; 
            adminClickTimeout.current = window.setTimeout(() => setAdminClickCount(0), 2000);
        }
    }, [adminClickCount]);

    // --- Audio Playback Logic ---
    const handleStartPlayback = useCallback((ayahsForPlaylist: Ayah[], audioEditionIdentifier: string, startIndex: number = 0) => {
        const audioEditionDetails = ALL_AUDIO_EDITIONS.find(e => e.identifier === audioEditionIdentifier);
        if (!audioEditionDetails) {
            const fallbackEdition = ALL_AUDIO_EDITIONS.find(e => e.identifier === 'ar.alafasy');
            if (fallbackEdition) {
                setSelectedAudioEdition('ar.alafasy');
                handleStartPlayback(ayahsForPlaylist, 'ar.alafasy', startIndex);
            } else {
                 alert("لم يتم العثور على المصدر الصوتي المختار.");
            }
            return;
        }

        const getPlaylistData = () => {
            if (ayahsForPlaylist.length > 0) { // From Search
                return ayahsForPlaylist.slice(startIndex);
            } else { // From Surah view
                const [path] = currentPath.substring(1).split('?');
                const pathParts = path.split('/').filter(Boolean);
                const uthmaniData = allQuranData?.['quran-uthmani'];

                if (pathParts[0] !== 'surah' || !pathParts[1] || !uthmaniData) {
                    return [];
                };
                const surahNumber = parseInt(pathParts[1], 10);
                const surahData = uthmaniData.find(s => s.number === surahNumber);
                
                if (surahData) {
                    const surahAyahs = surahData.ayahs.map(ayah => ({
                        ...ayah,
                        surah: {
                            number: surahData.number,
                            name: surahData.name,
                            englishName: surahData.englishName,
                            englishNameTranslation: surahData.englishNameTranslation,
                            revelationType: surahData.revelationType,
                            numberOfAyahs: surahData.numberOfAyahs,
                        }
                    }));
                    return surahAyahs.slice(startIndex);
                }
                return [];
            }
        };

        const generatePlaylist = (basePlaylist: Ayah[]) => {
            if (basePlaylist.length === 0) {
                alert("لا يمكن إنشاء قائمة التشغيل.");
                return null;
            }

            let finalPlaylist = basePlaylist.map(ayah => {
                let audioUrl = getAudioUrl(ayah, audioEditionDetails);
                if (audioEditionDetails.sourceApi === 'alquran.cloud') {
                    const audioData = allQuranData?.[audioEditionIdentifier];
                    const audioSurah = audioData?.find(s => s.number === ayah.surah?.number);
                    const audioAyah = audioSurah?.ayahs.find(a => a.numberInSurah === ayah.numberInSurah);
                    audioUrl = audioAyah?.audio;
                }
                return { ...ayah, audio: audioUrl };
            }).filter((item): item is Ayah & { audio: string } => !!item.audio);

            const firstAyahOfPlaylist = basePlaylist[0];
            const surahForPlaylist = firstAyahOfPlaylist.surah;
            const needsBismillah = startIndex === 0 && surahForPlaylist && surahForPlaylist.number !== 1 && surahForPlaylist.number !== 9;

            if (needsBismillah) {
                const bismillahAudioUrl = getBismillahAudioUrl(audioEditionDetails);
                if (bismillahAudioUrl) {
                    const bismillahAyah: Ayah & { audio: string } = { 
                        number: 0, 
                        numberInSurah: 0, 
                        text: 'البسملة', 
                        audio: bismillahAudioUrl, 
                        surah: surahForPlaylist 
                    };
                    finalPlaylist.unshift(bismillahAyah);
                }
            }
            return finalPlaylist;
        };

        if (audioEditionDetails.sourceApi !== 'alquran.cloud' || allQuranData?.[audioEditionIdentifier]) {
            const playlistBase = getPlaylistData();
            const finalPlaylist = generatePlaylist(playlistBase);
            if (finalPlaylist && finalPlaylist.length > 0) {
                setPlaybackInfo({ playlist: finalPlaylist, currentIndex: 0, isPlaying: true });
            } else {
                alert("لم يتم العثور على بيانات صوتية.");
                setPlaybackInfo(null);
            }
        } else {
             fetchCustomEditionData(audioEditionIdentifier);
             setPlaybackInfo({ 
                playlist: [], 
                currentIndex: 0, 
                isPlaying: false, 
                trigger: { ayahsForPlaylist, audioEditionIdentifier, startIndex }
            });
        }
    }, [allQuranData, fetchCustomEditionData, currentPath]);
    
    useEffect(() => {
        if (playbackInfo?.trigger && allQuranData?.[playbackInfo.trigger.audioEditionIdentifier]) {
            handleStartPlayback(
                playbackInfo.trigger.ayahsForPlaylist,
                playbackInfo.trigger.audioEditionIdentifier,
                playbackInfo.trigger.startIndex
            );
        }
    }, [playbackInfo, allQuranData, handleStartPlayback]);

    const handlePlayPause = () => setPlaybackInfo(p => p ? { ...p, isPlaying: !p.isPlaying } : null);
    const handleClosePlayback = () => setPlaybackInfo(null);

    const handleNext = useCallback(() => {
        setPlaybackInfo(p => {
            if (!p) return null;
            const nextIndex = p.currentIndex + 1;
            if (nextIndex >= p.playlist.length) {
                return null; // End of playlist
            }
            return { ...p, currentIndex: nextIndex };
        });
    }, []);

    const handlePrev = () => {
        setPlaybackInfo(p => {
            if (!p) return null;
            const prevIndex = p.currentIndex - 1;
            if (prevIndex < 0) return p;
            return { ...p, currentIndex: prevIndex };
        });
    };
    
    const handleEditionChoice = (editionIdentifier: string, dontShowAgain: boolean) => {
        setSelectedEdition(editionIdentifier);
        // Set the default browsing mode based on the user's initial choice.
        if (editionIdentifier === 'quran-uthmani') {
            handleBrowsingModeChange('page');
        } else {
            handleBrowsingModeChange('full');
        }
        if (dontShowAgain) {
            localStorage.setItem(EDITION_PROMPT_SEEN_KEY, 'true');
        }
        setShowEditionPrompt(false);
    };
    
    const currentlyPlayingAyahGlobalNumber = playbackInfo?.playlist[playbackInfo.currentIndex]?.number;

    const Header: React.FC<{ onSearch: (query: string) => void }> = ({ onSearch }) => {
        const getTitle = () => {
            const [path, params] = currentPath.substring(1).split('?');
            const pathParts = path.split('/').filter(Boolean);
    
            if (pathParts[0] === 'surah' && pathParts[1] && quranData) {
                const surah = quranData.find(s => s.number === parseInt(pathParts[1], 10));
                return surah ? `سورة ${formatSurahNameForDisplay(surah.name)}` : "المصحف الشريف";
            }
            if (pathParts[0] === 'search') return "نتائج البحث";
            if (pathParts[0] === 'settings') return "الإعدادات";
            if (pathParts[0] === 'saved') {
                 const collectionId = pathParts[1] || null;
                 if (collectionId && collections[collectionId]) {
                     return collections[collectionId].name;
                 }
                 return "دفتر التدبر";
            }
            if (pathParts[0] === 'comments') return "ترند النقاشات";
            if (pathParts[0] === 'khatmiyah') return "الختمية الجماعية";
            if (pathParts[0] === 'audio-khatmiyah') return "الختمة الصوتية";
            if (pathParts[0] === 'admin') return "لوحة التحكم";
            
            return null; // For home page
        };
    
        const title = getTitle();
    
        return (
            <header className="sticky top-0 bg-surface/80 backdrop-blur-sm z-20 py-3 mb-6 transition-colors duration-300 border-b border-border-default">
                <div className="flex items-center justify-between mx-auto max-w-7xl px-4 gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSidePanelOpen(true)}
                            className="p-3 bg-surface-subtle text-text-secondary rounded-full hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 flex-shrink-0"
                            aria-label="فتح القائمة"
                        >
                            <MenuIcon className="w-6 h-6" />
                        </button>
                        <ThemeToggleButton />
                    </div>
                    
                    <div className="flex-grow flex justify-center min-w-0">
                        {title === null ? (
                            <SearchForm onSearch={handleSearch} />
                        ) : (
                           <a 
                                href="#/" 
                                onClick={(e) => { e.preventDefault(); window.location.hash = '#/'; }}
                                className="text-xl md:text-2xl font-bold text-text-primary font-quran truncate hover:text-primary transition-colors cursor-pointer" 
                                title={`العودة للرئيسية: ${title}`}
                            >
                                {title}
                            </a>
                        )}
                    </div>
                    
                    <a href="#/" onClick={(e) => { e.preventDefault(); handleAdminAccess(); }} className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors flex-shrink-0">
                        <span className="text-3xl text-primary hidden sm:block" aria-hidden="true">۞</span>
                        <h1 className="text-xl md:text-2xl font-bold text-text-primary hidden sm:block" style={{ fontFamily: "'Tajawal', sans-serif" }}>QRAN.TOP</h1>
                    </a>
                </div>
            </header>
        );
    };
    
    // --- Data derivation for HomeView ---
    const juzList = useMemo(() => {
        if (!simpleSearchableAyahs || simpleSearchableAyahs.length === 0) return [];
        const juzMap = new Map<number, Ayah>();
        for (const ayah of simpleSearchableAyahs) {
            if (ayah.juz && !juzMap.has(ayah.juz)) {
                juzMap.set(ayah.juz, ayah);
            }
        }
        return Array.from(juzMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([juz, ayah]) => ({
                number: juz,
                startAyah: ayah.numberInSurah,
                startSurah: ayah.surah!.number,
                startSurahName: ayah.surah!.name,
            }));
    }, [simpleSearchableAyahs]);

    const hizbList = useMemo(() => {
        if (!simpleSearchableAyahs || simpleSearchableAyahs.length === 0) return [];
        const quarterMap = new Map<number, Ayah>();
        for (const ayah of simpleSearchableAyahs) {
            if (ayah.hizbQuarter && !quarterMap.has(ayah.hizbQuarter)) {
                quarterMap.set(ayah.hizbQuarter, ayah);
            }
        }

        const hizbs: { number: number; startAyah: number; startSurah: number; startSurahName: string }[] = [];
        for (let i = 1; i <= 60; i++) {
            const startQuarter = (i - 1) * 4 + 1;
            const startAyahData = quarterMap.get(startQuarter);
            if (startAyahData) {
                hizbs.push({
                    number: i,
                    startAyah: startAyahData.numberInSurah,
                    startSurah: startAyahData.surah!.number,
                    startSurahName: startAyahData.surah!.name,
                });
            }
        }
        return hizbs;
    }, [simpleSearchableAyahs]);

    const hizbQuarterStartMap = useMemo(() => {
        if (!simpleSearchableAyahs || simpleSearchableAyahs.length === 0) return new Map<number, number>();
        const quarterMap = new Map<number, number>();
        for (const ayah of simpleSearchableAyahs) {
            if (ayah.hizbQuarter && !quarterMap.has(ayah.hizbQuarter)) {
                quarterMap.set(ayah.hizbQuarter, ayah.number);
            }
        }
        return quarterMap;
    }, [simpleSearchableAyahs]);

    const renderContent = () => {
        if (isLoading && !quranData) return null; // Let the static loader handle it
        if (error && !quranData) return <div className="text-center p-10 text-lg text-red-500">{error}</div>;
        if (!allQuranData) return null; // Let the static loader handle it

        const [path, params] = currentPath.substring(1).split('?');
        const pathParts = path.split('/').filter(Boolean);
        const queryParams = new URLSearchParams(params);

        if (pathParts[0] === 'admin') {
            return <AdminView />;
        }

        if (pathParts[0] === 'khatmiyah') {
            const khatmiyahId = pathParts[1] || null;
            return <KhatmiyahView khatmiyahId={khatmiyahId} />;
        }

        if (pathParts[0] === 'audio-khatmiyah') {
            return <AudioKhatmiyahView
                allAyahs={simpleSearchableAyahs}
                allAudioEditions={ALL_AUDIO_EDITIONS}
                initialAyahNumber={audioKhatmiyahProgress?.ayahNumber || 1}
                onSaveProgress={handleSaveAudioKhatmiyahProgress}
                selectedAudioEdition={selectedAudioEdition}
                onAudioEditionChange={setSelectedAudioEdition}
                allQuranData={allQuranData}
                fetchCustomEditionData={fetchCustomEditionData}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                availableFonts={availableFonts}
                selectedFont={selectedFontFamily}
                onFontChange={setSelectedFontFamily}
                activeEditions={activeEditions}
                selectedEdition={selectedEdition}
                onEditionChange={setSelectedEdition}
            />;
        }
        
        if (pathParts[0] === 'saved') {
            const collectionId = pathParts[1] || null;
            return <SavedView 
                collections={collections}
                collectionId={collectionId}
                onDeleteCollection={handleDeleteCollection}
                onDeleteSavedItem={handleDeleteSavedItem}
                onUpdateNotes={updateItemNotes}
            />;
        }

        if (pathParts[0] === 'settings') {
            return <SettingsView 
                allAvailableFonts={availableFonts}
                selectedFont={selectedFontFamily}
                onFontChange={setSelectedFontFamily}
                activeEditions={activeEditions}
                availableEditions={availableEditions}
                onAddEdition={handleAddEdition}
                onDeleteEdition={handleDeleteEdition}
                allQuranData={allQuranData}
                loadingEditions={loadingEditions}
                onExportNotebook={handleExportNotebook}
                onImportNotebook={handleImportNotebook}
                getEditionUrl={getEditionUrl}
            />;
        }

        if (pathParts[0] === 'surah' && pathParts[1]) {
            const surahNumber = parseInt(pathParts[1], 10);
            const highlightAyahNumber = queryParams.get('ayah') ? parseInt(queryParams.get('ayah')!, 10) : null;
            if (!quranData) return <LoadingScreen />;
            const surah = quranData.find(s => s.number === surahNumber);
            const simpleCleanDataForView = allQuranData['quran-simple-clean'] || [];
            if (surah) {
                return <SurahDetailView 
                    surah={surah}
                    highlightAyahNumber={highlightAyahNumber}
                    onWordClick={handleSearch}
                    displayEdition={displayEdition}
                    selectedFont={selectedFontFamily}
                    fontSize={fontSize}
                    browsingMode={browsingMode}
                    onSaveAyah={handleSaveItem}
                    onSearchByAyahNumber={handleSearchByAyahNumber}
                    currentlyPlayingAyahGlobalNumber={currentlyPlayingAyahGlobalNumber}
                    isPlaybackLoading={!!playbackInfo?.trigger}
                    onStartPlayback={handleStartPlayback}
                    allAudioEditions={ALL_AUDIO_EDITIONS}
                    selectedAudioEdition={selectedAudioEdition}
                    onAudioEditionChange={setSelectedAudioEdition}
                    simpleCleanData={simpleCleanDataForView}
                    hizbQuarterStartMap={hizbQuarterStartMap}
                />;
            }
        }
        
        if (pathParts[0] === 'search') {
            if (pathParts[1] === 'number' && pathParts[2]) {
                const ayahNumber = parseInt(pathParts[2], 10);
                const results = performSearchByAyahNumber(ayahNumber);
                return <SearchView
                    query={pathParts[2]}
                    results={results}
                    onNewSearch={handleSearch}
                    onSearchComplete={() => setIsSearching(false)}
                    displayEdition={displayEdition}
                    displayEditionData={quranData || []}
                    searchEdition={'quran-simple-clean'}
                    selectedFont={selectedFontFamily}
                    fontSize={fontSize}
                    simpleCleanData={allQuranData['quran-simple-clean'] || []}
                    onSaveAyah={handleSaveItem}
                    onSaveSearch={handleSaveItem}
                    searchType="number"
                    currentlyPlayingAyahGlobalNumber={currentlyPlayingAyahGlobalNumber}
                    isPlaybackLoading={!!playbackInfo?.trigger}
                    onStartPlayback={handleStartPlayback}
                    allAudioEditions={ALL_AUDIO_EDITIONS}
                    selectedAudioEdition={selectedAudioEdition}
                    onAudioEditionChange={setSelectedAudioEdition}
                />;
            } else if (pathParts[1]) {
                const query = decodeURIComponent(pathParts[1]);
                const searchResult = performSearch(query);

                const positionParam = {
                    s: queryParams.get('s'),
                    a: queryParams.get('a'),
                    w: queryParams.get('w'),
                }
                const position = (positionParam.s && positionParam.a && positionParam.w)
                    ? { surah: parseInt(positionParam.s), ayah: parseInt(positionParam.a), wordIndex: parseInt(positionParam.w) }
                    : undefined;
                
                return <SearchView
                    query={query}
                    results={searchResult.results}
                    correctedQuery={searchResult.correctedQuery}
                    onNewSearch={handleSearch}
                    onSearchComplete={() => setIsSearching(false)}
                    autoOpenDiscussion={!!queryParams.get('from')}
                    displayEdition={displayEdition}
                    displayEditionData={quranData || []}
                    searchEdition={searchResult.finalSearchEdition}
                    selectedFont={selectedFontFamily}
                    fontSize={fontSize}
                    position={position}
                    simpleCleanData={allQuranData['quran-simple-clean'] || []}
                    onSaveAyah={handleSaveItem}
                    onSaveSearch={handleSaveItem}
                    currentlyPlayingAyahGlobalNumber={currentlyPlayingAyahGlobalNumber}
                    isPlaybackLoading={!!playbackInfo?.trigger}
                    onStartPlayback={handleStartPlayback}
                    allAudioEditions={ALL_AUDIO_EDITIONS}
                    selectedAudioEdition={selectedAudioEdition}
                    onAudioEditionChange={setSelectedAudioEdition}
                />;
            } else { // Handle empty search page, e.g., #/search/
                return <SearchView
                    query=""
                    results={[]}
                    onNewSearch={handleSearch}
                    onSearchComplete={() => setIsSearching(false)}
                    displayEdition={displayEdition}
                    displayEditionData={quranData || []}
                    searchEdition={'quran-simple-clean'}
                    selectedFont={selectedFontFamily}
                    fontSize={fontSize}
                    simpleCleanData={allQuranData['quran-simple-clean'] || []}
                    onSaveAyah={handleSaveItem}
                    onSaveSearch={handleSaveItem}
                    currentlyPlayingAyahGlobalNumber={currentlyPlayingAyahGlobalNumber}
                    isPlaybackLoading={!!playbackInfo?.trigger}
                    onStartPlayback={handleStartPlayback}
                    allAudioEditions={ALL_AUDIO_EDITIONS}
                    selectedAudioEdition={selectedAudioEdition}
                    onAudioEditionChange={setSelectedAudioEdition}
                />;
            }
        }

        if (pathParts[0] === 'comments') {
            return <CommentsCloudView />;
        }

        // --- Home Page (Surah Index) ---
        if (!quranData) return <LoadingScreen />;

        const surahList = quranData.map(({ number, name, englishName, englishNameTranslation, revelationType, numberOfAyahs }) => ({
            number, name, englishName, englishNameTranslation, revelationType, numberOfAyahs
        }));
        
        return <HomeView surahList={surahList} juzList={juzList} hizbList={hizbList} />;
    };
    
    const isAudioKhatmiyahPage = currentPath.startsWith('#/audio-khatmiyah');
    const isPageWithToolbox = useMemo(() => (currentPath.startsWith('#/surah/') || currentPath.startsWith('#/search/')) && !isAudioKhatmiyahPage, [currentPath, isAudioKhatmiyahPage]);

    const selectedAudioEditionDetails = useMemo(() => ALL_AUDIO_EDITIONS.find(e => e.identifier === selectedAudioEdition), [selectedAudioEdition]);
    
    // Hide static loader when React is ready
    useEffect(() => {
        if (!isLoading) {
            const loader = document.querySelector('.static-loader');
            if (loader) {
                (loader as HTMLElement).style.opacity = '0';
                setTimeout(() => {
                    loader.remove();
                }, 500); // Wait for fade-out transition
            }
        }
    }, [isLoading]);

    return (
        <AuthProvider>
            <div className="bg-background text-text-primary min-h-screen transition-colors duration-300">
                <TopProgressBar isSearching={isSearching || loadingEditions.length > 0} />
                <SidePanel 
                    isOpen={isSidePanelOpen}
                    onClose={() => setIsSidePanelOpen(false)}
                    currentPath={currentPath}
                    onNavigate={(path) => {
                        const currentHash = window.location.hash;
                        // If we're navigating to the page we're already on, just close the panel.
                        // This handles the case where the user is on the homepage (hash="" or hash="#/") and clicks the home button.
                        const isAlreadyOnPage = (currentHash === path) || (currentHash === '' && path === '#/');
                        if (isAlreadyOnPage) {
                            setIsSidePanelOpen(false);
                        } else {
                            // For any other navigation, changing the hash will trigger handleHashChange, which closes the panel.
                            window.location.hash = path;
                        }
                    }}
                />
                {!isAudioKhatmiyahPage && <Header onSearch={handleSearch} />}
                <main className="pb-32">
                    {renderContent()}
                </main>
                {isPageWithToolbox && <Toolbox
                    fontSize={fontSize}
                    onFontSizeChange={setFontSize}
                    availableFonts={availableFonts}
                    selectedFont={selectedFontFamily}
                    onFontChange={setSelectedFontFamily}
                    activeEditions={activeEditions}
                    selectedEdition={selectedEdition}
                    onEditionChange={setSelectedEdition}
                    isAudioPlayerVisible={!!playbackInfo}
                    browsingMode={browsingMode}
                    onBrowsingModeChange={handleBrowsingModeChange}
                />}
                {itemToSave && (
                    <SaveItemModal 
                        item={itemToSave}
                        collections={collections}
                        onClose={() => setItemToSave(null)}
                        onSave={handleConfirmSave}
                    />
                )}
                {playbackInfo && !isAudioKhatmiyahPage && (
                    <AudioPlayerBar 
                        playlist={playbackInfo.playlist}
                        currentIndex={playbackInfo.currentIndex}
                        isPlaying={playbackInfo.isPlaying}
                        isLoading={!!playbackInfo.trigger}
                        onPlayPause={handlePlayPause}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onEnded={handleNext} // Auto-play next
                        onClose={handleClosePlayback}
                        audioEdition={selectedAudioEditionDetails}
                    />
                )}
                {showScroll && !isAudioKhatmiyahPage && (
                    <button
                        onClick={scrollToTop}
                        className={`fixed left-8 p-4 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 ${
                            !!playbackInfo ? 'bottom-44 sm:bottom-28' : 'bottom-24 sm:bottom-8'
                        }`}
                        aria-label="الانتقال إلى الأعلى"
                    >
                        <ArrowUpIcon className="w-6 h-6" />
                    </button>
                )}
                {showEditionPrompt && <EditionChoiceModal onSelect={handleEditionChoice} />}
                {showUpdateNotification && <UpdateNotification onUpdate={handleUpdate} />}
            </div>
        </AuthProvider>
    );
};

export default App;