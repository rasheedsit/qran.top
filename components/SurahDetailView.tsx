import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { SurahData, QuranEdition, QuranFont, SavedAyahItem, Ayah, FontSize, BrowsingMode } from '../types.ts';
import { BookmarkIcon, CopyIcon, PlayIcon, SpinnerIcon, CheckIcon, SearchIcon, SparklesIcon, ArrowLeftIcon, ArrowRightIcon } from './icons.tsx';
import AudioEditionSelector from './AudioEditionSelector.tsx';
import { formatSurahNameForDisplay } from '../utils/text.ts';

interface SurahDetailViewProps {
  surah: SurahData;
  highlightAyahNumber: number | null;
  onWordClick: (query: string, editionIdentifier: string, position: { surah: number; ayah: number; wordIndex: number; }) => void;
  displayEdition: QuranEdition;
  selectedFont: string;
  fontSize: FontSize;
  browsingMode: BrowsingMode;
  onSaveAyah: (item: SavedAyahItem) => void;
  onSearchByAyahNumber: (ayahNumber: number) => void;
  // --- Props for audio playback ---
  currentlyPlayingAyahGlobalNumber: number | null;
  isPlaybackLoading: boolean;
  onStartPlayback: (ayahs: Ayah[], audioEditionIdentifier: string, startIndex?: number) => void;
  allAudioEditions: QuranEdition[];
  selectedAudioEdition: string;
  onAudioEditionChange: (identifier: string) => void;
  // --- Prop for word popover ---
  simpleCleanData: SurahData[];
  hizbQuarterStartMap: Map<number, number>;
}

