import React, { useState } from 'react';
import type { SurahReference } from '../types.ts';
import SurahListItem from './SurahListItem.tsx';
import IndexItem from './IndexItem.tsx';
import { BookOpenIcon, QueueListIcon, JuzOneIcon } from './icons.tsx';

interface HomeViewProps {
  surahList: SurahReference[];
  juzList: { number: number; startAyah: number; startSurah: number; startSurahName: string }[];
  hizbList: { number: number; startAyah: number; startSurah: number; startSurahName: string }[];
}

type ActiveTab = 'surahs' | 'juz' | 'hizbs';

const HomeView: React.FC<HomeViewProps> = ({ surahList, juzList, hizbList }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('surahs');

  const TabButton: React.FC<{ tab: ActiveTab; label: string; icon: React.ReactNode }> = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 flex items-center justify-center gap-3 py-3 text-lg font-semibold transition-all duration-200 border-b-4 ${
        activeTab === tab
          ? 'text-primary border-primary'
          : 'text-text-muted border-transparent hover:text-text-primary hover:border-border-default'
      }`}
      aria-current={activeTab === tab}
    >
        {icon}
        <span>{label}</span>
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'juz':
        return juzList.map(juz => (
          <IndexItem
            key={`juz-${juz.number}`}
            type="الجزء"
            number={juz.number}
            startSurah={juz.startSurah}
            startAyah={juz.startAyah}
            startSurahName={juz.startSurahName}
          />
        ));
      case 'hizbs':
        return hizbList.map(hizb => (
          <IndexItem
            key={`hizb-${hizb.number}`}
            type="الحزب"
            number={hizb.number}
            startSurah={hizb.startSurah}
            startAyah={hizb.startAyah}
            startSurahName={hizb.startSurahName}
          />
        ));
      case 'surahs':
      default:
        return surahList.map(surah => (
          <SurahListItem key={surah.number} surah={surah} />
        ));
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 animate-fade-in">
      <div className="mb-6 bg-surface rounded-lg shadow-sm border border-border-default overflow-hidden">
        <div className="flex items-stretch">
            <TabButton tab="surahs" label="السور" icon={<BookOpenIcon className="w-6 h-6"/>} />
            <TabButton tab="juz" label="الأجزاء" icon={<JuzOneIcon className="w-6 h-6"/>} />
            <TabButton tab="hizbs" label="الأحزاب" icon={<QueueListIcon className="w-6 h-6"/>} />
        </div>
      </div>

      <div className="animate-fade-in">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3">
            {renderContent()}
        </ul>
      </div>
    </div>
  );
};

export default HomeView;