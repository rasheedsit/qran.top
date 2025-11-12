import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Ayah, QuranEdition, SurahData, FontSize, QuranFont } from '../types.ts';
import { useTheme } from '../hooks/useTheme.ts';
import { 
    SpinnerIcon, PlayIcon, PauseIcon, ForwardIcon, BackwardIcon, 
    HomeIcon,
    CogIcon, ClearIcon, CheckIcon, BookOpenIcon, TextSizeIcon, QueueListIcon,
    ComputerDesktopIcon, JuzOneIcon
} from './icons.tsx';
import AudioEditionSelector from './AudioEditionSelector.tsx';

// --- Types ---
type PlaybackMode = 'continuous' | 'single' | 'selection';

interface AudioKhatmiyahViewProps {
    allAyahs: Ayah[];
    allAudioEditions: QuranEdition[];
    initialAyahNumber: number;
    onSaveProgress: (ayahNumber: number) => void;
    selectedAudioEdition: string;
    onAudioEditionChange: (id: string) => void;
    allQuranData: { [key: string]: SurahData[] } | null;
    fetchCustomEditionData: (id: string) => void;
    fontSize: FontSize;
    onFontSizeChange: (size: FontSize) => void;
    availableFonts: QuranFont[];
    selectedFont: string;
    onFontChange: (fontFamily: string) => void;
    activeEditions: QuranEdition[];
    selectedEdition: string;
    onEditionChange: (id: string) => void;
}

// --- Helper: Get Audio URL ---
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

// --- Juz Selection Modal ---
interface JuzSelectionModalProps {
    onClose: () => void;
    juzStartAyahs: { juz: number, ayahNumber: number }[];
    onJuzSelect: (ayahNumber: number) => void;
    onSelectionConfirm: (selectedJuzs: number[]) => void;
    mode: 'jump' | 'selection';
}

