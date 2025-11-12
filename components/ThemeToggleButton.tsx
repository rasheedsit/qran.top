import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { SparklesIcon } from './icons';

const ThemeToggleButton: React.FC = () => {
  const { cycleTheme, name, nextThemeName, nextThemePrimaryColor } = useTheme();

  return (
    <button
      onClick={cycleTheme}
      className="w-12 h-12 flex items-center justify-center rounded-full transition-colors duration-300 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary"
      aria-label={`تغيير الوضع إلى ${nextThemeName}`}
      title={`الوضع الحالي: ${name}. اضغط للتغيير إلى وضع ${nextThemeName}.`}
      style={{ backgroundColor: nextThemePrimaryColor }}
    >
      <SparklesIcon className="w-6 h-6 text-white" />
    </button>
  );
};

export default ThemeToggleButton;