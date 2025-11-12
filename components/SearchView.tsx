import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Ayah, SurahData, QuranEdition, SavedAyahItem, SavedSearchItem, FontSize } from '../types.ts';
import { SearchIcon, CopyIcon, CheckIcon, ClearIcon, BackspaceIcon, BackspaceReverseIcon, BookmarkIcon, DocumentDuplicateIcon, DownloadIcon, PlayIcon, SpinnerIcon, PlusIcon } from './icons.tsx';
import { normalizeArabicText, formatSurahNameForDisplay } from '../utils/text.ts';
import DiscussionSection from './DiscussionSection.tsx';
import AudioEditionSelector from './AudioEditionSelector.tsx';


interface SearchViewProps {
  query: string;
  results: Ayah[];
  onNewSearch: (word: string, sourceEdition?: string, position?: { surah: number, ayah: number, wordIndex: number }) => void;
  onSearchComplete: () => void;
  autoOpenDiscussion?: boolean;
  displayEdition: QuranEdition;
  displayEditionData: SurahData[];
  searchEdition: string;
  selectedFont: string;
  fontSize: FontSize;
  position?: { surah: number, ayah: number, wordIndex: number };
  simpleCleanData: SurahData[];
  onSaveAyah: (item: SavedAyahItem) => void;
  onSaveSearch: (item: SavedSearchItem) => void;
  searchType?: 'text' | 'number';
  // --- Props for audio playback ---
  currentlyPlayingAyahGlobalNumber: number | null;
  isPlaybackLoading: boolean;
  onStartPlayback: (ayahs: Ayah[], audioEditionIdentifier: string) => void;
  allAudioEditions: QuranEdition[];
  selectedAudioEdition: string;
  onAudioEditionChange: (identifier: string) => void;
  correctedQuery?: string;
}

const findNeighboringWords = (results: Ayah[], query: string): string[] => {
    const normalizedQueryWords = normalizeArabicText(query).trim().split(' ').filter(w => w.length > 0);
    const numQueryWords = normalizedQueryWords.length;

    if (numQueryWords === 0 || numQueryWords > 6) {
        return [];
    }

    const freq: { [key: string]: number } = {};
    const addNeighbor = (neighbor: string) => {
        if (neighbor && neighbor.length > 1 && !normalizedQueryWords.includes(neighbor)) {
            freq[neighbor] = (freq[neighbor] || 0) + 1;
        }
    };

    results.forEach(ayah => {
        const ayahWords = normalizeArabicText(ayah.text).split(' ');
        const numAyahWords = ayahWords.length;

        if (numQueryWords === 1) {
            const queryWord = normalizedQueryWords[0];
            ayahWords.forEach((word, index) => {
                if (word === queryWord) {
                    if (index > 0) addNeighbor(ayahWords[index - 1]);
                    if (index < numAyahWords - 1) addNeighbor(ayahWords[index + 1]);
                }
            });
        } else {
            for (let i = 0; i <= numAyahWords - numQueryWords; i++) {
                let match = true;
                for (let j = 0; j < numQueryWords; j++) {
                    if (ayahWords[i + j] !== normalizedQueryWords[j]) {
                        match = false;
                        break;
                    }
                }
                if (match && i + numQueryWords < numAyahWords) {
                    addNeighbor(ayahWords[i + numQueryWords]);
                }
            }
        }
    });

    return Object.entries(freq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 30)
        .map(([word]) => word);
};

