import React from 'react';

const TopProgressBar: React.FC<{ isSearching: boolean }> = ({ isSearching }) => {
  return (
    <div
      role="progressbar"
      aria-hidden={!isSearching}
      aria-valuetext={isSearching ? 'جاري البحث' : 'مكتمل'}
      className={`fixed top-0 left-0 right-0 h-1 z-50 bg-green-200/50 dark:bg-green-800/50 overflow-hidden transition-opacity duration-300 ${
        isSearching ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="h-full bg-green-500 animate-progress-indeterminate"></div>
      <style>{`
        @keyframes progress-animation {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        .animate-progress-indeterminate {
          width: 50%;
          animation: progress-animation 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default TopProgressBar;