const SurahDetailView: React.FC<SurahDetailViewProps> = ({ 
  surah, highlightAyahNumber, onWordClick, displayEdition, selectedFont, fontSize, browsingMode,
  onSaveAyah, onSearchByAyahNumber,
  currentlyPlayingAyahGlobalNumber, isPlaybackLoading, onStartPlayback,
  allAudioEditions, selectedAudioEdition, onAudioEditionChange,
  simpleCleanData, hizbQuarterStartMap
}) => {
  const highlightRef = useRef<HTMLSpanElement>(null);
  const playingAyahRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const wordPopoverRef = useRef<HTMLDivElement>(null); // For the new word popover

  const [activePopover, setActivePopover] = useState<number | null>(null);
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // State for the new word search popover
  const [wordPopoverState, setWordPopoverState] = useState<{
    ayahNumberInSurah: number;
    simpleText: string;
    triggerElement: HTMLElement;
  } | null>(null);

  // --- State for swipe gesture tracking ---
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  
  const isImlaei = displayEdition.identifier.includes('simple-clean');
  
  // Ref to track the previous surah number to detect when a new surah is loaded.
  const prevSurahNumber = useRef<number | null>(null);


  const cleanImlaiText = (text: string | undefined): string | undefined => {
    if (!text) return text;
    // This regex is expanded to remove a wider range of Quranic annotation marks,
    // including all common waqf (pause) marks, the sajda symbol, and other small tajweed-related characters,
    // while preserving standard diacritics (harakat).
    // The range U+06D6 to U+06ED covers most of these special symbols.
    const marksToRemoveRegex = /[\u06D6-\u06ED]/g;
    return text.replace(marksToRemoveRegex, '');
  };

  const { ayahsByPage, firstPage, lastPage, getPageForAyahNumber } = useMemo(() => {
    const map = new Map<number, Ayah[]>();
    const ayahNumToPageMap = new Map<number, number>();
    if (!surah || !surah.ayahs || surah.ayahs.length === 0) {
        return { ayahsByPage: map, firstPage: 1, lastPage: 1, getPageForAyahNumber: (n: number) => undefined };
    }
    let minPage = Infinity;
    let maxPage = -Infinity;
    for (const ayah of surah.ayahs) {
        if (ayah.page) {
            if (!map.has(ayah.page)) {
                map.set(ayah.page, []);
            }
            map.get(ayah.page)!.push(ayah);
            minPage = Math.min(minPage, ayah.page);
            maxPage = Math.max(maxPage, ayah.page);
            ayahNumToPageMap.set(ayah.numberInSurah, ayah.page);
        }
    }
    const getPageForAyahNumber = (num: number) => ayahNumToPageMap.get(num);
    return { ayahsByPage: map, firstPage: minPage === Infinity ? 1 : minPage, lastPage: maxPage === -Infinity ? 1 : maxPage, getPageForAyahNumber };
  }, [surah]);

  useEffect(() => {
    let targetPage: number | undefined;

    if (highlightAyahNumber) {
        targetPage = getPageForAyahNumber(highlightAyahNumber);
    } else if (currentlyPlayingAyahGlobalNumber) {
        const playingAyah = surah.ayahs.find(a => a.number === currentlyPlayingAyahGlobalNumber);
        if (playingAyah) {
            targetPage = getPageForAyahNumber(playingAyah.numberInSurah);
        }
    }

    setCurrentPage(targetPage || firstPage);
  }, [surah.number, highlightAyahNumber, currentlyPlayingAyahGlobalNumber, getPageForAyahNumber, firstPage]);


  useEffect(() => {
    const currentSurahNumber = surah.number;
    const isNewSurahView = prevSurahNumber.current !== currentSurahNumber;

    if (isNewSurahView) {
        prevSurahNumber.current = currentSurahNumber;
    }

    let elementToScroll: HTMLElement | null = null;
    let shouldPulse = false;

    // Priority 1: Always scroll to the currently playing ayah if it exists on the screen.
    if (currentlyPlayingAyahGlobalNumber !== null && surah.ayahs.some(a => a.number === currentlyPlayingAyahGlobalNumber)) {
        elementToScroll = playingAyahRef.current;
        shouldPulse = false; // Never pulse for audio playback scrolling.
    }
    // Priority 2: If no audio is playing, scroll to the search highlight, but ONLY on the initial load of this surah.
    else if (isNewSurahView && highlightAyahNumber) {
        elementToScroll = highlightRef.current;
        shouldPulse = true;
    }


    if (elementToScroll) {
        const scrollTimer = setTimeout(() => {
            elementToScroll.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 50);

        let animationTimer: number | undefined;
        if (shouldPulse) {
            animationTimer = window.setTimeout(() => {
                elementToScroll?.classList.add('animate-highlight-pulse');
                const pulseEndTimer = setTimeout(() => {
                    elementToScroll?.classList.remove('animate-highlight-pulse');
                }, 3000);
            }, 100);
        }

        return () => {
            clearTimeout(scrollTimer);
            if (animationTimer) clearTimeout(animationTimer);
        };
    } else if (isNewSurahView && browsingMode === 'full') {
        // On initial load of a new surah, if there's nothing else to scroll to, start at the top.
        window.scrollTo(0, 0);
    }
    // If none of the above conditions are met (e.g., user is scrolling freely while a highlighted ayah exists), do nothing.
  }, [highlightAyahNumber, currentlyPlayingAyahGlobalNumber, surah.number, browsingMode, currentPage]); // Added currentPage

  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
            setActivePopover(null);
        }
        if (wordPopoverRef.current && !wordPopoverRef.current.contains(event.target as Node)) {
            // Clicks on the trigger words should be handled by their own onClicks, not by this.
            if (!(event.target as HTMLElement).closest('.word-trigger')) {
                setWordPopoverState(null);
            }
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popoverRef, wordPopoverRef]);

  const handlePlaySurah = () => {
    onStartPlayback([], selectedAudioEdition);
  };
  
  // --- Handle audio editions ---
  if (displayEdition.format === 'audio') {
    return (
      <div className="animate-fade-in w-full max-w-4xl mx-auto px-4">
        <main className="bg-surface p-6 sm:p-8 rounded-lg shadow-md transition-colors duration-300">
          <h3 className="text-xl font-bold mb-4 text-center text-primary-text">{displayEdition.name}</h3>
          <div className="flex flex-col gap-2">
            {surah.ayahs.map(ayah => (
              ayah.audio ? (
                <div key={ayah.number} className="flex items-center gap-4 py-2 px-3 my-1 bg-surface-subtle rounded-lg">
                  <span className="font-bold text-primary-text">الآية {ayah.numberInSurah}</span>
                  <audio
                    controls
                    src={ayah.audio}
                    className="w-full h-10"
                    preload="metadata"
                    title={`الاستماع للآية ${ayah.numberInSurah}`}
                  >
                    متصفحك لا يدعم عنصر الصوت.
                  </audio>
                </div>
              ) : null
            ))}
          </div>
        </main>
      </div>
    );
  }

  // --- Existing logic for text, made safer ---
  const getQuranTextStyle = () => {
    const fallbackFonts = "'Uthman', 'Amiri Quran', 'Tajawal', sans-serif";
    const isImlaei = displayEdition.identifier.includes('simple-clean');

    if (displayEdition.type === 'quran' && displayEdition.direction === 'rtl') {
      return {
        className: `${isImlaei ? 'imlai-font' : 'uthmani-font'} quran-text-${fontSize}`,
        style: {
          fontFamily: `"${selectedFont}", ${fallbackFonts}`,
        }
      };
    }

    return { className: 'font-quran text-2xl', style: {} };
  }
  
  const { className: quranTextClass, style: quranTextStyle } = getQuranTextStyle();

  const handleSaveClick = (ayah: Ayah) => {
    onSaveAyah({
      type: 'ayah',
      id: `${ayah.surah?.number || surah.number}:${ayah.numberInSurah}`,
      surah: ayah.surah?.number || surah.number,
      ayah: ayah.numberInSurah,
      text: ayah.text || '',
      createdAt: Date.now(),
    });
    setActivePopover(null);
  };

  const handleCopyAyah = (ayah: Ayah) => {
    const surahName = ayah.surah?.name || surah.name;
    const cleanSurahName = formatSurahNameForDisplay(surahName);
    const textToCopy = `"${ayah.text || ''}" (سورة ${cleanSurahName} - الآية ${ayah.numberInSurah})`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedAyah(ayah.number);
        setTimeout(() => setCopiedAyah(null), 2000);
        setActivePopover(null);
    });
  };

  const handleSearchByAyahText = (ayah: Ayah) => {
    // Find the corresponding simple text for this ayah to ensure a clean search
    const simpleSurah = simpleCleanData.find(s => s.number === (ayah.surah?.number || surah.number));
    const simpleAyah = simpleSurah?.ayahs.find(a => a.numberInSurah === ayah.numberInSurah);
    const simpleTextToSearch = simpleAyah?.text;

    if (simpleTextToSearch) {
        // Use the simple text for the search query and specify its source edition
        onWordClick(simpleTextToSearch, 'quran-simple-clean', { surah: surah.number, ayah: ayah.numberInSurah, wordIndex: 0 });
    } else if (ayah.text) {
        // Fallback to the current text if simple text is not found for some reason
        onWordClick(ayah.text, displayEdition.identifier, { surah: surah.number, ayah: ayah.numberInSurah, wordIndex: 0 });
    }
    setActivePopover(null);
  };
  
  const handlePlayFromAyah = (ayah: Ayah) => {
    const startIndex = surah.ayahs.findIndex(a => a.numberInSurah === ayah.numberInSurah);
    if (startIndex !== -1) {
        onStartPlayback([], selectedAudioEdition, startIndex);
    }
    setActivePopover(null);
  };
  
  const handleNextPage = () => {
    setCurrentPage(p => {
        const nextPage = p < lastPage ? p + 1 : p;
        if (nextPage !== p) window.scrollTo({ top: 0, behavior: 'smooth' });
        return nextPage;
    });
  };

  const handlePrevPage = () => {
      setCurrentPage(p => {
          const prevPage = p > firstPage ? p - 1 : p;
          if (prevPage !== p) window.scrollTo({ top: 0, behavior: 'smooth' });
          return prevPage;
      });
  };

  // --- Swipe Gesture Logic ---
  const SWIPE_THRESHOLD = 50; // Minimum pixels to be considered a swipe

  const handleTouchStart = (e: React.TouchEvent) => {
      if (browsingMode !== 'page') return;
      setTouchStartX(e.targetTouches[0].clientX);
      setTouchCurrentX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (touchStartX === null || browsingMode !== 'page') return;
      setTouchCurrentX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
      if (touchStartX === null || touchCurrentX === null || browsingMode !== 'page') return;

      const deltaX = touchStartX - touchCurrentX;

      if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
          if (deltaX > 0) { // Swiped left (from right to left) -> NEXT page for RTL
              if (currentPage < lastPage) {
                  handleNextPage();
              }
          } else { // Swiped right (from left to right) -> PREVIOUS page for RTL
              if (currentPage > firstPage) {
                  handlePrevPage();
              }
          }
      }

      // Reset touch state regardless of swipe success for a clean transition
      setTouchStartX(null);
      setTouchCurrentX(null);
  };

  const swipeTranslateX = useMemo(() => {
      if (touchStartX === null || touchCurrentX === null || browsingMode !== 'page') {
          return 0;
      }
      const deltaX = touchCurrentX - touchStartX;
      
      // Add resistance at the boundaries
      if ((deltaX < 0 && currentPage >= lastPage) || (deltaX > 0 && currentPage <= firstPage)) {
          return deltaX / 3;
      }
      return deltaX;
  }, [touchStartX, touchCurrentX, browsingMode, currentPage, firstPage, lastPage]);
  
  const ayahsToRender = useMemo(() => browsingMode === 'page'
      ? (ayahsByPage.get(currentPage) || [])
      : surah.ayahs, [browsingMode, ayahsByPage, currentPage, surah.ayahs]);

  const pageInfo = useMemo(() => {
    if (browsingMode !== 'page' || !hizbQuarterStartMap || ayahsToRender.length === 0) return null;
    
    const firstAyah = ayahsToRender[0];
    let surahName = firstAyah.surah?.name || surah.name;
    // Clean up surah name
    surahName = surahName.replace(/^سُورَةُ\s*/, '').trim();

    const juzNumber = firstAyah.juz;
    const hizbNumber = firstAyah.hizbQuarter ? Math.floor((firstAyah.hizbQuarter - 1) / 4) + 1 : null;
    
    const markers: {label: string}[] = [];
    const processedQuarters = new Set<number>();
    
    // Check for Hizb marker
    if (hizbNumber) {
        const startOfHizbQuarter = (hizbNumber - 1) * 4 + 1;
        if(hizbQuarterStartMap.get(startOfHizbQuarter) === firstAyah.number) {
            markers.push({ label: `الحزب ${hizbNumber}`});
        }
    }
    
    // Check for Quarter markers
    for(const ayah of ayahsToRender) {
        if(ayah.hizbQuarter && hizbQuarterStartMap.get(ayah.hizbQuarter) === ayah.number) {
            if (processedQuarters.has(ayah.hizbQuarter)) continue;
            
            const quarterType = (ayah.hizbQuarter - 1) % 4;
            if (quarterType === 1) markers.push({ label: 'ربع الحزب'});
            else if (quarterType === 2) markers.push({ label: 'نصف الحزب'});
            else if (quarterType === 3) markers.push({ label: 'ثلاثة أرباع الحزب'});

            processedQuarters.add(ayah.hizbQuarter);
        }
    }
    
    return {
        surahName,
        juzNumber,
        markers,
        side: currentPage % 2 === 0 ? 'left' : 'right'
    };
  }, [currentPage, browsingMode, ayahsToRender, hizbQuarterStartMap, surah.name]);

  const renderContent = (ayahsToRender: Ayah[]) => {
    return ayahsToRender.map((ayah) => {
      const isHighlighted = ayah.numberInSurah === highlightAyahNumber;
      const isPlaying = ayah.number === currentlyPlayingAyahGlobalNumber;
      const isPopoverOpen = activePopover === ayah.numberInSurah;
      const textToDisplay = isImlaei ? cleanImlaiText(ayah.text) : ayah.text;
      
      const simpleSurah = simpleCleanData.find(s => s.number === surah.number);
      const simpleAyah = simpleSurah?.ayahs.find(a => a.numberInSurah === ayah.numberInSurah);

      const createUthmaniWordClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
        const simpleAyahText = simpleAyah?.text;
        if (simpleAyahText) {
          if (wordPopoverState?.ayahNumberInSurah === ayah.numberInSurah) {
            setWordPopoverState(null);
          } else {
            setWordPopoverState({
              ayahNumberInSurah: ayah.numberInSurah,
              simpleText: simpleAyahText,
              triggerElement: event.currentTarget,
            });
          }
        }
      };
      
      return (
        <span key={ayah.number} className="inline">
          <span
            ref={isPlaying ? playingAyahRef : (isHighlighted ? highlightRef : null)}
            className={`inline rounded-md transition-colors duration-300 ${
              isPlaying ? 'bg-primary/20' : (isHighlighted ? 'bg-yellow-400/20' : '')
            }`}
          >
            {textToDisplay?.split(' ').map((word, index, arr) => (
              <React.Fragment key={index}>
                <button
                  onClick={
                    isImlaei
                      ? () => onWordClick(word, displayEdition.identifier, { surah: surah.number, ayah: ayah.numberInSurah, wordIndex: index })
                      : createUthmaniWordClickHandler
                  }
                  className="word-trigger bg-transparent border-none p-0 font-inherit text-inherit leading-inherit cursor-pointer hover:bg-primary/10 rounded-md transition-colors"
                  aria-label={`إظهار خيارات البحث لكلمة: ${word}`}
                >
                  {word}
                </button>
                {index < arr.length - 1 && ' '}
              </React.Fragment>
            ))}
          </span>

          <span className="relative inline-block align-middle">
            <button 
                onClick={() => setActivePopover(isPopoverOpen ? null : ayah.numberInSurah)}
                className={`mx-1 select-none cursor-pointer hover:opacity-80 transition-opacity ${ browsingMode === 'page' ? 'ayah-marker' : 'text-sm font-sans font-bold text-primary-text rounded-md p-1 -m-1'}`}
                aria-label={`إجراءات للآية ${ayah.numberInSurah}`}
                aria-haspopup="true"
                aria-expanded={isPopoverOpen}
            >
              {browsingMode === 'page' ? ayah.numberInSurah : `﴿${ayah.numberInSurah}﴾`}
            </button>
            {isPopoverOpen && (
              <div 
                  ref={popoverRef} 
                  className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-max p-1.5 bg-surface rounded-full shadow-lg border border-border-default flex items-center gap-1 z-10 animate-fade-in"
              >
                  <button
                    onClick={() => handleSaveClick(ayah)}
                    className="p-2.5 rounded-full text-text-subtle focus:opacity-100 hover:bg-surface-hover hover:text-primary transition-colors"
                    title="حفظ الآية في دفتر التدبر"
                  >
                    <BookmarkIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleCopyAyah(ayah)}
                    className="p-2.5 rounded-full text-text-subtle focus:opacity-100 hover:bg-surface-hover hover:text-primary transition-colors"
                    title="نسخ الآية مع المرجع"
                  >
                    {copiedAyah === ayah.number ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleSearchByAyahText(ayah)}
                    className="p-2.5 rounded-full text-text-subtle focus:opacity-100 hover:bg-surface-hover hover:text-primary transition-colors"
                    title="بحث عن نص الآية"
                  >
                    <SearchIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => { onSearchByAyahNumber(ayah.numberInSurah); setActivePopover(null); }}
                    className="p-2.5 rounded-full text-text-subtle focus:opacity-100 hover:bg-surface-hover hover:text-primary transition-colors"
                    title={`بحث عن كل الآيات رقم ${ayah.numberInSurah}`}
                  >
                    <SparklesIcon className="w-5 h-5" />
                  </button>
                  <div className="w-px h-5 bg-border-default mx-1"></div>
                  <button
                    onClick={() => handlePlayFromAyah(ayah)}
                    className="p-2.5 rounded-full text-text-subtle focus:opacity-100 hover:bg-surface-hover hover:text-primary transition-colors"
                    title="تشغيل التلاوة من هذه الآية"
                  >
                    <PlayIcon className="w-5 h-5" />
                  </button>
              </div>
            )}
          </span>
        </span>
      );
    })
  };
  
  const isBismillahApplicable = surah.number !== 1 && surah.number !== 9 && displayEdition.type === 'quran' && displayEdition.direction === 'rtl';
  const shouldShowBismillah = isBismillahApplicable && (browsingMode === 'full' || (browsingMode === 'page' && currentPage === firstPage));
      
  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto px-4">
      {displayEdition.type === 'quran' && displayEdition.direction === 'rtl' && (
        <div className="w-full max-w-4xl mx-auto mb-4 flex items-stretch justify-center gap-3">
            <div className="flex-grow">
                <AudioEditionSelector
                    audioEditions={allAudioEditions}
                    selectedAudioEdition={selectedAudioEdition}
                    onSelect={onAudioEditionChange}
                />
            </div>
            <button
                onClick={handlePlaySurah}
                disabled={isPlaybackLoading || allAudioEditions.length === 0}
                className="flex items-center gap-3 px-6 py-3 bg-surface border-2 border-primary text-primary-text rounded-lg shadow-sm hover:shadow-md hover:bg-surface-hover transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="استماع للسورة"
            >
                {isPlaybackLoading ? <SpinnerIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                <span className="text-lg font-semibold hidden sm:inline">{isPlaybackLoading ? 'جاري التحضير...' : 'استماع'}</span>
            </button>
        </div>
      )}
      <div className="overflow-hidden rounded-lg">
        {browsingMode === 'page' && !isImlaei ? (
             <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: `translateX(${swipeTranslateX}px)`,
                    transition: touchStartX === null ? 'transform 0.3s ease-out' : 'none',
                }}
             >
                <div className="mushaf-page" style={{ touchAction: 'pan-y' }}>
                    {pageInfo?.markers.map((marker, index) => (
                         <div key={index} className={`hizb-marker ${pageInfo.side}`}>{marker.label}</div>
                    ))}
                    <header className="mushaf-header">
                        <span>{pageInfo?.juzNumber && `الجزء ${pageInfo.juzNumber}`}</span>
                        <span>{pageInfo?.surahName && `سورة ${pageInfo.surahName}`}</span>
                    </header>
                    
                    {shouldShowBismillah && (
                        <div className="text-center mb-8 font-bismillah text-2xl text-primary-text-strong">
                            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                        </div>
                    )}
                    <main dir={displayEdition.direction} style={quranTextStyle} className={`text-text-primary ${quranTextClass} text-justify`}>
                        {renderContent(ayahsToRender)}
                    </main>

                    <footer className="mushaf-footer">
                        <span>{currentPage}</span>
                    </footer>
                </div>
            </div>
        ) : (
            <main
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: `translateX(${swipeTranslateX}px)`,
                    transition: touchStartX === null ? 'transform 0.3s ease-out' : 'none',
                    touchAction: browsingMode === 'page' ? 'pan-y' : 'auto',
                }}
                className={`bg-surface p-6 sm:p-8 rounded-lg shadow-md transition-colors duration-300 ${browsingMode === 'page' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
                {browsingMode === 'page' && lastPage > firstPage && (
                    <div className="text-center mb-6 -mt-2">
                        <span className="font-mono text-sm font-semibold text-text-muted select-none">
                            {currentPage}
                        </span>
                    </div>
                )}
                {shouldShowBismillah && (
                    <div className="text-center mb-8 font-bismillah text-2xl text-primary-text-strong">
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                    </div>
                )}
                <div dir={displayEdition.direction} style={quranTextStyle} className={`text-text-primary ${quranTextClass} ${displayEdition.direction === 'ltr' ? 'text-left' : 'text-right'}`}>
                    {renderContent(ayahsToRender)}
                </div>
            </main>
        )}
      </div>
      
      {browsingMode === 'page' && lastPage > firstPage && (
          <div className="mt-6 flex items-center justify-between p-2 bg-surface rounded-full shadow-md border border-border-default">
              <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage <= firstPage}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-text-secondary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                  <ArrowRightIcon className="w-5 h-5" />
                  <span className="font-semibold hidden sm:inline">الصفحة السابقة</span>
              </button>
              <div className="font-bold text-lg text-text-primary font-mono select-none">
                  {currentPage}
              </div>
              <button 
                  onClick={handleNextPage} 
                  disabled={currentPage >= lastPage}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-text-secondary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                  <span className="font-semibold hidden sm:inline">الصفحة التالية</span>
                  <ArrowLeftIcon className="w-5 h-5" />
              </button>
          </div>
      )}

      {wordPopoverState && (
         <div 
            ref={wordPopoverRef}
            className="absolute p-3 bg-surface rounded-lg shadow-lg border border-border-default flex items-center gap-2 z-20 animate-fade-in flex-wrap leading-loose"
            style={(() => {
                if (!wordPopoverState.triggerElement) return { opacity: 0, top: 0, left: 0 };
                const rect = wordPopoverState.triggerElement.getBoundingClientRect();
                return {
                    top: `${rect.bottom + window.scrollY + 5}px`,
                    left: `${rect.left + window.scrollX + rect.width / 2}px`,
                    transform: 'translateX(-50%)',
                };
            })()}
        >
            {wordPopoverState.simpleText.split(' ').map((word, index) => (
                <button
                    key={index}
                    onClick={() => {
                        onWordClick(word, 'quran-simple-clean', { surah: surah.number, ayah: wordPopoverState.ayahNumberInSurah, wordIndex: index });
                        setWordPopoverState(null);
                    }}
                    className="px-2 py-1 bg-surface-subtle rounded-md hover:bg-primary/20 transition-colors"
                >
                    {word}
                </button>
            ))}
        </div>
      )}

    </div>
  );
};

export default SurahDetailView;