interface SearchResultItemProps {
  ayah: Ayah;
  queryWords: string[];
  onNewSearch: (word: string, sourceEdition?: string, position?: { surah: number; ayah: number; wordIndex: number; }) => void;
  displayEdition: QuranEdition;
  displayEditionData: SurahData[];
  searchEdition: string;
  selectedFont: string;
  fontSize: FontSize;
  onSaveAyah: (item: SavedAyahItem) => void;
  searchType: 'text' | 'number';
  isCurrentlyPlaying: boolean;
  itemRef: React.RefObject<HTMLLIElement>;
  pulsingWordIndex: number;
  resultIndex: number;
  simpleAyahText: string;
  onUthmaniWordClick: (event: React.MouseEvent<HTMLButtonElement>, resultIndex: number, simpleAyahText: string) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ 
    ayah, queryWords, onNewSearch, displayEdition, displayEditionData, searchEdition, 
    selectedFont, fontSize, onSaveAyah, searchType, isCurrentlyPlaying, itemRef, pulsingWordIndex,
    resultIndex, simpleAyahText, onUthmaniWordClick
}) => {
    const [isCopied, setIsCopied] = useState(false);

    const displayAyah = useMemo(() => {
        if (displayEditionData?.length > 0 && ayah.surah) {
            const displaySurah = displayEditionData.find(s => s.number === ayah.surah!.number);
            const displayAyahData = displaySurah?.ayahs.find(a => a.numberInSurah === ayah.numberInSurah);
            if (displayAyahData && displaySurah) {
                return { 
                    ...displayAyahData,
                    surah: {
                        number: displaySurah.number,
                        name: displaySurah.name,
                        englishName: displaySurah.englishName,
                        englishNameTranslation: displaySurah.englishNameTranslation,
                        revelationType: displaySurah.revelationType,
                    }
                };
            }
        }
        return ayah;
    }, [ayah, displayEditionData]);

    const handleSelectResult = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if(ayah.surah) {
            window.location.hash = e.currentTarget.getAttribute('href')!;
        }
    };

    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSaveAyah({
          type: 'ayah',
          id: `${displayAyah.surah!.number}:${displayAyah.numberInSurah}`,
          surah: displayAyah.surah!.number,
          ayah: displayAyah.numberInSurah,
          text: displayAyah.text || '',
          createdAt: Date.now(),
        });
    };

    const getQuranTextStyle = () => {
        const fallbackFonts = "'Uthman', 'Amiri Quran', 'Tajawal', sans-serif";
        const isImlaei = displayEdition.identifier.includes('simple-clean');

        if (displayEdition.type === 'quran' && displayEdition.direction === 'rtl') {
            return {
                className: `${isImlaei ? 'imlai-font' : 'uthmani-font'} quran-text-${fontSize}`,
                style: { fontFamily: `"${selectedFont}", ${fallbackFonts}` }
            };
        }
        
        return { className: 'font-quran text-2xl', style: {} };
    };

    const { className: quranTextClass, style: quranTextStyle } = getQuranTextStyle();

    const renderAyahWithHighlight = () => {
        if (displayEdition.format === 'audio') {
            return <span className="text-sm text-text-muted">[مصدر صوتي، لا يتوفر عرض نصي هنا]</span>
        }

        if (!displayAyah.text) {
            return '';
        }
        const textToRender = displayAyah.text;
        const isImlaei = displayEdition.identifier.includes('simple-clean');
        
        const wordElements = textToRender.split(' ').map((word, index) => {
            const isPulsing = index === pulsingWordIndex;

            if (searchType === 'number') { // No highlighting for number search
                 return (
                    <button 
                        type="button" 
                        key={index} 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isImlaei) {
                                if (word && ayah.surah) {
                                    onNewSearch(word, displayEdition.identifier, { surah: ayah.surah.number, ayah: ayah.numberInSurah, wordIndex: index });
                                }
                            } else {
                                if (simpleAyahText) {
                                    onUthmaniWordClick(e, resultIndex, simpleAyahText);
                                }
                            }
                        }} 
                        className="word-trigger bg-transparent border-none p-0 font-inherit cursor-pointer hover:bg-primary/10 rounded-md px-1 transition-colors"
                        aria-label={`إظهار خيارات البحث لكلمة: ${word}`}
                    >
                        <span className={isPulsing ? 'animate-highlight-pulse rounded-sm' : ''}>{word}</span>
                    </button>
                 );
            }

            const normalizedWord = normalizeArabicText(word);
            const isMatch = queryWords.some(queryWord => normalizedWord.includes(queryWord));

            return (
                <button
                    type="button"
                    key={index}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isImlaei) {
                            if (word && ayah.surah) {
                                onNewSearch(word, displayEdition.identifier, { surah: ayah.surah.number, ayah: ayah.numberInSurah, wordIndex: index });
                            }
                        } else {
                            if (simpleAyahText) {
                                onUthmaniWordClick(e, resultIndex, simpleAyahText);
                            }
                        }
                    }}
                    className="word-trigger bg-transparent border-none p-0 font-inherit cursor-pointer hover:bg-primary/10 rounded-md px-1 transition-colors"
                    aria-label={`إظهار خيارات البحث لكلمة: ${word}`}
                >
                    {isMatch ? (
                        <mark className={`bg-yellow-400/40 text-text-primary rounded-sm ${isPulsing ? 'animate-highlight-pulse' : ''}`}>{word}</mark>
                    ) : (
                        <span className={isPulsing ? 'animate-highlight-pulse rounded-sm' : ''}>{word}</span>
                    )}
                </button>
            );
        });

        return wordElements.reduce((prev, curr, index) => <>{prev}{index > 0 ? ' ' : ''}{curr}</>, <></>);
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const surahName = ayah.surah?.name || '';
        const cleanSurahName = formatSurahNameForDisplay(surahName);
        const textToCopy = `"${displayAyah.text || ''}" (سورة ${cleanSurahName} - الآية ${ayah.numberInSurah})`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };
    
    return (
        <li
            ref={itemRef}
            className={`p-4 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg ${isCurrentlyPlaying ? 'bg-primary/20 ring-2 ring-primary' : 'bg-surface-subtle'}`}
        >
            <div className="flex justify-between items-center mb-2 gap-4">
                 <a
                    href={`#/surah/${displayAyah.surah?.number}?ayah=${displayAyah.numberInSurah}`}
                    onClick={handleSelectResult}
                    className="text-primary-text font-bold cursor-pointer rounded-md p-1 -m-1 hover:bg-surface-hover transition-colors"
                    aria-label={`الانتقال إلى ${displayAyah.surah?.name} الآية ${displayAyah.numberInSurah}`}
                >
                    <span className="font-quran-title">{displayAyah.surah?.name} - الآية {displayAyah.numberInSurah}</span>
                </a>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleSaveClick}
                        className="p-2 -m-2 rounded-full text-text-subtle hover:text-primary hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        aria-label="حفظ الآية"
                        title="حفظ الآية"
                    >
                        <BookmarkIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleCopy}
                        className="p-2 -m-2 rounded-full text-text-subtle hover:text-primary hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        aria-label={isCopied ? "تم النسخ" : "نسخ الآية"}
                        title={isCopied ? "تم النسخ!" : "نسخ الآية"}
                    >
                         {isCopied ? (
                            <CheckIcon className="w-5 h-5 text-green-500" />
                        ) : (
                            <CopyIcon className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
            <p
                dir={displayEdition.direction}
                style={quranTextStyle}
                aria-label={`نص الآية ${displayAyah.numberInSurah} من سورة ${displayAyah.surah?.name}`}
                className={`${quranTextClass} text-text-primary ${displayEdition.direction === 'ltr' ? 'text-left' : 'text-right'}`}
            >
               {renderAyahWithHighlight()}
            </p>
        </li>
    );
};

