import React, { useState, useEffect, useRef } from 'react';
import type { QuranFont, QuranEdition, FontSize, BrowsingMode } from '../types.ts';
import { ArrowLeftIcon, ArrowRightIcon, HomeIcon, TextSizeIcon, PlusIcon, MinusIcon, SparklesIcon, BookOpenIcon, CheckIcon, DocumentDuplicateIcon, QueueListIcon, ComputerDesktopIcon } from './icons.tsx';

interface ToolboxProps {
    // Font Size
    fontSize: FontSize;
    onFontSizeChange: (size: FontSize) => void;
    // Font Family
    availableFonts: QuranFont[];
    selectedFont: string;
    onFontChange: (fontFamily: string) => void;
    // Editions
    activeEditions: QuranEdition[];
    selectedEdition: string;
    onEditionChange: (id: string) => void;
    isAudioPlayerVisible: boolean;
    // Browsing Mode
    browsingMode: BrowsingMode;
    onBrowsingModeChange: (mode: BrowsingMode) => void;
}

const Toolbox: React.FC<ToolboxProps> = ({
    fontSize, onFontSizeChange,
    availableFonts, selectedFont, onFontChange,
    activeEditions, selectedEdition, onEditionChange,
    isAudioPlayerVisible,
    browsingMode, onBrowsingModeChange
}) => {
    type Popover = 'size' | 'font' | 'edition';
    const [openPopover, setOpenPopover] = useState<Popover | null>(null);
    const [isShown, setIsShown] = useState(true);
    const popoverRef = useRef<HTMLDivElement>(null);
    const lastScrollY = useRef(0);

    // Effect to handle toolbox visibility on scroll
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const scrollThreshold = 20;

            // Do nothing if scroll change is insignificant
            if (Math.abs(currentScrollY - lastScrollY.current) < scrollThreshold) {
                return;
            }
            
            if (currentScrollY < 100) { // Always show near the top
                setIsShown(true);
            } else if (currentScrollY > lastScrollY.current) { // Scrolling down
                setIsShown(false);
                setOpenPopover(null); // Hide popovers when toolbar hides
            } else { // Scrolling up
                setIsShown(true);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close popover on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setOpenPopover(null);
            }
        };
        if (openPopover) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openPopover]);

    const handleTogglePopover = (popover: Popover) => {
        setOpenPopover(prev => (prev === popover ? null : popover));
    };

    const handleSelectAndClose = (setter: (value: string) => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
        setter(event.currentTarget.value);
        setOpenPopover(null);
    };
    
    const ToolButton: React.FC<{ onClick: () => void; label: string; children: React.ReactNode; isActive?: boolean }> = ({ onClick, label, children, isActive }) => (
        <button
            onClick={onClick}
            aria-label={label}
            title={label}
            className={`p-3 rounded-full transition-colors ${isActive ? 'bg-surface-active text-primary-text-strong' : 'text-text-muted hover:bg-surface-hover'}`}
        >
            {children}
        </button>
    );

    const PopoverContainer: React.FC<{ children: React.ReactNode; popoverId: Popover, title: string, widthClass?: string }> = ({ children, popoverId, title, widthClass = 'w-72' }) => (
        openPopover === popoverId ? (
            <div ref={popoverRef} className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 ${widthClass} bg-surface rounded-lg shadow-2xl ring-1 ring-black/5 animate-fade-in`}
                role="dialog" aria-labelledby={`${popoverId}-title`}>
                <div className="p-3 border-b border-border-default">
                    <h3 id={`${popoverId}-title`} className="font-semibold text-text-primary">{title}</h3>
                </div>
                <div className="p-3 max-h-64 overflow-y-auto">
                    {children}
                </div>
                <div className={`absolute left-1/2 -translate-x-1/2 bottom-[-8px] w-4 h-4 bg-surface rotate-45 -z-10`}></div>
            </div>
        ) : null
    );

    return (
        <div className={`fixed left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ${isAudioPlayerVisible ? 'bottom-28' : 'bottom-8'}`}>
            <div className={`relative flex items-center gap-1 bg-surface/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-border-default transition-all duration-300 ${
                isShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'
            }`}>
                
                {/* Navigation Group */}
                <ToolButton onClick={() => window.history.back()} label="الخلف"><ArrowRightIcon className="w-5 h-5" /></ToolButton>
                <ToolButton onClick={() => window.location.hash = '#/'} label="الرئيسية"><HomeIcon className="w-5 h-5" /></ToolButton>
                <ToolButton onClick={() => window.history.forward()} label="الأمام"><ArrowLeftIcon className="w-5 h-5" /></ToolButton>
                
                <div className="h-6 w-px bg-border-default mx-2"></div>

                {/* Settings Group */}
                <div className="relative">
                    <ToolButton onClick={() => handleTogglePopover('size')} label="حجم الخط" isActive={openPopover === 'size'}>
                        <TextSizeIcon className="w-5 h-5" />
                    </ToolButton>
                    <PopoverContainer popoverId="size" title="تغيير حجم الخط" widthClass="w-auto">
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => onFontSizeChange('sm')}
                                className={`p-3 w-16 h-12 flex items-center justify-center rounded-lg transition-colors ${fontSize === 'sm' ? 'bg-surface-active text-primary-text-strong' : 'bg-surface-subtle hover:bg-surface-hover'}`}
                                aria-pressed={fontSize === 'sm'}
                                title="صغير"
                            >
                                <span className="text-sm font-bold">A</span>
                            </button>
                            <button
                                onClick={() => onFontSizeChange('md')}
                                className={`p-3 w-16 h-12 flex items-center justify-center rounded-lg transition-colors ${fontSize === 'md' ? 'bg-surface-active text-primary-text-strong' : 'bg-surface-subtle hover:bg-surface-hover'}`}
                                aria-pressed={fontSize === 'md'}
                                title="متوسط"
                            >
                                <span className="text-lg font-bold">A</span>
                            </button>
                            <button
                                onClick={() => onFontSizeChange('lg')}
                                className={`p-3 w-16 h-12 flex items-center justify-center rounded-lg transition-colors ${fontSize === 'lg' ? 'bg-surface-active text-primary-text-strong' : 'bg-surface-subtle hover:bg-surface-hover'}`}
                                aria-pressed={fontSize === 'lg'}
                                title="كبير"
                            >
                                <span className="text-xl font-bold">A</span>
                            </button>
                        </div>
                    </PopoverContainer>
                </div>
                
                <div className="relative">
                    <ToolButton onClick={() => handleTogglePopover('font')} label="تغيير الخط" isActive={openPopover === 'font'}>
                        <SparklesIcon className="w-5 h-5" />
                    </ToolButton>
                     <PopoverContainer popoverId="font" title="اختر الخط">
                        <div className="space-y-1">
                            {availableFonts.map(font => (
                                <button key={font.font_family} onClick={handleSelectAndClose(onFontChange)} value={font.font_family}
                                    className="w-full text-right p-2 rounded-md flex justify-between items-center text-text-primary hover:bg-surface-hover transition-colors">
                                    <span style={{ fontFamily: `"${font.font_family}", sans-serif` }}>{font.name}</span>
                                    {selectedFont === font.font_family && <CheckIcon className="w-5 h-5 text-primary" />}
                                </button>
                            ))}
                        </div>
                    </PopoverContainer>
                </div>

                 <div className="relative">
                    <ToolButton onClick={() => handleTogglePopover('edition')} label="تغيير المصحف" isActive={openPopover === 'edition'}>
                        <BookOpenIcon className="w-5 h-5" />
                    </ToolButton>
                     <PopoverContainer popoverId="edition" title="اختر نسخة العرض">
                        <div className="space-y-1">
                            {activeEditions.map(edition => (
                                <button key={edition.identifier} onClick={handleSelectAndClose(onEditionChange)} value={edition.identifier}
                                    className="w-full text-right p-2 rounded-md flex justify-between items-center text-text-primary hover:bg-surface-hover transition-colors">
                                    <span>{edition.name}</span>
                                    {selectedEdition === edition.identifier && <CheckIcon className="w-5 h-5 text-primary" />}
                                </button>
                            ))}
                        </div>
                    </PopoverContainer>
                </div>
                
                <div className="h-6 w-px bg-border-default mx-2"></div>

                {/* Browsing Mode Group */}
                <ToolButton
                    onClick={() => onBrowsingModeChange(browsingMode === 'full' ? 'page' : 'full')}
                    label={browsingMode === 'full' ? 'التحويل إلى عرض الصفحات' : 'التحويل إلى العرض الكامل'}
                >
                    {browsingMode === 'full' ? <DocumentDuplicateIcon className="w-5 h-5" /> : <QueueListIcon className="w-5 h-5" />}
                </ToolButton>

            </div>
        </div>
    );
};

export default Toolbox;