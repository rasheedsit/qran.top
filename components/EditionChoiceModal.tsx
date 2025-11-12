import React, { useState } from 'react';
import { BookOpenIcon, SearchIcon } from './icons.tsx';

interface EditionChoiceModalProps {
    onSelect: (editionIdentifier: string, dontShowAgain: boolean) => void;
}

const EditionChoiceModal: React.FC<EditionChoiceModalProps> = ({ onSelect }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edition-choice-title"
        >
            <div
                className="bg-surface rounded-lg shadow-xl w-full max-w-lg mx-auto p-6 text-center"
            >
                <h2 id="edition-choice-title" className="text-2xl font-bold text-text-primary mb-2">
                    مرحباً بك في QRAN.TOP
                </h2>
                <p className="text-text-secondary mb-6">
                    أي نسخة من المصحف تفضل استخدامها كواجهة أساسية؟ (يمكنك التغيير لاحقاً من الإعدادات)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => onSelect('quran-simple-clean', dontShowAgain)}
                        className="p-4 bg-surface-subtle rounded-lg border-2 border-transparent hover:border-primary hover:bg-surface-active transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <SearchIcon className="w-10 h-10 mx-auto text-primary mb-3 transition-transform group-hover:scale-110" />
                        <h3 className="text-lg font-bold text-text-primary">النسخة الإملائية</h3>
                        <p className="text-sm text-text-muted">ممتازة للبحث الدقيق والنقر على الكلمات.</p>
                    </button>
                    <button
                        onClick={() => onSelect('quran-uthmani', dontShowAgain)}
                        className="p-4 bg-surface-subtle rounded-lg border-2 border-transparent hover:border-primary hover:bg-surface-active transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <BookOpenIcon className="w-10 h-10 mx-auto text-primary mb-3 transition-transform group-hover:scale-110" />
                        <h3 className="text-lg font-bold text-text-primary">الرسم العثماني</h3>
                        <p className="text-sm text-text-muted">مثالية لتجربة قراءة مطابقة للمصحف المطبوع.</p>
                    </button>
                </div>

                <div className="mt-6">
                    <label htmlFor="dont-show-again" className="flex items-center justify-center gap-2 text-sm text-text-secondary cursor-pointer">
                        <input 
                            type="checkbox" 
                            id="dont-show-again"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-4 h-4 text-primary bg-surface border-border-default rounded focus:ring-primary"
                        />
                        <span>لا تظهر هذه الرسالة مرة أخرى</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default EditionChoiceModal;