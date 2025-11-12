import React, { useState } from 'react';
import type { Collections, SavedItem, Collection } from '../types';
import { BookmarkIcon, ArrowLeftIcon, TrashIcon, SearchIcon, BookOpenIcon, UploadIcon, PencilIcon, CheckIcon } from './icons';

interface SavedViewProps {
    collections: Collections;
    collectionId: string | null;
    onDeleteCollection: (collectionId: string) => void;
    onDeleteSavedItem: (collectionId: string, itemId: string) => void;
    onUpdateNotes: (collectionId: string, itemId: string, notes: string) => void;
}

const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `منذ ${Math.floor(interval)} سنوات`;
    interval = seconds / 2592000;
    if (interval > 1) return `منذ ${Math.floor(interval)} شهر`;
    interval = seconds / 86400;
    if (interval > 1) return `منذ ${Math.floor(interval)} أيام`;
    interval = seconds / 3600;
    if (interval > 1) return `منذ ${Math.floor(interval)} ساعات`;
    interval = seconds / 60;
    if (interval > 1) return `منذ ${Math.floor(interval)} دقائق`;
    return 'الآن';
};

const SavedItemCard: React.FC<{ 
    item: SavedItem, 
    onDelete: () => void,
    onUpdateNotes: (notes: string) => void,
}> = ({ item, onDelete, onUpdateNotes }) => {
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [noteText, setNoteText] = useState(item.notes || '');
    
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.location.hash = e.currentTarget.getAttribute('href')!;
    };
    
    const handleSaveNote = () => {
        onUpdateNotes(noteText.trim());
        setIsEditingNotes(false);
    };

    const handleCancelEdit = () => {
        setNoteText(item.notes || '');
        setIsEditingNotes(false);
    };
    
    return (
        <div className="bg-surface-subtle p-4 rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-lg flex flex-col gap-3">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 text-primary mt-1">
                    {item.type === 'ayah' ? <BookOpenIcon className="w-5 h-5"/> : <SearchIcon className="w-5 h-5"/>}
                </div>
                <div className="flex-grow">
                    {item.type === 'ayah' && (
                        <a href={`#/surah/${item.surah}?ayah=${item.ayah}`} onClick={handleClick} className="block hover:underline">
                            <p className="font-quran text-lg text-text-primary">{item.text}</p>
                            <p className="text-sm font-bold text-primary-text mt-1 font-quran-title">سورة {item.surah} : الآية {item.ayah}</p>
                        </a>
                    )}
                    {item.type === 'search' && (
                         <a href={`#/search/${encodeURIComponent(item.query)}`} onClick={handleClick} className="block hover:underline">
                            <p className="font-semibold text-lg text-text-primary">بحث عن: "{item.query}"</p>
                        </a>
                    )}
                    <p className="text-xs text-text-subtle mt-2">{timeAgo(item.createdAt)}</p>
                </div>
                 <button 
                    onClick={onDelete} 
                    className="p-2 -m-2 rounded-full text-text-subtle hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex-shrink-0"
                    title="حذف العنصر"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
            
            {/* --- Tadabbur Notes Section --- */}
            <div className="border-t border-border-default pt-3">
                {isEditingNotes ? (
                    <div>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="اكتب تدبرك هنا..."
                            className="w-full p-2 border border-border-default rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                            rows={4}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={handleCancelEdit} className="px-4 py-2 text-sm rounded-md bg-surface-subtle hover:bg-surface-hover transition-colors">
                                إلغاء
                            </button>
                            <button onClick={handleSaveNote} className="px-4 py-2 text-sm text-white rounded-md bg-primary hover:bg-primary-hover flex items-center gap-2">
                                <CheckIcon className="w-4 h-4" />
                                <span>حفظ التدبر</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-between items-start gap-2">
                        {item.notes ? (
                            <blockquote className="text-text-secondary whitespace-pre-wrap flex-grow italic border-r-4 border-primary pr-4 py-1">
                                {item.notes}
                            </blockquote>
                        ) : (
                            <p className="text-sm text-text-muted flex-grow py-1">لا توجد ملاحظات.</p>
                        )}
                        <button 
                            onClick={() => setIsEditingNotes(true)} 
                            className="p-2 -m-2 rounded-full text-text-subtle hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex-shrink-0" 
                            title={item.notes ? "تعديل التدبر" : "إضافة تدبر"}
                        >
                            <PencilIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const SavedView: React.FC<SavedViewProps> = ({ collections, collectionId, onDeleteCollection, onDeleteSavedItem, onUpdateNotes }) => {
    
    const collectionList = Object.values(collections).sort((a: Collection, b: Collection) => b.createdAt - a.createdAt);

    const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.location.hash = e.currentTarget.getAttribute('href')!;
    };
    
    // Detailed view for a single collection
    if (collectionId && collections[collectionId]) {
        const collection = collections[collectionId];
        return (
             <div className="animate-fade-in w-full max-w-4xl mx-auto px-4">
                 <div className="mb-4">
                    <a href="#/saved" onClick={handleHomeClick} className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-primary">
                        <ArrowLeftIcon className="w-5 h-5" />
                        العودة إلى كل المجموعات
                    </a>
                 </div>
                 <main className="bg-surface p-6 sm:p-8 rounded-lg shadow-md">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-primary-text-strong">{collection.name}</h1>
                            <p className="text-sm text-text-muted">{collection.items.length} عنصر</p>
                        </div>
                         <button onClick={() => onDeleteCollection(collectionId)} className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-full hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50" title="حذف المجموعة">
                           <TrashIcon className="w-6 h-6" />
                        </button>
                     </div>
                     {collection.items.length > 0 ? (
                        <ul className="space-y-4">
                            {collection.items.map(item => (
                                <li key={item.id}>
                                    <SavedItemCard 
                                        item={item} 
                                        onDelete={() => onDeleteSavedItem(collectionId, item.id)}
                                        onUpdateNotes={(notes) => onUpdateNotes(collectionId, item.id, notes)}
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <div className="text-center p-10 text-text-muted">
                            <h2 className="text-2xl font-bold mb-2">المجموعة فارغة</h2>
                            <p>لم تقم بإضافة أي آيات أو أبحاث لهذه المجموعة بعد.</p>
                         </div>
                    )}
                </main>
            </div>
        );
    }

    // Main view for all collections
    return (
        <div className="animate-fade-in w-full max-w-4xl mx-auto px-4">
            <div className="mb-8 p-6 bg-surface rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-text-secondary">نقل دفتر التدبر</h2>
                    <p className="text-text-muted mt-1">هل تريد نقل بياناتك المحفوظة إلى جهاز آخر أو استيرادها؟</p>
                </div>
                <a 
                    href="#/settings?tab=tadabbur"
                    onClick={(e) => { e.preventDefault(); window.location.hash = '#/settings?tab=tadabbur'; }}
                    className="flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors flex-shrink-0"
                >
                    <UploadIcon className="w-5 h-5" />
                    <span>الذهاب إلى بوابة الاستيراد والتصدير</span>
                </a>
            </div>
            
            <main>
                {collectionList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* FIX: Add explicit type to collection to fix property does not exist on type unknown error */}
                        {collectionList.map((collection: Collection) => (
                            <a 
                                key={collection.id}
                                href={`#/saved/${collection.id}`}
                                onClick={handleHomeClick}
                                className="block p-5 bg-surface rounded-lg shadow-sm hover:shadow-xl hover:border-primary border-2 border-transparent transition-all duration-200 group"
                            >
                                <h2 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors truncate">{collection.name}</h2>
                                <p className="text-sm text-text-muted mt-1">{collection.items.length} عنصر</p>
                                <p className="text-xs text-text-subtle mt-3">{timeAgo(collection.createdAt)}</p>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-12 bg-surface rounded-lg shadow-md">
                        <BookmarkIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                        <h2 className="mt-4 text-2xl font-bold text-text-primary">دفتر تدبرك فارغ</h2>
                        <p className="mt-2 text-text-muted">
                            يمكنك حفظ الآيات التي تؤثر فيك أو عمليات البحث التي تجريها للعودة إليها لاحقاً.
                            <br/>
                            ابحث عن أيقونة <BookmarkIcon className="w-4 h-4 inline-block text-primary" /> لحفظ العناصر.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SavedView;