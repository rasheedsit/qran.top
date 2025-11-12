import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { SendIcon, UserCircleIcon } from '../icons';

interface CommentFormProps {
    onSubmit: (text: string) => Promise<void>;
    onCancel?: () => void;
    placeholder?: string;
}

const MIN_SUBMIT_TIME_MS = 3000; // 3 seconds

const CommentForm: React.FC<CommentFormProps> = ({ onSubmit, onCancel, placeholder="أضف تعليقك هنا..." }) => {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // --- Anti-bot State ---
    const [honeypot, setHoneypot] = useState(''); // Honeypot field
    const [formLoadTime, setFormLoadTime] = useState(0); // Time check
    const [sliderValue, setSliderValue] = useState(0); // Slider interaction

    const isVerifiedBySlider = sliderValue >= 100;

    useEffect(() => {
        // Record the time when the form is first displayed
        setFormLoadTime(Date.now());
    }, []);

    const resetForm = () => {
        setText('');
        setHoneypot('');
        setSliderValue(0);
        setFormLoadTime(Date.now()); // Reset timer for next comment
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // --- Anti-bot Verification ---
        // 1. Honeypot Check: If this hidden field is filled, it's a bot.
        if (honeypot) {
            console.warn("Honeypot field filled. Submission blocked.");
            return; 
        }

        // 2. Time Check: If the form is submitted too quickly, it's a bot.
        const submitDuration = Date.now() - formLoadTime;
        if (submitDuration < MIN_SUBMIT_TIME_MS) {
            console.warn(`Form submitted too quickly (${submitDuration}ms). Submission blocked.`);
            alert("تم الإرسال بسرعة كبيرة جداً. يرجى المحاولة مرة أخرى.");
            return;
        }
        
        // 3. Slider Check & Text Check
        if (!text.trim() || !isVerifiedBySlider) {
            if (!isVerifiedBySlider) {
                alert("الرجاء سحب شريط التمرير للتأكيد.");
            }
            return;
        };

        setIsSubmitting(true);
        try {
            await onSubmit(text);
            resetForm();
            if(onCancel) onCancel();
        } catch (error) {
            console.log("Caught error in form, UI state will be reset.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4">
            {/* 1. Honeypot Field: Hidden from users, visible to bots. */}
            <input 
                type="text" 
                name="website" // A common name to attract bots
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                autoComplete="off"
                tabIndex={-1}
            />
            <div className="flex items-start gap-3">
                 <div className="flex-shrink-0 mt-1">
                    {user && user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                        <UserCircleIcon className="w-10 h-10 text-text-subtle" />
                    )}
                </div>
                <div className="flex-grow">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={user ? `التعليق باسم ${user.displayName}...` : placeholder}
                        className="w-full p-3 border border-border-default rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition"
                        rows={2}
                        disabled={isSubmitting}
                    />
                </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center mt-3 gap-3">
                {/* 2 & 3. Slider Interaction */}
                <div className="w-full sm:w-auto flex-grow max-w-xs">
                    <label htmlFor="verification-slider" className="text-xs text-center block mb-1 text-text-muted">
                        {isVerifiedBySlider ? 'تم التحقق ✓' : 'اسحب للتأكيد'}
                    </label>
                    <input
                        id="verification-slider"
                        type="range"
                        min="0"
                        max="100"
                        value={sliderValue}
                        onChange={(e) => setSliderValue(Number(e.target.value))}
                        className={`w-full h-3 rounded-full appearance-none cursor-pointer transition-colors ${isVerifiedBySlider ? 'bg-green-200 dark:bg-green-800 accent-green-500' : 'bg-surface-subtle accent-primary'}`}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="flex items-center gap-2 self-end">
                     {onCancel && (
                        <button 
                            type="button" 
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-semibold text-text-secondary rounded-md hover:bg-surface-hover transition-colors"
                        >
                            إلغاء
                        </button>
                    )}
                    <button 
                        type="submit" 
                        disabled={isSubmitting || !text.trim() || !isVerifiedBySlider}
                        className="px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <SendIcon className="w-5 h-5"/>
                        <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال'}</span>
                    </button>
                </div>
            </div>
        </form>
    );
};

export default CommentForm;