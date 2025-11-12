// This helper is used to normalize both user input and source text for consistent searching.
export const normalizeArabicText = (word: string | undefined): string => {
    if (!word) return '';
    
    let cleaned = word;

    // Normalize variations of Alif (أ, إ, آ, ٱ, ٰ) to a plain Alif (ا), but keep Alif Maqsurah (ى).
    // U+0670 is for Dagger Alif.
    cleaned = cleaned.replace(/[أإآٱٰ\u0670]/g, 'ا');

    // Remove diacritics (Tashkeel) and other Quranic annotation marks.
    // This range covers most common diacritics.
    cleaned = cleaned.replace(/[\u064B-\u065F\u06D6-\u06ED]/g, '');

    // Remove Tatweel (Kashida), which is used to stretch characters.
    cleaned = cleaned.replace(/ـ/g, '');

    return cleaned.trim();
};

// This helper cleans a surah name for clean display (e.g., for copying or UI titles).
export const formatSurahNameForDisplay = (name: string | undefined): string => {
    if (!name) return '';
    // Example: "سُورَةُ ٱلْفَاتِحَةِ" -> "الفاتحة"
    let cleaned = name.replace(/^سُورَةُ\s*/, '');
    
    // This comprehensive regex removes all common Arabic diacritics (tashkeel),
    // including Shadda, and various Quranic annotation marks.
    // It is designed to clean the text for display without altering the base letters.
    const diacriticsRegex = /[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
    cleaned = cleaned.replace(diacriticsRegex, '');

    // Also remove Tatweel (Kashida), which is used for justification.
    cleaned = cleaned.replace(/ـ/g, '');
    
    return cleaned.trim();
};
