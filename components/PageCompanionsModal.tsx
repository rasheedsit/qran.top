import React from 'react';
import type { Ayah } from '../types';
import { ClearIcon, DocumentDuplicateIcon } from './icons';

interface PageCompanionsModalProps {
    data: {
        page: number;
        ayahs: Ayah[];
    };
    onClose: () => void;
}

const PageCompanionsModal: React.FC<PageCompanionsModalProps> = ({ data, onClose }) => {
    
    const handleAyahClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const href = e.currentTarget.getAttribute('href');
        if (href) {
            window.location.hash = href;
        }
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-companions-title"
        >
            <div 
                className="bg-surface rounded-lg shadow-xl w-full max-w-2xl mx-auto flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-border-default flex justify-between items-center flex-shrink-0">
                    <h2 id="page-companions-title" className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <DocumentDuplicateIcon className="w-6 h-6 text-blue-600" />
                        رفقاء الصفحة رقم {data.page}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-hover" aria-label="إغلاق">
                        <ClearIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <ul className="space-y-4">
                        {data.ayahs.map(ayah => (
                            <li key={ayah.number} className="border-b border-border-subtle pb-3 last:border-b-0">
                                <a 
                                    href={`#/surah/${ayah.surah!.number}?ayah=${ayah.numberInSurah}`}
                                    onClick={handleAyahClick}
                                    className="block p-2 rounded-md hover:bg-surface-subtle"
                                >
                                    <p className="font-quran text-lg text-text-primary mb-1" dir="rtl">
                                        {ayah.text}
                                    </p>
                                    <p className="text-sm font-bold text-primary-text">
                                        {ayah.surah?.name} - الآية {ayah.numberInSurah}
                                    </p>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default PageCompanionsModal;