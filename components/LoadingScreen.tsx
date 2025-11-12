import React, { useState, useEffect } from 'react';

const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);

  // Effect to simulate loading progress
  useEffect(() => {
    // Start animation immediately
    setProgress(1); 
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 18); // ~1.8 seconds to reach 100

    return () => clearInterval(interval);
  }, []);

  // Calculate the clip-path inset from the top to "fill" the symbol from the bottom
  const fillPercentage = 100 - progress;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background animate-fade-in transition-colors duration-300" role="status" aria-label="جاري تحميل البيانات">
      
      {/* Container for the symbol to position layers */}
      <div className="relative text-8xl md:text-9xl" aria-hidden="true">
        
        {/* Layer 1: The background symbol (grayed out) */}
        <div className="text-gray-200 dark:text-gray-700">
          ۞
        </div>
        
        {/* Layer 2: The foreground symbol with the filling and crystalline effect */}
        <div 
          className="absolute top-0 left-0 w-full h-full crystalline-gradient animate-shine text-transparent bg-clip-text"
          style={{
            clipPath: `inset(${fillPercentage}% 0 0 0)`,
            transition: 'clip-path 0.1s linear' // Smooth out the fill effect
          }}
        >
          ۞
        </div>
      </div>

      {/* Percentage Counter */}
      <p className="text-2xl font-mono font-bold text-text-secondary mt-6 w-24 text-center" aria-live="polite">
        {progress}%
      </p>
      
      {/* Static Text */}
      <p className="text-lg text-text-muted mt-2">
        جاري تحميل بيانات المصحف الشريف...
      </p>
    </div>
  );
};

export default LoadingScreen;