const JuzSelectionModal: React.FC<JuzSelectionModalProps> = ({ onClose, juzStartAyahs, onJuzSelect, onSelectionConfirm, mode }) => {
    const [selectedJuzs, setSelectedJuzs] = useState<number[]>([]);

    const handleJuzClick = (juz: number, ayahNumber: number) => {
        if (mode === 'jump') {
            onJuzSelect(ayahNumber);
            onClose();
        } else { // selection mode
            setSelectedJuzs(prev => 
                prev.includes(juz) ? prev.filter(j => j !== juz) : [...prev, juz]
            );
        }
    };
    
    const handleConfirm = () => {
        if (selectedJuzs.length > 0) {
            onSelectionConfirm(selectedJuzs.sort((a,b) => a-b));
            onClose();
        }
    };

    const title = mode === 'jump' ? "الانتقال إلى جزء" : "اختر الأجزاء";
    
    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4"
            onClick={onClose}
        >
            <div 
                className="bg-surface rounded-lg shadow-xl w-full max-w-lg mx-auto flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-border-default flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-primary">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-hover">
                        <ClearIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">
                    <div className="grid grid-cols-6 gap-2">
                        {juzStartAyahs.map(({ juz, ayahNumber }) => {
                            const isSelected = mode === 'selection' && selectedJuzs.includes(juz);
                            return (
                                <button
                                    key={juz}
                                    onClick={() => handleJuzClick(juz, ayahNumber)}
                                    className={`p-3 rounded-lg text-center font-mono font-bold text-lg text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary
                                        bg-surface-subtle hover:bg-surface-hover
                                        ${isSelected ? 'ring-2 ring-primary bg-surface-active' : ''}
                                    `}
                                >
                                    {juz}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {mode === 'selection' && (
                    <div className="p-4 border-t border-border-default">
                        <button 
                            onClick={handleConfirm}
                            disabled={selectedJuzs.length === 0}
                            className="w-full px-4 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover disabled:bg-primary/50 transition-colors"
                        >
                            بدء القراءة ({selectedJuzs.length})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Playback Mode Modal ---
interface PlaybackModeModalProps {
    onClose: () => void;
    onModeSelect: (mode: PlaybackMode) => void;
    onCustomSelectionStart: () => void;
}

const PlaybackModeModal: React.FC<PlaybackModeModalProps> = ({ onClose, onModeSelect, onCustomSelectionStart }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-md mx-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-border-default flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-primary">تحديد نطاق القراءة</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-hover"><ClearIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-4 space-y-3">
                    <button onClick={() => { onModeSelect('continuous'); onClose(); }} className="w-full text-right p-4 flex items-center gap-4 bg-surface-subtle rounded-lg hover:bg-surface-hover transition-colors">
                        <BookOpenIcon className="w-8 h-8 text-primary flex-shrink-0"/>
                        <div>
                            <h3 className="font-bold text-lg">ختمة كاملة</h3>
                            <p className="text-sm text-text-muted">الاستمرار في القراءة من مكان وقوفك في المصحف كاملاً.</p>
                        </div>
                    </button>
                    <button onClick={() => { onModeSelect('single'); onClose(); }} className="w-full text-right p-4 flex items-center gap-4 bg-surface-subtle rounded-lg hover:bg-surface-hover transition-colors">
                        <JuzOneIcon className="w-8 h-8 text-primary flex-shrink-0"/>
                        <div>
                            <h3 className="font-bold text-lg">جزء واحد فقط</h3>
                            <p className="text-sm text-text-muted">قراءة الجزء الحالي فقط ثم التوقف تلقائياً.</p>
                        </div>
                    </button>
                    <button onClick={onCustomSelectionStart} className="w-full text-right p-4 flex items-center gap-4 bg-surface-subtle rounded-lg hover:bg-surface-hover transition-colors">
                        <QueueListIcon className="w-8 h-8 text-primary flex-shrink-0"/>
                        <div>
                            <h3 className="font-bold text-lg">تحديد أجزاء</h3>
                            <p className="text-sm text-text-muted">اختر أجزاء متتالية أو متفرقة للقراءة.</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---
const AudioKhatmiyahView: React.FC<AudioKhatmiyahViewProps> = ({
    allAyahs, allAudioEditions, initialAyahNumber, onSaveProgress,
    selectedAudioEdition, onAudioEditionChange, allQuranData, fetchCustomEditionData,
    fontSize, onFontSizeChange, availableFonts, selectedFont, onFontChange,
    activeEditions, selectedEdition, onEditionChange
}) => {
    const { cycleTheme, emoji, name, nextThemeName } = useTheme();
    const [currentAyahNumber, setCurrentAyahNumber] = useState(initialAyahNumber);
    const [currentAyah, setCurrentAyah] = useState<Ayah | null>(null);
    const [uthmaniText, setUthmaniText] = useState<string>('');
    const [displayedText, setDisplayedText] = useState<string>('');
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioDuration, setAudioDuration] = useState(0);
    const [audioProgress, setAudioProgress] = useState(0);
    const [wordTimings, setWordTimings] = useState<{word: string, start: number, duration: number}[]>([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);

    const [isLoading, setIsLoading] = useState(true);
    const [isBuffering, setIsBuffering] = useState(false);
    
    const [controlsVisible, setControlsVisible] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isJuzSelectorOpen, setIsJuzSelectorOpen] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    
    // --- New State for Playback Modes ---
    const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('continuous');
    const [playbackSelection, setPlaybackSelection] = useState<number[] | null>(null);
    const [juzModalMode, setJuzModalMode] = useState<'jump' | 'selection'>('jump');

    const audioRef = useRef<HTMLAudioElement>(null);
    
    const audioEditionDetails = useMemo(() => allAudioEditions.find(e => e.identifier === selectedAudioEdition), [selectedAudioEdition, allAudioEditions]);
    const displayEditionDetails = useMemo(() => activeEditions.find(e => e.identifier === selectedEdition), [activeEditions, selectedEdition]);
    
    const handleScreenTap = () => {
        // Only allow toggling visibility if the audio is playing.
        if (isPlaying) {
            setControlsVisible(prev => !prev);
        }
    };

    useEffect(() => {
        // When playback stops, controls must become visible.
        if (!isPlaying) {
            setControlsVisible(true);
        }
    }, [isPlaying]);

    const juzStartAyahs = useMemo(() => {
        if (!allAyahs || allAyahs.length === 0) return [];
        const juzMap = new Map<number, number>();
        for (const ayah of allAyahs) {
            if (ayah.juz && !juzMap.has(ayah.juz)) {
                juzMap.set(ayah.juz, ayah.number);
            }
        }
        return Array.from(juzMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([juz, ayahNumber]) => ({ juz, ayahNumber }));
    }, [allAyahs]);

    const handleJuzSelect = (ayahNumber: number) => {
        setCurrentAyahNumber(ayahNumber);
        setIsJuzSelectorOpen(false);
        if (!isPlaying) setIsPlaying(true);
    };
    
    const handleSelectionConfirm = (selectedJuzs: number[]) => {
        if (selectedJuzs.length === 0) return;
        setPlaybackMode('selection');
        setPlaybackSelection(selectedJuzs);
        const startAyahNumber = juzStartAyahs.find(j => j.juz === selectedJuzs[0])?.ayahNumber;
        if (startAyahNumber) {
            setCurrentAyahNumber(startAyahNumber);
        }
        setIsJuzSelectorOpen(false);
        if (!isPlaying) setIsPlaying(true);
    };
    
    useEffect(() => {
        if (!allQuranData?.[selectedEdition]) {
            fetchCustomEditionData(selectedEdition);
        }
    }, [selectedEdition, allQuranData, fetchCustomEditionData]);

    useEffect(() => {
        const foundAyah = allAyahs.find(a => a.number === currentAyahNumber);
        if (foundAyah) {
            setCurrentAyah(foundAyah);
            const uthmaniData = allQuranData?.['quran-uthmani'];
            const uthmaniSurah = uthmaniData?.find(s => s.number === foundAyah.surah?.number);
            const uthmaniAyah = uthmaniSurah?.ayahs.find(a => a.numberInSurah === foundAyah.numberInSurah);
            setUthmaniText(uthmaniAyah?.text || foundAyah.text || '');
            const displayData = allQuranData?.[selectedEdition];
            const displaySurah = displayData?.find(s => s.number === foundAyah.surah?.number);
            const displayAyah = displaySurah?.ayahs.find(a => a.numberInSurah === foundAyah.numberInSurah);
            setDisplayedText(displayAyah?.text || uthmaniAyah?.text || foundAyah.text || '');
            setIsLoading(true);
            setIsBuffering(true);
            setWordTimings([]);
            setCurrentWordIndex(-1);
            onSaveProgress(currentAyahNumber);
        }
    }, [currentAyahNumber, allAyahs, allQuranData, onSaveProgress, selectedEdition]);

    useEffect(() => {
        if (!currentAyah || !audioEditionDetails || !audioRef.current) return;
        const loadAudio = () => {
            let audioUrl: string | undefined;
            if (audioEditionDetails.sourceApi === 'alquran.cloud') {
                const audioData = allQuranData?.[selectedAudioEdition];
                const audioSurah = audioData?.find(s => s.number === currentAyah.surah?.number);
                const audioAyah = audioSurah?.ayahs.find(a => a.numberInSurah === currentAyah.numberInSurah);
                audioUrl = audioAyah?.audio;
            } else {
                audioUrl = getAudioUrl(currentAyah, audioEditionDetails);
            }
            if (audioUrl && audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.load();
                if(isPlaying) audioRef.current.play().catch(e => console.error("Play failed", e));
            } else {
                setIsLoading(false);
                setIsBuffering(false);
            }
        };
        if(audioEditionDetails.sourceApi === 'alquran.cloud' && !allQuranData?.[selectedAudioEdition]) {
            fetchCustomEditionData(selectedAudioEdition);
        } else {
            loadAudio();
        }
    }, [currentAyah, selectedAudioEdition, audioEditionDetails, allQuranData, fetchCustomEditionData, isPlaying]);

    useEffect(() => {
        if (audioDuration > 0 && uthmaniText) {
            const words = uthmaniText.split(' ');
            const totalLetters = words.reduce((acc, word) => acc + word.length, 0);
            if (totalLetters === 0) return;
            const effectiveDuration = audioDuration * 0.92;
            const timePerLetter = effectiveDuration / totalLetters;
            let cumulativeTime = 0;
            const timings = words.map(word => {
                const duration = word.length * timePerLetter;
                const timing = { word, start: cumulativeTime, duration };
                cumulativeTime += duration;
                return timing;
            });
            setWordTimings(timings);
        }
    }, [audioDuration, uthmaniText]);

    useEffect(() => {
        if (!isPlaying) return;
        const intervalId = setInterval(() => {
            if (audioRef.current && wordTimings.length > 0) {
                 const leadTime = 0.150;
                 const currentTime = audioRef.current.currentTime;
                 const lookupTime = currentTime + leadTime;
                 setAudioProgress(currentTime);
                 let newWordIndex = -1;
                 for (let i = 0; i < wordTimings.length; i++) {
                    if (lookupTime >= wordTimings[i].start) {
                        newWordIndex = i;
                    } else {
                        break;
                    }
                 }
                 setCurrentWordIndex(prevIndex => newWordIndex !== prevIndex ? newWordIndex : prevIndex);
            }
        }, 50);
        return () => clearInterval(intervalId);
    }, [isPlaying, wordTimings]);

    const handlePlayPause = () => {
        if (isLoading || isBuffering) return;
        const newIsPlaying = !isPlaying;
        setIsPlaying(newIsPlaying);
        if (newIsPlaying) {
            audioRef.current?.play().catch(e => console.error(e));
            setCurrentWordIndex(-1);
        } else {
            audioRef.current?.pause();
        }
    };
    
    const changeAyah = useCallback((direction: 'next' | 'prev') => {
        if (direction === 'prev') {
            const newAyahNumber = currentAyahNumber - 1;
            if (newAyahNumber > 0) setCurrentAyahNumber(newAyahNumber);
            return;
        }

        const nextAyahNumber = currentAyahNumber + 1;
        if (nextAyahNumber > allAyahs.length) {
            setIsPlaying(false);
            return;
        }

        const nextAyah = allAyahs[nextAyahNumber - 1];
        if (!nextAyah || !currentAyah?.juz) {
            setIsPlaying(false);
            return;
        }

        let shouldStop = false;
        
        if (playbackMode === 'single' && nextAyah.juz !== currentAyah.juz) {
            shouldStop = true;
        } else if (playbackMode === 'selection' && playbackSelection && nextAyah.juz !== currentAyah.juz) {
            const currentJuzIndex = playbackSelection.indexOf(currentAyah.juz);
            if (currentJuzIndex === -1 || currentJuzIndex === playbackSelection.length - 1) {
                shouldStop = true;
            } else {
                const nextSelectedJuz = playbackSelection[currentJuzIndex + 1];
                const startOfNextSelectedJuz = juzStartAyahs.find(j => j.juz === nextSelectedJuz)?.ayahNumber;
                if (startOfNextSelectedJuz) {
                    setCurrentAyahNumber(startOfNextSelectedJuz);
                    return; 
                } else {
                    shouldStop = true;
                }
            }
        }

        if (shouldStop) {
            setIsPlaying(false);
        } else {
            setCurrentAyahNumber(nextAyahNumber);
        }
    }, [currentAyahNumber, allAyahs, currentAyah, playbackMode, playbackSelection, juzStartAyahs]);

    const handleAudioEnded = useCallback(() => {
        changeAyah('next');
    }, [changeAyah]);
    
    const getQuranTextStyle = useCallback(() => {
        const fallbackFonts = "'Uthman', 'Amiri Quran', 'Tajawal', sans-serif";
        const isImlaei = displayEditionDetails?.identifier.includes('simple-clean');
        if (displayEditionDetails?.type === 'quran' && displayEditionDetails?.direction === 'rtl') {
            return {
                className: `${isImlaei ? 'imlai-font' : 'uthmani-font'} quran-text-${fontSize}`,
                style: { fontFamily: `"${selectedFont}", ${fallbackFonts}` }
            };
        }
        return { 
            className: `font-sans text-2xl md:text-3xl lg:text-4xl`, 
            style: { lineHeight: 1.8 } 
        };
    }, [displayEditionDetails, fontSize, selectedFont]);

    const { className: quranTextClass, style: quranTextStyle } = getQuranTextStyle();
    const canHighlight = displayEditionDetails?.type === 'quran' && displayEditionDetails?.direction === 'rtl';

    const formatJuzSelection = (juzs: number[]): string => {
        if (!juzs || juzs.length === 0) return '';
        if (juzs.length === 1) return `${juzs[0]}`;
        
        const sorted = [...juzs].sort((a,b) => a - b);
        const ranges: string[] = [];
        let start = sorted[0];
        let end = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                start = sorted[i];
                end = sorted[i];
            }
        }
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        return ranges.join(', ');
    };

    const getPlaybackScopeDescription = () => {
        if (playbackMode === 'single' && currentAyah?.juz) return `الجزء ${currentAyah.juz} فقط`;
        if (playbackMode === 'selection' && playbackSelection) {
            const isRange = playbackSelection.every((juz, i) => i === 0 || juz === playbackSelection[i-1] + 1);
            if (isRange && playbackSelection.length > 1) {
                return `من الجزء ${playbackSelection[0]} إلى ${playbackSelection[playbackSelection.length - 1]}`;
            }
            return `أجزاء مختارة: ${formatJuzSelection(playbackSelection)}`;
        }
        return 'ختمة كاملة';
    };


    if (!currentAyah) {
        return <div className="flex flex-col gap-4 justify-center items-center h-screen bg-gray-900 text-white"><SpinnerIcon className="w-10 h-10"/> <p>جاري تحميل بيانات الختمة...</p></div>;
    }

    return (
        <div className="bg-background text-text-primary fixed inset-0 flex flex-col font-sans" onClick={handleScreenTap}>
            {isJuzSelectorOpen && (
                <JuzSelectionModal 
                    onClose={() => setIsJuzSelectorOpen(false)}
                    juzStartAyahs={juzStartAyahs}
                    onJuzSelect={handleJuzSelect}
                    onSelectionConfirm={handleSelectionConfirm}
                    mode={juzModalMode}
                />
            )}
            {isModeSelectorOpen && (
                <PlaybackModeModal
                    onClose={() => setIsModeSelectorOpen(false)}
                    onModeSelect={(mode) => {
                        setPlaybackMode(mode);
                        setPlaybackSelection(null);
                        if (mode === 'single' && !isPlaying) setIsPlaying(true);
                    }}
                    onCustomSelectionStart={() => {
                        setIsModeSelectorOpen(false);
                        setJuzModalMode('selection');
                        setIsJuzSelectorOpen(true);
                    }}
                />
            )}
            {isSettingsOpen && (
                <SettingsModal 
                    onClose={() => setIsSettingsOpen(false)}
                    fontSize={fontSize} onFontSizeChange={onFontSizeChange}
                    availableFonts={availableFonts} selectedFont={selectedFont} onFontChange={onFontChange}
                    activeEditions={activeEditions} selectedEdition={selectedEdition} onEditionChange={onEditionChange}
                />
            )}

            <audio ref={audioRef} onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration || 0)} onCanPlay={() => { setIsLoading(false); setIsBuffering(false); if(isPlaying) audioRef.current?.play(); }} onPlay={() => setIsPlaying(true)} onPause={() => { if (audioRef.current && Math.abs(audioRef.current.currentTime - audioRef.current.duration) > 0.1) setIsPlaying(false); }} onEnded={handleAudioEnded} onWaiting={() => setIsBuffering(true)} className="hidden" />
            
            <header className={`flex-shrink-0 p-3 text-center bg-surface/80 backdrop-blur-md shadow-md z-10 transition-all duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 -translate-y-full'}`}>
                <a href="#/" onClick={(e) => { e.preventDefault(); window.location.hash = '#/'; }} title="العودة للرئيسية" aria-label="العودة للرئيسية" className="absolute top-3 left-3 p-2 rounded-full bg-surface-subtle hover:bg-surface-hover">
                    <HomeIcon className="w-6 h-6"/>
                </a>
                <h1 className="text-xl font-bold text-primary-text-strong">سورة {currentAyah.surah?.name}</h1>
                <div className="text-sm text-text-muted font-semibold flex justify-center gap-4">
                    <span>الآية: {currentAyah.numberInSurah}</span>
                    <span>الجزء: {currentAyah.juz}</span>
                    <span>الصفحة: {currentAyah.page}</span>
                </div>
            </header>

            <main className="flex-grow flex items-center justify-center p-4">
                <div className="text-center w-full">
                    {(isLoading && !displayedText) ? (
                        <div className="flex flex-col gap-4 items-center"><SpinnerIcon className="w-12 h-12 text-primary"/><p className="text-lg">جاري تحميل الآية...</p></div>
                    ) : (
                        <p className={`select-none ${quranTextClass}`} style={quranTextStyle} dir={displayEditionDetails?.direction || 'rtl'}>
                           {canHighlight ? displayedText.split(' ').map((word, index) => (
                                <span key={index} className={`transition-colors duration-200 ${index === currentWordIndex ? 'text-primary' : ''}`}>
                                    {word}{' '}
                                </span>
                            )) : displayedText}
                        </p>
                    )}
                </div>
            </main>

            <footer className={`flex-shrink-0 p-4 bg-surface/80 backdrop-blur-md shadow-[0_-4px_30px_rgba(0,0,0,0.1)] z-10 transition-all duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 translate-y-full'}`}>
                <div className="w-full h-1.5 bg-surface-subtle rounded-full mb-4">
                    <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: audioDuration > 0 ? `${(audioProgress / audioDuration) * 100}%` : '0%'}}></div>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 flex flex-col gap-1 items-start">
                        <AudioEditionSelector audioEditions={allAudioEditions} selectedAudioEdition={selectedAudioEdition} onSelect={onAudioEditionChange} size="sm" />
                        <span className="text-xs font-semibold text-text-muted px-2">{getPlaybackScopeDescription()}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <button onClick={() => changeAyah('prev')} className="p-2 text-text-secondary hover:text-text-primary transition-colors"><BackwardIcon className="w-7 h-7" /></button>
                        <button onClick={handlePlayPause} className="p-4 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover transition-transform hover:scale-105">
                             {isBuffering ? <SpinnerIcon className="w-8 h-8"/> : (isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />)}
                        </button>
                        <button onClick={() => changeAyah('next')} className="p-2 text-text-secondary hover:text-text-primary transition-colors"><ForwardIcon className="w-7 h-7" /></button>
                    </div>
                    <div className="flex-1 flex justify-end items-center gap-2">
                        <button onClick={() => setIsModeSelectorOpen(true)} title="تحديد نطاق القراءة" className={`p-2 rounded-full transition-colors text-text-muted hover:bg-surface-hover`}><BookOpenIcon className="w-6 h-6"/></button>
                        <div className="h-6 w-px bg-border-default mx-1"></div>
                        <button onClick={() => setIsSettingsOpen(true)} title="إعدادات العرض" className="p-2 rounded-full text-text-muted hover:bg-surface-hover transition-colors"><ComputerDesktopIcon className="w-6 h-6"/></button>
                        <button onClick={cycleTheme} title={`الوضع الحالي: ${name}. اضغط للتغيير إلى وضع ${nextThemeName}.`} className="p-2 rounded-full text-text-muted hover:bg-surface-hover transition-colors w-10 h-10 flex items-center justify-center text-xl">
                            <span role="img" aria-label={name} className="leading-none select-none">{emoji}</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// --- Settings Modal Sub-component ---
interface SettingsModalProps {
    onClose: () => void;
    fontSize: FontSize; onFontSizeChange: (s: FontSize) => void;
    availableFonts: QuranFont[]; selectedFont: string; onFontChange: (f: string) => void;
    activeEditions: QuranEdition[]; selectedEdition: string; onEditionChange: (e: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, fontSize, onFontSizeChange, availableFonts, selectedFont, onFontChange, activeEditions, selectedEdition, onEditionChange }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-end justify-center animate-fade-in" onClick={onClose}>
            <div 
                className="bg-surface rounded-t-2xl shadow-xl w-full max-w-2xl mx-auto flex flex-col max-h-[80vh] transition-transform transform translate-y-4"
                style={{ animation: 'slide-up 0.3s ease-out forwards' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 p-4 border-b border-border-default flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-primary">إعدادات العرض</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-hover"><ClearIcon className="w-5 h-5" /></button>
                </div>
                
                <div className="overflow-y-auto p-4">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-md font-semibold text-text-secondary mb-2 flex items-center gap-2"><TextSizeIcon className="w-5 h-5"/> حجم الخط</h3>
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={() => onFontSizeChange('sm')}
                                    className={`p-3 w-20 h-14 flex items-center justify-center rounded-lg transition-colors ${fontSize === 'sm' ? 'bg-surface-active text-primary-text-strong' : 'bg-surface-subtle hover:bg-surface-hover'}`}
                                    aria-pressed={fontSize === 'sm'}
                                >
                                    <span className="text-sm font-bold">صغير</span>
                                </button>
                                <button
                                    onClick={() => onFontSizeChange('md')}
                                    className={`p-3 w-20 h-14 flex items-center justify-center rounded-lg transition-colors ${fontSize === 'md' ? 'bg-surface-active text-primary-text-strong' : 'bg-surface-subtle hover:bg-surface-hover'}`}
                                    aria-pressed={fontSize === 'md'}
                                >
                                    <span className="text-lg font-bold">متوسط</span>
                                </button>
                                <button
                                    onClick={() => onFontSizeChange('lg')}
                                    className={`p-3 w-20 h-14 flex items-center justify-center rounded-lg transition-colors ${fontSize === 'lg' ? 'bg-surface-active text-primary-text-strong' : 'bg-surface-subtle hover:bg-surface-hover'}`}
                                    aria-pressed={fontSize === 'lg'}
                                >
                                    <span className="text-xl font-bold">كبير</span>
                                </button>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-md font-semibold text-text-secondary mb-2 flex items-center gap-2"><BookOpenIcon className="w-5 h-5"/> الخط</h3>
                            <div className="space-y-1">
                                {availableFonts.map(font => (
                                    <button key={font.font_family} onClick={() => onFontChange(font.font_family)}
                                        className="w-full text-right p-2 rounded-md flex justify-between items-center text-text-primary hover:bg-surface-hover transition-colors">
                                        <span style={{ fontFamily: `"${font.font_family}", sans-serif` }}>{font.name}</span>
                                        {selectedFont === font.font_family && <CheckIcon className="w-5 h-5 text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-md font-semibold text-text-secondary mb-2 flex items-center gap-2"><ComputerDesktopIcon className="w-5 h-5"/> نسخة العرض</h3>
                            <div className="space-y-1">
                                {activeEditions.map(edition => (
                                    <button key={edition.identifier} onClick={() => onEditionChange(edition.identifier)}
                                        className="w-full text-right p-2 rounded-md flex justify-between items-center text-text-primary hover:bg-surface-hover transition-colors">
                                        <span>{edition.name}</span>
                                        {selectedEdition === edition.identifier && <CheckIcon className="w-5 h-5 text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudioKhatmiyahView;
