import React, { useState, useMemo, useEffect } from 'react';
import type { QuranFont, QuranEdition, SurahData } from '../types';
import { CheckIcon, TrashIcon, PlusIcon, CopyIcon, SpinnerIcon, UploadIcon, DownloadIcon, RefreshIcon } from './icons';

interface TadabburGatewayProps {
    onExportNotebook: () => Promise<string>;
    onImportNotebook: (code: string) => Promise<void>;
}

const TadabburGateway: React.FC<TadabburGatewayProps> = ({ onExportNotebook, onImportNotebook }) => {
    const [exportCode, setExportCode] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const [importCode, setImportCode] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    const handleExport = async () => {
        setIsExporting(true);
        setExportError(null);
        setExportCode(null);
        setImportMessage(null);
        try {
            const code = await onExportNotebook();
            setExportCode(code);
        } catch (err) {
            setExportError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
        } finally {
            setIsExporting(false);
        }
    };
    
    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsImporting(true);
        setImportMessage(null);
        setExportError(null);
        setExportCode(null);
        try {
            await onImportNotebook(importCode);
            setImportMessage({ type: 'success', text: 'تم استيراد الدفتر بنجاح وحذف النسخة من الخادم.' });
            setImportCode('');
        } catch (err) {
            setImportMessage({ type: 'error', text: err instanceof Error ? err.message : 'حدث خطأ غير متوقع' });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-200">بوابة دفتر التدبر</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">استخدم هذه الواجهة لنقل بياناتك المحفوظة بين الأجهزة المختلفة.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
                    <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">تصدير دفتر التدبر</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow">
                        أنشئ كوداً مؤقتاً لنقل دفترك إلى جهاز آخر. عند إنشاء كود جديد، يتم حذف أي كود قديم.
                    </p>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-colors"
                    >
                        {isExporting ? <SpinnerIcon className="w-5 h-5"/> : <UploadIcon className="w-5 h-5" />}
                        <span>{isExporting ? 'جاري إنشاء الكود...' : 'إنشاء كود تصدير'}</span>
                    </button>
                    {exportCode && (
                        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-700 rounded-md text-center">
                            <p className="text-sm text-green-800 dark:text-green-200">انسخ الكود التالي وضعه في جهازك الجديد:</p>
                            <div className="my-2 text-3xl font-mono font-bold tracking-widest text-green-700 dark:text-green-300 select-all">
                                {exportCode}
                            </div>
                        </div>
                    )}
                    {exportError && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-md text-sm">
                            {exportError}
                        </div>
                    )}
                </div>
                <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
                    <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">استيراد دفتر التدبر</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow">
                        أدخل الكود المكون من 6 رموز (3 أحرف ثم 3 أرقام) الذي حصلت عليه من جهازك القديم.
                    </p>
                    <form onSubmit={handleImport}>
                        <input
                            type="text"
                            value={importCode}
                            onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            placeholder="XYZ123"
                            className="w-full p-3 text-2xl font-mono tracking-widest text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                        />
                        <button
                            type="submit"
                            disabled={isImporting || importCode.length !== 6}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 transition-colors"
                        >
                            {isImporting ? <SpinnerIcon className="w-5 h-5"/> : <DownloadIcon className="w-5 h-5" />}
                            <span>{isImporting ? 'جاري الاستيراد...' : 'استيراد الدفتر'}</span>
                        </button>
                    </form>
                    {importMessage && (
                        <div className={`mt-4 p-3 rounded-md text-sm ${importMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200'}`}>
                            {importMessage.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
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


const ExportFormatSettings: React.FC = () => {
    const [template, setTemplate] = useState(DEFAULT_EXPORT_TEMPLATE);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        const savedTemplate = localStorage.getItem(EXPORT_TEMPLATE_KEY);
        if (savedTemplate) {
            setTemplate(savedTemplate);
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem(EXPORT_TEMPLATE_KEY, template);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    const handleReset = () => {
        if (window.confirm("هل أنت متأكد من إعادة القالب إلى الوضع الافتراضي؟")) {
            setTemplate(DEFAULT_EXPORT_TEMPLATE);
            localStorage.setItem(EXPORT_TEMPLATE_KEY, DEFAULT_EXPORT_TEMPLATE);
        }
    };
    
    return (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-200">ضبط تنسيق ملف البحث</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">خصص شكل المخرجات النصية عند استخدام أدوات 'نسخ كل النتائج' أو 'تحميل النتائج'. استخدم المتغيرات المتاحة لتضمين البيانات التي تحتاجها بالترتيب الذي تفضله.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">محرر القالب</h3>
                    <textarea
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        className="w-full h-80 p-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                        dir="ltr"
                        aria-label="محرر قالب التصدير"
                    />
                    <div className="flex items-center gap-3 mt-4">
                        <button onClick={handleSave} className="flex-grow flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors">
                            <CheckIcon className="w-5 h-5"/>
                            <span>حفظ القالب</span>
                        </button>
                        <button onClick={handleReset} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors">
                            <RefreshIcon className="w-5 h-5"/>
                            <span>إعادة الضبط</span>
                        </button>
                    </div>
                     {saveSuccess && (
                        <p className="text-green-600 dark:text-green-400 text-sm mt-3 text-center">تم حفظ القالب بنجاح.</p>
                    )}
                </div>
                <div className="p-5">
                     <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">شرح المتغيرات</h3>
                     <div className="space-y-4 text-gray-700 dark:text-gray-300">
                        <div>
                             <h4 className="font-bold text-md mb-1">المتغيرات العامة</h4>
                             <ul className="list-disc pr-5 space-y-1 text-sm">
                                <li><code dir="ltr" className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{`{{query}}`}</code>: كلمة البحث التي أدخلها المستخدم.</li>
                                <li><code dir="ltr" className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{`{{ayah_count}}`}</code>: عدد الآيات في النتائج.</li>
                                <li><code dir="ltr" className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{`{{general_occurrences}}`}</code>: إجمالي تكرارات الكلمة (لبحث النصوص فقط).</li>
                                <li><code dir="ltr" className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{`{{exact_occurrences}}`}</code>: عدد المطابقات التامة (لبحث النصوص فقط).</li>
                                <li><code dir="ltr" className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{`{{exact_match_status}}`}</code>: حالة خيار التطابق: "مفعل" أو "غير مفعل".</li>
                             </ul>
                        </div>
                        <div>
                             <h4 className="font-bold text-md mb-1">حلقة النتائج</h4>
                             <p className="text-sm mb-2">استخدم هذا الهيكل لتكرار عرض كل آية في النتائج:</p>
                             <code dir="ltr" className="block p-2 bg-gray-200 dark:bg-gray-700 rounded text-sm text-center">{`{{#results}} ... {{/results}}`}</code>
                             <h4 className="font-bold text-md mt-3 mb-1">المتغيرات داخل الحلقة</h4>
                             <ul className="list-disc pr-5 space-y-1 text-sm">
                                <li><code dir="ltr" className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{`{{ayah_text}}`}</code>: نص الآية الكامل.</li>
                                <li><code dir="ltr" className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{`{{surah_name}}`}</code>: اسم السورة.</li>
                                <li><code dir="ltr" className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{`{{ayah_number_in_surah}}`}</code>: رقم الآية داخل السورة.</li>
                             </ul>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};


interface SettingsViewProps {
    allAvailableFonts: QuranFont[];
    selectedFont: string;
    onFontChange: (fontFamily: string) => void;
    activeEditions: QuranEdition[];
    availableEditions: QuranEdition[];
    onAddEdition: (identifier: string) => void;
    onDeleteEdition: (identifier: string) => void;
    allQuranData: { [key: string]: SurahData[] } | null;
    loadingEditions: string[];
    onExportNotebook: () => Promise<string>;
    onImportNotebook: (code: string) => Promise<void>;
    getEditionUrl: (edition: QuranEdition) => string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
    allAvailableFonts, selectedFont, onFontChange,
    activeEditions, availableEditions, onAddEdition, onDeleteEdition,
    allQuranData, loadingEditions, onExportNotebook, onImportNotebook,
    getEditionUrl
}) => {
    type Tab = 'fonts' | 'mushaf' | 'tadabbur' | 'export_format';
    const [activeTab, setActiveTab] = useState<Tab>('fonts');
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [customUrl, setCustomUrl] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    
    // --- Filters State ---
    const [searchFilter, setSearchFilter] = useState('');
    const [languageFilter, setLanguageFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const tabParam = params.get('tab');
        if (tabParam === 'tadabbur' || tabParam === 'fonts' || tabParam === 'mushaf' || tabParam === 'export_format') {
            setActiveTab(tabParam as Tab);
        }
    }, [window.location.hash]);


    const handleFontSelect = (fontFamily: string) => {
        onFontChange(fontFamily);
        setShowSuccessToast(true);
        setTimeout(() => {
            setShowSuccessToast(false);
        }, 2500);
    };
    
    const handleAddFromUrl = () => {
        if(customUrl.trim()){
            onAddEdition(customUrl.trim());
            setCustomUrl('');
        }
    }
    
    const handleCopy = (identifier: string, url: string) => {
        navigator.clipboard.writeText(url).then(() => {
            setCopySuccess(identifier);
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const previewAyahSample = "وَإِذْ جَعَلْنَا الْبَيْتَ مَثَابَةً لِّلنَّاسِ وَأَمْنًا وَاتَّخِذُوا مِن مَّقَامِ إِبْرَاهِيمَ مُصَلًّى ۖ وَعَهِدْنَا إِلَىٰ إِبْرَاهِيمَ وَإِسْمَاعِيلَ أَن طَهِّرَا بَيْتِيَ لِلطَّائِفِينَ وَالْعَاكِفِينَ وَالرُّكَّعِ السُّجُودِ ﴿١٢٥﴾";
    
    const allDisplayEditions = useMemo(() => {
        const textEditions = availableEditions.filter(e => e.format === 'text');
        const editionMap = new Map<string, QuranEdition>();
        textEditions.forEach(e => editionMap.set(e.identifier, e));
        activeEditions.forEach(e => {
            if (e.format === 'text' && !editionMap.has(e.identifier) && e.identifier.startsWith('http')) {
                editionMap.set(e.identifier, e);
            }
        });
        return Array.from(editionMap.values()).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
    }, [availableEditions, activeEditions]);

    const filterOptions = useMemo(() => {
        const languages = new Map<string, string>();
        const types = new Map<string, string>();
        
        const languageNames: { [key: string]: string } = {
            ar: 'العربية', en: 'الإنجليزية', fr: 'الفرنسية', es: 'الإسبانية', ru: 'الروسية', de: 'الألمانية', tr: 'التركية', ur: 'الأردية',
            id: 'الإندونيسية', ms: 'الماليزية', bn: 'البنغالية', fa: 'الفارسية', ha: 'الهوسا', so: 'الصومالية', sq: 'الألبانية', sv: 'السويدية',
            sw: 'السواحيلية', ta: 'التاميلية', tg: 'الطاجيكية', tt: 'التترية', ug: 'الأويغورية', uz: 'الأوزبكية', zh: 'الصينية',
        };
        
        const typeNames: { [key: string]: string } = {
            quran: 'قرآن', tafsir: 'تفسير', translation: 'ترجمة',
        };

        allDisplayEditions.forEach(e => {
            languages.set(e.language, languageNames[e.language] || e.language.toUpperCase());
            types.set(e.type, typeNames[e.type] || e.type);
        });

        return {
            languages: Array.from(languages.entries()).sort((a,b) => a[1].localeCompare(b[1], 'ar')),
            types: Array.from(types.entries()).sort((a,b) => a[1].localeCompare(b[1], 'ar'))
        };
    }, [allDisplayEditions]);

    const filteredEditions = useMemo(() => {
        return allDisplayEditions.filter(edition => {
            const searchLower = searchFilter.toLowerCase().trim();
            if (searchLower) {
                const nameMatch = edition.name.toLowerCase().includes(searchLower);
                const englishNameMatch = edition.englishName.toLowerCase().includes(searchLower);
                const identifierMatch = edition.identifier.toLowerCase().includes(searchLower);
                if (!nameMatch && !englishNameMatch && !identifierMatch) {
                    return false;
                }
            }
            if (languageFilter !== 'all' && edition.language !== languageFilter) return false;
            if (typeFilter !== 'all' && edition.type !== typeFilter) return false;
            return true;
        });
    }, [allDisplayEditions, searchFilter, languageFilter, typeFilter]);


    return (
        <div className="animate-fade-in w-full max-w-5xl mx-auto px-4">
            <main className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md transition-colors duration-300 relative">
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                    <button
                        onClick={() => setActiveTab('fonts')}
                        className={`px-4 py-3 text-lg font-semibold transition-colors ${
                            activeTab === 'fonts'
                                ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                        aria-current={activeTab === 'fonts'}
                    >
                        الخطوط
                    </button>
                    <button
                        onClick={() => setActiveTab('mushaf')}
                        className={`px-4 py-3 text-lg font-semibold transition-colors ${
                            activeTab === 'mushaf'
                                ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                        aria-current={activeTab === 'mushaf'}
                    >
                        المصادر النصية
                    </button>
                    <button
                        onClick={() => setActiveTab('tadabbur')}
                        className={`px-4 py-3 text-lg font-semibold transition-colors ${
                            activeTab === 'tadabbur'
                                ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                        aria-current={activeTab === 'tadabbur'}
                    >
                        دفتر التدبر
                    </button>
                    <button
                        onClick={() => setActiveTab('export_format')}
                        className={`px-4 py-3 text-lg font-semibold transition-colors ${
                            activeTab === 'export_format'
                                ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                        aria-current={activeTab === 'export_format'}
                    >
                        ضبط تنسيق ملف البحث
                    </button>
                </div>

                <div>
                    {activeTab === 'fonts' && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
                                معرض الخطوط
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">
                                انقر على البطاقة التي تعجبك لتطبيق الخط مباشرة على مستوى التطبيق.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {allAvailableFonts.map((font) => {
                                    const isSelected = selectedFont === font.font_family;
                                    return (
                                        <button
                                            key={font.font_family}
                                            onClick={() => handleFontSelect(font.font_family)}
                                            className={`p-4 border-2 rounded-lg text-right transition-all duration-200 cursor-pointer ${
                                                isSelected
                                                    ? 'border-green-500 bg-green-50/50 dark:bg-green-900/30 ring-2 ring-green-500/50'
                                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-green-400 dark:hover:border-green-600 hover:shadow-md'
                                            }`}
                                            aria-pressed={isSelected}
                                            aria-label={`تطبيق خط ${font.name}`}
                                        >
                                            <p
                                                className="text-xl text-gray-900 dark:text-gray-50 min-h-[140px] flex items-center justify-center"
                                                style={{ fontFamily: `"${font.font_family}", 'Uthman', 'Amiri Quran', serif`, lineHeight: 2.2 }}
                                            >
                                                {previewAyahSample}
                                            </p>
                                            <span className="block text-center mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                {font.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {activeTab === 'mushaf' && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
                                إدارة المصادر النصية (التفاسير والترجمات)
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                أضف أو أزل نسخ القرآن والتفاسير. المصادر النشطة تظهر في قائمة الاختيار في الصفحة الرئيسية.
                            </p>

                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                    <div className="sm:col-span-1">
                                        <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بحث</label>
                                        <input
                                            type="text"
                                            id="search-filter"
                                            value={searchFilter}
                                            onChange={e => setSearchFilter(e.target.value)}
                                            placeholder="ابحث بالاسم أو المعرّف..."
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="lang-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اللغة</label>
                                        <select
                                            id="lang-filter"
                                            value={languageFilter}
                                            onChange={e => setLanguageFilter(e.target.value)}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="all">كل اللغات</option>
                                            {filterOptions.languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النوع</label>
                                        <select
                                            id="type-filter"
                                            value={typeFilter}
                                            onChange={e => setTypeFilter(e.target.value)}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="all">كل الأنواع</option>
                                            {filterOptions.types.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setSearchFilter('');
                                            setLanguageFilter('all');
                                            setTypeFilter('all');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-sm font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                    >
                                        <RefreshIcon className="w-4 h-4" />
                                        <span>إعادة تعيين الفلاتر</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredEditions.map((edition) => {
                                    const isActive = activeEditions.some(e => e.identifier === edition.identifier);
                                    const isDefault = edition.identifier === 'quran-simple-clean' || edition.identifier === 'quran-uthmani';
                                    const isLoading = loadingEditions.includes(edition.identifier);

                                    const editionData = allQuranData && isActive ? allQuranData[edition.identifier] : null;
                                    const surahBaqarah = editionData ? editionData.find(s => s.number === 2) : null;
                                    const ayah125 = surahBaqarah ? surahBaqarah.ayahs.find(a => a.numberInSurah === 125) : null;
                                    const previewText = ayah125 ? (ayah125.text || '').replace(/\s*﴿\d+﴾\s*/g, ' ').trim() : "أضف المصدر لرؤية المعاينة";

                                    return (
                                        <div key={edition.identifier} className={`border-2 rounded-lg flex flex-col justify-between transition-all duration-200 ${isActive ? 'border-green-500 bg-green-50/50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'}`}>
                                            <div className="p-4">
                                                <div className={`text-right text-lg text-gray-800 dark:text-gray-100 min-h-[120px] p-2 rounded-md bg-white dark:bg-gray-800 overflow-auto flex items-center justify-center`}>
                                                    {isLoading ? <SpinnerIcon className="w-8 h-8 text-green-600"/> : <p className={!isActive ? 'opacity-50' : ''}>{previewText}</p>}
                                                </div>
                                            </div>
                                            <div className="p-4 border-t-2 border-gray-200 dark:border-gray-700 space-y-3">
                                                <div>
                                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-200">{edition.name}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{edition.englishName}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-full text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded-md break-all">{edition.identifier}</div>
                                                    <button onClick={() => handleCopy(edition.identifier, getEditionUrl(edition))} className="flex-shrink-0 p-2 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md">
                                                        {copySuccess === edition.identifier ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                {isActive ? (
                                                    <button onClick={() => onDeleteEdition(edition.identifier)} disabled={isDefault} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:bg-red-400 dark:disabled:bg-red-800 disabled:cursor-not-allowed transition-colors">
                                                        <TrashIcon className="w-5 h-5"/>
                                                        <span>حذف</span>
                                                    </button>
                                                ) : (
                                                    <button onClick={() => onAddEdition(edition.identifier)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors">
                                                        <PlusIcon className="w-5 h-5"/>
                                                        <span>إضافة</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex flex-col justify-center">
                                    <h3 className="text-md font-bold text-gray-800 dark:text-gray-200 mb-2 text-center">إضافة مصدر مخصص</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">أضف رابط URL لملف JSON متوافق.</p>
                                    <input type="url" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://example.com/quran.json" className="w-full text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600 mb-3 focus:ring-green-500 focus:border-green-500" />
                                    <button onClick={handleAddFromUrl} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
                                        <PlusIcon className="w-5 h-5"/>
                                        <span>إضافة الرابط</span>
                                    </button>
                                </div>
                            </div>
                            {filteredEditions.length === 0 && (
                                <div className="mt-6 text-center py-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <p className="text-lg font-semibold">لم يتم العثور على مصادر تطابق معايير الفلترة.</p>
                                    <p>حاول تغيير البحث أو إعادة تعيين الفلاتر.</p>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'tadabbur' && (
                        <TadabburGateway 
                            onExportNotebook={onExportNotebook}
                            onImportNotebook={onImportNotebook}
                        />
                    )}
                    {activeTab === 'export_format' && (
                        <ExportFormatSettings />
                    )}
                </div>
                
                <div
                    role="status"
                    aria-live="assertive"
                    className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full shadow-lg transition-all duration-300 ${
                        showSuccessToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                >
                    <CheckIcon className="w-6 h-6 text-green-400 dark:text-green-600" />
                    <span className="font-semibold">تم تطبيق الخط بنجاح!</span>
                </div>

            </main>
        </div>
    );
};

export default SettingsView;