const EXPORT_TEMPLATE_KEY = 'qran_app_export_template';
const DEFAULT_EXPORT_TEMPLATE = `ملخص البحث عن: "{{query}}"
- عدد الآيات المطابقة: {{ayah_count}}
- إجمالي التكرارات: {{general_occurrences}}
- المطابقات التامة: {{exact_occurrences}}
- خيار التطابق: {{exact_match_status}}

====================================

{{#results}}
"{{ayah_text}}" (سورة {{surah_name}} - الآية {{ayah_number_in_surah}})

---

{{/results}}
`;


export const SearchView: React.FC<SearchViewProps> = ({ 
    query, results, onNewSearch, onSearchComplete, autoOpenDiscussion, 
    displayEdition, displayEditionData, searchEdition, selectedFont, fontSize, position, 
    simpleCleanData, onSaveAyah, onSaveSearch, searchType = 'text',
    currentlyPlayingAyahGlobalNumber, isPlaybackLoading, onStartPlayback,
    allAudioEditions, selectedAudioEdition, onAudioEditionChange,
    correctedQuery
}) => {
  const [editableQuery, setEditableQuery] = useState(query);
  const [exactMatch, setExactMatch] = useState(false);
  const [visibleSuggestionsCount, setVisibleSuggestionsCount] = useState(7);
  const [isAllCopied, setIsAllCopied] = useState(false);
  
  const [jumpToValue, setJumpToValue] = useState('');
  const [pulsingWord, setPulsingWord] = useState<{ itemIndex: number; wordIndex: number } | null>(null);
  
  const [activePhraseFilter, setActivePhraseFilter] = useState('all');

  const itemRefs = useRef<React.RefObject<HTMLLIElement>[]>([]);
  
  const [wordPopoverState, setWordPopoverState] = useState<{
    resultIndex: number;
    simpleText: string;
    triggerElement: HTMLElement;
  } | null>(null);
  const wordPopoverRef = useRef<HTMLDivElement>(null);


  const normalizedQueryForDiscussion = useMemo(() => {
    if (searchType === 'number') {
        return `topic:ayah-number:${query}`;
    }
    if (position && searchEdition.includes('uthmani') && simpleCleanData && simpleCleanData.length > 0) {
        const { surah: surahNum, ayah: ayahNumInSurah, wordIndex } = position;
        const targetSurah = simpleCleanData.find(surah => surah.number === surahNum);
        
        if (targetSurah) {
            const targetAyah = targetSurah.ayahs.find(a => a.numberInSurah === ayahNumInSurah);
            if (targetAyah && targetAyah.text) {
                const words = targetAyah.text.split(' ');
                if (words[wordIndex]) {
                    return words[wordIndex];
                }
            }
        }
    }
    return normalizeArabicText(query);
  }, [query, position, searchEdition, simpleCleanData, searchType]);

  useEffect(() => {
    setEditableQuery(query);
    setVisibleSuggestionsCount(7);
    setActivePhraseFilter('all');
  }, [query]);
  
  useEffect(() => {
    onSearchComplete();
  }, [results, onSearchComplete]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (wordPopoverRef.current && !wordPopoverRef.current.contains(event.target as Node)) {
            if (!(event.target as HTMLElement).closest('.word-trigger')) {
                setWordPopoverState(null);
            }
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wordPopoverRef]);

  const queryWords = useMemo(() => {
    const finalQuery = correctedQuery || query;
    return finalQuery.trim().replace(/"/g, '').split(/\s+/).filter(Boolean).map(normalizeArabicText);
  }, [query, correctedQuery]);
  
  const isSingleWordSearch = queryWords.length === 1;

  const phraseFilters = useMemo(() => {
    if (searchType === 'number' || queryWords.length < 2) {
        return [];
    }

    // Step 1: Find all potential phrases
    const phrasesToConsider = new Set<string>();
    results.forEach(ayah => {
        const ayahWords = normalizeArabicText(ayah.text).split(' ');
        const indices: number[] = [];
        ayahWords.forEach((word, index) => {
            if (queryWords.includes(word)) {
                indices.push(index);
            }
        });
        
        if (indices.length >= queryWords.length) {
            const minIndex = Math.min(...indices);
            const maxIndex = Math.max(...indices);
            if (maxIndex - minIndex < queryWords.length + 3) {
                const phrase = ayahWords.slice(minIndex, maxIndex + 1).join(' ');
                phrasesToConsider.add(phrase);
            }
        }
    });

    // Step 2: Ensure the user's exact query phrase is always included
    const userQueryPhrase = queryWords.join(' ');
    phrasesToConsider.add(userQueryPhrase);

    // Step 3: Calculate the number of ayahs containing each phrase
    const allPhraseCounts: { phrase: string, count: number }[] = [];
    phrasesToConsider.forEach(phrase => {
        const count = results.filter(ayah => normalizeArabicText(ayah.text).includes(phrase)).length;
        allPhraseCounts.push({ phrase, count });
    });

    // Step 4: Ensure user's phrase is preserved, then sort and slice
    const userPhraseObj = allPhraseCounts.find(p => p.phrase === userQueryPhrase);
    const otherPhrases = allPhraseCounts.filter(p => p.phrase !== userQueryPhrase);

    otherPhrases.sort((a, b) => b.count - a.count || a.phrase.length - b.phrase.length);
    
    const topPhrases = otherPhrases.slice(0, 9);
    
    const finalFilters = userPhraseObj ? [userPhraseObj, ...topPhrases] : topPhrases;

    // Final sort to place the user's phrase correctly among the top results
    return finalFilters.sort((a, b) => b.count - a.count || a.phrase.length - b.phrase.length);

}, [results, queryWords, searchType]);

  const displayedResults = useMemo(() => {
    let baseResults = results;
    if (searchType === 'text' && exactMatch && isSingleWordSearch) {
      const normalizedQuery = queryWords.join(' ');
      const regex = new RegExp(`(^|\\s)${normalizedQuery}(\\s|$)`);
      baseResults = baseResults.filter(ayah => regex.test(normalizeArabicText(ayah.text)));
    }
    
    if (activePhraseFilter === 'all') {
      return baseResults;
    }

    return baseResults.filter(ayah => normalizeArabicText(ayah.text).includes(activePhraseFilter));
  }, [results, queryWords, exactMatch, searchType, activePhraseFilter, isSingleWordSearch]);

  // Assign refs for each item
  itemRefs.current = displayedResults.map((_, i) => itemRefs.current[i] ?? React.createRef());

  // Scroll to playing item
  useEffect(() => {
    if (currentlyPlayingAyahGlobalNumber) {
        const playingIndex = displayedResults.findIndex(ayah => ayah.number === currentlyPlayingAyahGlobalNumber);
        if (playingIndex !== -1 && itemRefs.current[playingIndex]?.current) {
            itemRefs.current[playingIndex].current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
  }, [currentlyPlayingAyahGlobalNumber, displayedResults]);

  const occurrencesMap = useMemo(() => {
    if (searchType === 'number' || !query) return [];
    
    const transformedQuery = normalizeArabicText(correctedQuery || query).replace(/"/g, '');
    if (!transformedQuery) return [];

    const occurrences: { itemIndex: number; wordIndex: number; }[] = [];
    const searchTerms = transformedQuery.split(/\s+/);

    displayedResults.forEach((resultAyah, itemIndex) => {
        const ayahWords = normalizeArabicText(resultAyah.text).split(' ');
        
        for (let i = 0; i <= ayahWords.length - searchTerms.length; i++) {
            const slice = ayahWords.slice(i, i + searchTerms.length);
            if (slice.join(' ') === searchTerms.join(' ')) {
                 occurrences.push({ itemIndex, wordIndex: i });
            }
        }
    });

    return occurrences;
}, [displayedResults, query, correctedQuery, searchType]);


  const totalOccurrences = occurrencesMap.length;

  const handleJumpToOccurrence = () => {
    const target = parseInt(jumpToValue, 10);
    if (isNaN(target) || target < 1 || target > totalOccurrences) {
        alert(`الرجاء إدخال رقم صحيح بين 1 و ${totalOccurrences}`);
        return;
    }

    const occurrence = occurrencesMap[target - 1];
    if (occurrence && itemRefs.current[occurrence.itemIndex]?.current) {
        const element = itemRefs.current[occurrence.itemIndex].current;
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setPulsingWord({ itemIndex: occurrence.itemIndex, wordIndex: occurrence.wordIndex });
        
        setTimeout(() => {
            setPulsingWord(null);
        }, 3000); // Animation is 1.5s * 2 = 3s
    }
  };

  const generalOccurrences = useMemo(() => {
    if (searchType === 'number' || queryWords.length === 0) return 0;
    let count = 0;
    results.forEach(ayah => {
        const ayahText = normalizeArabicText(ayah.text);
        queryWords.forEach(word => {
            count += (ayahText.match(new RegExp(word, 'g')) || []).length;
        });
    });
    return count;
  }, [results, queryWords, searchType]);

  const exactOccurrences = useMemo(() => {
    if (searchType === 'number' || queryWords.length === 0) return 0;
    let count = 0;
    const regex = new RegExp(`(^|\\s)(${queryWords.join('|')})(\\s|$)`, 'g');
    results.forEach(ayah => {
        const ayahText = normalizeArabicText(ayah.text);
        count += (ayahText.match(regex) || []).length;
    });
    return count;
  }, [results, queryWords, searchType]);

  const neighboringWords = useMemo(() => {
    if (searchType === 'number' || !isSingleWordSearch) return [];
    // Use the unfiltered 'results' prop to get a stable list of suggestions
    // regardless of the active phrase filter. This is crucial for single-word searches.
    return findNeighboringWords(results, correctedQuery || query);
  }, [results, query, correctedQuery, searchType, isSingleWordSearch]);

  const handleShowMore = () => {
    setVisibleSuggestionsCount(prev => prev + 7);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = editableQuery.trim();
    if (trimmedQuery && trimmedQuery !== query) {
      onNewSearch(trimmedQuery);
    }
  };

  const handleDeleteFirstChar = () => {
    const newQuery = editableQuery.slice(1);
    if (newQuery) {
        onNewSearch(newQuery);
    } else {
        setEditableQuery('');
    }
  };

  const handleDeleteLastChar = () => {
    const newQuery = editableQuery.slice(0, -1);
    if (newQuery) {
        onNewSearch(newQuery);
    } else {
        setEditableQuery('');
    }
  };

  const handleNeighborClick = (neighbor: string) => {
    const currentQuery = editableQuery.trim();
    onNewSearch(`${currentQuery} ${neighbor}`);
  };

  const handleSaveSearch = () => {
    const queryToSave = correctedQuery || query;
    if (!queryToSave) return;
    onSaveSearch({
        type: 'search',
        id: queryToSave,
        query: queryToSave,
        createdAt: Date.now()
    });
  };
  
  const handleUthmaniWordClick = (
      event: React.MouseEvent<HTMLButtonElement>,
      resultIndex: number,
      simpleAyahText: string
  ) => {
      if (wordPopoverState?.resultIndex === resultIndex) {
          setWordPopoverState(null); // Toggle off
      } else {
          setWordPopoverState({
              resultIndex: resultIndex,
              simpleText: simpleAyahText,
              triggerElement: event.currentTarget,
          });
      }
  };

  const formatResultsForExport = (): string => {
    if (displayedResults.length === 0) {
        return 'لم يتم العثور على نتائج.';
    }

    const savedTemplate = localStorage.getItem(EXPORT_TEMPLATE_KEY);
    const isTextSearch = searchType === 'text';
    const queryToExport = correctedQuery || query;

    // A specific default template for number searches, in case the user's custom template is heavily text-search oriented
    const defaultTemplateForNumber = `ملخص البحث عن الآيات رقم: "{{query}}"
- عدد الآيات التي تم العثور عليها: {{ayah_count}}

====================================

{{#results}}
"{{ayah_text}}" (سورة {{surah_name}} - الآية {{ayah_number_in_surah}})
---
{{/results}}
`;

    const defaultTemplate = isTextSearch ? DEFAULT_EXPORT_TEMPLATE : defaultTemplateForNumber;
    let template = savedTemplate || defaultTemplate;

    // --- Template Processing ---

    // 1. Global replacements
    template = template.replace(/{{query}}/g, queryToExport);
    template = template.replace(/{{ayah_count}}/g, String(displayedResults.length));

    // Text-search specific variables
    if (isTextSearch) {
        template = template.replace(/{{general_occurrences}}/g, String(generalOccurrences));
        template = template.replace(/{{exact_occurrences}}/g, String(exactOccurrences));
        template = template.replace(/{{exact_match_status}}/g, exactMatch ? 'مفعل' : 'غير مفعل');
    } else {
        // If it's a number search, remove text-only variables so they don't appear in the output
        template = template.replace(/-\s*إجمالي التكرارات:.*?\n/g, '');
        template = template.replace(/-\s*المطابقات التامة:.*?\n/g, '');
        template = template.replace(/-\s*خيار التطابق:.*?\n/g, '');
    }

    // 2. Process results loop
    const resultsRegex = /{{#results}}(.*){{\/results}}/s;
    const match = template.match(resultsRegex);

    if (match && match[1]) {
        const itemTemplate = match[1];
        const allResultsString = displayedResults.map(resultAyah => {
            let itemString = itemTemplate;
            const displaySurah = displayEditionData.find(s => s.number === resultAyah.surah!.number);
            const displayAyah = displaySurah?.ayahs.find(a => a.numberInSurah === resultAyah.numberInSurah);
            const textToExport = displayAyah?.text || resultAyah.text || '';

            itemString = itemString.replace(/{{ayah_text}}/g, textToExport);
            itemString = itemString.replace(/{{surah_name}}/g, resultAyah.surah?.name || '');
            itemString = itemString.replace(/{{ayah_number_in_surah}}/g, String(resultAyah.numberInSurah));
            return itemString;
        }).join('');
        
        template = template.replace(resultsRegex, allResultsString);
    }

    return template.trim();
  };


  const handleCopyAll = () => {
      const textToCopy = formatResultsForExport();
      if (!textToCopy) return;

      navigator.clipboard.writeText(textToCopy).then(() => {
          setIsAllCopied(true);
          setTimeout(() => setIsAllCopied(false), 2500);
      }).catch(err => {
          console.error('Failed to copy all results: ', err);
          alert('فشل نسخ النتائج. قد لا يدعم متصفحك هذه الميزة.');
      });
  };

  const handleDownloadAll = () => {
      const textToDownload = formatResultsForExport();
      if (!textToDownload) return;
      
      const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeQuery = (correctedQuery || query).replace(/[^a-zA-Z0-9-ء-ي ]/g, "").trim() || 'results';
      link.download = `qran-top-search-${safeQuery}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };
  
  const handlePlayAll = () => {
    if (displayedResults.length > 0) {
      onStartPlayback(displayedResults, selectedAudioEdition);
    }
  };

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto px-4">
      {searchType !== 'number' && (
          <div className="mb-6">
              <form onSubmit={handleFormSubmit} className="flex-grow w-full flex items-center gap-2">
                {editableQuery.split(' ').filter(Boolean).length === 1 && editableQuery.length > 1 && (
                    <button type="button" onClick={handleDeleteFirstChar} className="flex-shrink-0 p-2 text-text-muted rounded-full hover:bg-surface-hover transition-colors" aria-label="حذف من بداية الكلمة" title="حذف من بداية الكلمة"><BackspaceIcon className="w-5 h-5" /></button>
                )}
                <div className="relative flex-grow">
                    <input type="text" value={editableQuery} onChange={(e) => setEditableQuery(e.target.value)} placeholder="ابحث عن كلمة..." className="w-full text-xl font-bold text-primary-text-strong border-b-2 border-border-default focus:border-primary bg-transparent py-2 pr-4 pl-12 outline-none transition-colors" aria-label="كلمة البحث"/>
                    {editableQuery && (<button type="button" onClick={() => { setEditableQuery(''); onNewSearch(''); }} className="absolute left-1 top-1/2 -translate-y-1/2 p-2 text-text-muted hover:text-text-primary rounded-full" aria-label="مسح البحث"><ClearIcon className="w-5 h-5" /></button>)}
                </div>
                {editableQuery.split(' ').filter(Boolean).length === 1 && editableQuery.length > 1 && (
                    <button type="button" onClick={handleDeleteLastChar} className="flex-shrink-0 p-2 text-text-muted rounded-full hover:bg-surface-hover transition-colors" aria-label="حذف من نهاية الكلمة" title="حذف من نهاية الكلمة"><BackspaceReverseIcon className="w-5 h-5" /></button>
                )}
                <button type="submit" className="flex-shrink-0 p-3 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50" aria-label="بحث"><SearchIcon className="w-5 h-5" /></button>
            </form>
            {isSingleWordSearch && neighboringWords.length > 0 && (
                <div className="mt-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {neighboringWords.slice(0, visibleSuggestionsCount).map(word => (
                            <button
                                key={word}
                                onClick={() => handleNeighborClick(word)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-surface-subtle text-text-secondary rounded-full hover:bg-primary/20 hover:text-primary-text-strong transition-all"
                            >
                                <PlusIcon className="w-4 h-4 text-primary-text"/>
                                <span>{word}</span>
                            </button>
                        ))}
                    </div>
                    {neighboringWords.length > visibleSuggestionsCount && (
                        <div className="text-center">
                            <button
                                onClick={handleShowMore}
                                className="mt-4 text-sm font-semibold text-primary-text hover:underline"
                            >
                                عرض المزيد...
                            </button>
                        </div>
                    )}
                </div>
            )}
          </div>
      )}
      
      {correctedQuery && (
        <div className="mb-4 p-4 bg-blue-500/10 border-l-4 border-blue-500 text-text-secondary rounded-r-lg">
            <p>لم نجد نتائج لـ "{query}". نعرض لك نتائج لأقرب كلمة: <strong>{correctedQuery}</strong>.</p>
            <button onClick={() => onNewSearch(query)} className="mt-2 text-sm font-bold hover:underline">
                ابحث عن "{query}" بدلاً من ذلك
            </button>
        </div>
      )}

      <main className="bg-surface p-6 sm:p-8 rounded-lg shadow-md transition-colors duration-300">
        {searchType === 'text' && phraseFilters.length > 0 && (
          <div className="mb-6 pb-4 border-b border-border-default">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-sm font-medium text-text-muted flex-shrink-0">
                فلاتر التراكيب:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setActivePhraseFilter('all')} className={`px-3 py-1 rounded-full text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${activePhraseFilter === 'all' ? 'bg-primary text-white font-semibold' : 'bg-surface-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}>
                      كل النتائج ({results.length})
                  </button>
                {phraseFilters.map(({ phrase, count }) => (
                  <button key={phrase} onClick={() => setActivePhraseFilter(phrase)} className={`px-3 py-1 rounded-full text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${activePhraseFilter === phrase ? 'bg-primary text-white font-semibold' : 'bg-surface-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}>
                      {phrase} ({count})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 p-4 bg-surface-subtle rounded-lg border border-border-default">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-grow">
                    {searchType === 'text' ? (
                        <h3 className="text-lg font-semibold text-text-secondary">نتائج البحث عن الكلمات: <span className="font-bold text-primary-text-strong">{queryWords.join('، ')}</span></h3>
                    ) : (
                        <h3 className="text-lg font-semibold text-text-secondary">الآيات التي تحمل الرقم "<span className="font-bold text-primary-text-strong">{query}</span>"</h3>
                    )}
                    
                    {results.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span 
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-500/20 text-text-primary shadow-sm cursor-help"
                                title="إجمالي عدد الآيات التي تحتوي على كلمة البحث."
                            >{displayedResults.length} آيات</span>
                            {searchType === 'text' && isSingleWordSearch && (
                              <>
                                <span 
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-500/20 text-text-primary shadow-sm cursor-help"
                                    title="إجمالي عدد مرات ورود كلمة البحث في كل الآيات."
                                >{generalOccurrences} تكراراً</span>
                                <span 
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-500/20 text-text-primary shadow-sm cursor-help"
                                    title="إجمالي عدد مرات ورود كلمة البحث ككلمة مستقلة (ليست جزءًا من كلمة أخرى)."
                                >{exactOccurrences} مطابقة</span>
                              </>
                            )}
                        </div>
                    )}
                </div>
                
                {searchType === 'text' && isSingleWordSearch && (
                    <div className="flex items-center gap-2 self-start sm:self-center mt-2 sm:mt-0 flex-shrink-0">
                        <label htmlFor="exactMatchToggle" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="exactMatchToggle" className="sr-only peer" checked={exactMatch} onChange={() => setExactMatch(!exactMatch)}/>
                            <div className="w-11 h-6 bg-surface-hover rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                            <span className="ms-3 text-sm font-medium text-text-primary">{exactMatch ? 'التطابق مفعل' : 'التطابق غير مفعل'}</span>
                        </label>
                    </div>
                )}
            </div>
            {searchType === 'text' && totalOccurrences > 1 && (
                <div className="mt-3 pt-3 border-t border-border-default flex items-center gap-2 flex-wrap">
                    <label htmlFor="jump-input" className="text-sm font-semibold text-text-muted">
                        الانتقال إلى التكرار:
                    </label>
                    <input 
                        id="jump-input"
                        type="number"
                        value={jumpToValue}
                        onChange={(e) => setJumpToValue(e.target.value)}
                        min="1"
                        max={totalOccurrences}
                        className="w-24 p-1.5 border border-border-default rounded-md text-center bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={`1 - ${totalOccurrences}`}
                    />
                    <button
                        onClick={handleJumpToOccurrence}
                        className="px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-hover transition-colors"
                    >
                        اذهب
                    </button>
                </div>
            )}
        </div>
        
        {displayedResults.length > 0 && (
          <>
            <div className="flex items-center flex-wrap gap-2 my-6 p-3 bg-surface-subtle rounded-lg border border-border-default">
                <span className="text-sm font-semibold text-text-muted ml-2">أدوات النتائج:</span>
                <div className="inline-flex items-center gap-2 border border-border-default rounded-full bg-surface p-1 shadow-sm">
                    <button onClick={handlePlayAll} disabled={isPlaybackLoading || allAudioEditions.length === 0} className="flex items-center gap-2 px-3 py-1 rounded-full text-sm text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                        {isPlaybackLoading ? <SpinnerIcon className="w-4 h-4"/> : <PlayIcon className="w-4 h-4"/>}
                        <span>{isPlaybackLoading ? 'تحضير...' : 'تشغيل الكل'}</span>
                    </button>
                    <div className="border-l border-border-default h-5"></div>
                    <div className="min-w-0">
                        <AudioEditionSelector 
                            audioEditions={allAudioEditions}
                            selectedAudioEdition={selectedAudioEdition}
                            onSelect={onAudioEditionChange}
                            size="sm"
                        />
                    </div>
                </div>
                {searchType === 'text' && (
                    <button onClick={handleSaveSearch} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-text-secondary bg-surface hover:bg-surface-hover border border-border-default shadow-sm transition-colors">
                        <BookmarkIcon className="w-4 h-4"/>
                        <span>حفظ البحث</span>
                    </button>
                )}
                <button onClick={handleCopyAll} disabled={isAllCopied} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-text-secondary bg-surface hover:bg-surface-hover border border-border-default shadow-sm transition-colors disabled:opacity-70">
                    {isAllCopied ? <CheckIcon className="w-4 h-4 text-green-500"/> : <DocumentDuplicateIcon className="w-4 h-4"/>}
                    <span>{isAllCopied ? 'تم النسخ!' : 'نسخ كل النتائج'}</span>
                </button>
                <button onClick={handleDownloadAll} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-text-secondary bg-surface hover:bg-surface-hover border border-border-default shadow-sm transition-colors">
                    <DownloadIcon className="w-4 h-4"/>
                    <span>تحميل النتائج (txt)</span>
                </button>
            </div>
            <DiscussionSection 
                rawQuery={query}
                normalizedQuery={normalizedQueryForDiscussion}
                autoOpen={autoOpenDiscussion}
            />
          </>
        )}
        
        <div className="mt-6">
        {displayedResults.length > 0 ? (
            <ul className="space-y-4">
                {displayedResults.map((ayah, index) => {
                    const simpleSurah = simpleCleanData.find(s => s.number === ayah.surah?.number);
                    const simpleAyah = simpleSurah?.ayahs.find(a => a.numberInSurah === ayah.numberInSurah);
                    const simpleAyahText = simpleAyah?.text || '';

                   return (
                       <SearchResultItem 
                            key={ayah.number}
                            itemRef={itemRefs.current[index]}
                            ayah={ayah} 
                            queryWords={searchType === 'number' ? [] : queryWords}
                            onNewSearch={onNewSearch}
                            displayEdition={displayEdition}
                            displayEditionData={displayEditionData}
                            searchEdition={searchEdition}
                            selectedFont={selectedFont}
                            fontSize={fontSize}
                            onSaveAyah={onSaveAyah}
                            searchType={searchType}
                            isCurrentlyPlaying={ayah.number === currentlyPlayingAyahGlobalNumber}
                            pulsingWordIndex={pulsingWord?.itemIndex === index ? pulsingWord.wordIndex : -1}
                            resultIndex={index}
                            simpleAyahText={simpleAyahText}
                            onUthmaniWordClick={handleUthmaniWordClick}
                        />
                   );
                })}
            </ul>
        ) : (
            <div className="text-center p-10 text-lg text-text-muted">لم يتم العثور على نتائج.</div>
        )}
        </div>
      </main>
      
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
            {wordPopoverState.simpleText.split(' ').map((word, wordIndex) => {
                const originalAyah = displayedResults[wordPopoverState.resultIndex];
                if (!originalAyah?.surah) return null;

                return (
                    <button
                        key={wordIndex}
                        onClick={() => {
                            onNewSearch(word, 'quran-simple-clean', { surah: originalAyah.surah!.number, ayah: originalAyah.numberInSurah, wordIndex: wordIndex });
                            setWordPopoverState(null);
                        }}
                        className="px-2 py-1 bg-surface-subtle rounded-md hover:bg-primary/20 transition-colors"
                    >
                        {word}
                    </button>
                );
            })}
        </div>
      )}

    </div>
  );
};