import React from 'react';
import { RefreshIcon } from './icons';

interface UpdateNotificationProps {
  onUpdate: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onUpdate }) => {
  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 px-6 py-3 bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full shadow-lg animate-fade-in z-50"
    >
      <span className="font-semibold">تحديث جديد متوفر!</span>
      <button
        onClick={onUpdate}
        className="flex items-center gap-2 px-4 py-1 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-colors"
      >
        <RefreshIcon className="w-5 h-5" />
        <span>تحديث الآن</span>
      </button>
    </div>
  );
};

export default UpdateNotification;
