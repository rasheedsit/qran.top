import React, { useRef, useEffect } from 'react';
import type { Ayah, QuranEdition } from '../types';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon, XIcon, SpinnerIcon } from './icons';

interface AudioPlayerBarProps {
    playlist: Ayah[];
    currentIndex: number;
    isPlaying: boolean;
    isLoading: boolean;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onEnded: () => void;
    onClose: () => void;
    audioEdition: QuranEdition | undefined;
}

const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({ playlist, currentIndex, isPlaying, isLoading, onPlayPause, onNext, onPrev, onEnded, onClose, audioEdition }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const currentAyah = playlist[currentIndex];

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentAyah?.audio) return;
        
        // Only update src if it's different to prevent re-loading the same track
        if (audio.src !== currentAyah.audio) {
            audio.src = currentAyah.audio;
        }

        if (isPlaying) {
            audio.play().catch(e => console.error("Audio play failed:", e));
        } else {
            audio.pause();
        }
    }, [currentIndex, isPlaying, playlist, currentAyah]);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.addEventListener('ended', onEnded);
            return () => {
                audio.removeEventListener('ended', onEnded);
            };
        }
    }, [onEnded]);

    const getSurahName = () => {
        if (!currentAyah?.surah?.name) return '...';
        return currentAyah.surah.name.replace(/^سُورَةُ\s*/, '').trim();
    }

    const getTitle = () => {
        if (isLoading) return 'جاري التحضير...';
        const reciterName = audioEdition?.name ? `${audioEdition.name} - ` : '';
        return `${reciterName}سورة ${getSurahName()}`;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-md z-40 shadow-[0_-4px_30px_rgba(0,0,0,0.1)] animate-fade-in">
            <audio ref={audioRef} preload="auto" />
            <div className="max-w-4xl mx-auto p-3 flex items-center justify-between gap-4">
                <div className="flex-grow min-w-0">
                    <p className="font-bold text-text-primary truncate">
                       { getTitle() }
                    </p>
                    <p className="text-sm text-text-muted">
                       { !isLoading && `الآية ${currentAyah?.numberInSurah}` }
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <button onClick={onPrev} disabled={isLoading} className="p-2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50">
                        <BackwardIcon className="w-6 h-6" />
                    </button>
                    <button onClick={onPlayPause} disabled={isLoading} className="p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover transition-transform hover:scale-105 disabled:bg-primary/60">
                        {isLoading ? <SpinnerIcon className="w-7 h-7" /> : (
                            isPlaying ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />
                        )}
                    </button>
                    <button onClick={onNext} disabled={isLoading} className="p-2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50">
                        <ForwardIcon className="w-6 h-6" />
                    </button>
                </div>
                 <div className="flex-grow text-left">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-subtle">
                        <XIcon className="w-6 h-6 text-text-subtle" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AudioPlayerBar;