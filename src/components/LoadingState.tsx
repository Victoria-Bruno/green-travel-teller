
import React from 'react';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = "Analyzing sustainability data..." }) => {
  return (
    <div className="w-full h-60 flex flex-col items-center justify-center space-y-4 animate-fade-in">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-t-2 border-sage-300 animate-spin"></div>
        <div className="absolute inset-0 rounded-full border-2 border-sage-100 opacity-30"></div>
        <div className="absolute inset-2 flex items-center justify-center">
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-sage-500"
          >
            <path 
              d="M12 6.15a1 1 0 0 1 1 1v.59a1 1 0 1 1-2 0v-.6a1 1 0 0 1 1-1Zm-.53 3.22a1.53 1.53 0 1 0 0 3.06h.02a1.53 1.53 0 0 0 .02-3.06h-.04Zm-5.33-.9h-.02a1 1 0 0 0-.75.34 1 1 0 0 0 .09 1.41l.42.37a1 1 0 1 0 1.32-1.5l-.42-.36a1 1 0 0 0-.64-.26ZM5 14.5a1 1 0 0 0-1 1v.59a1 1 0 1 0 2 0v-.6a1 1 0 0 0-1-1Zm14.14-5.35a1 1 0 0 0-1.41-.08l-.42.36a1 1 0 0 0-.09 1.41 1 1 0 0 0 1.41.09l.42-.37a1 1 0 0 0 .1-1.4ZM19 14.5a1 1 0 0 0-1 1v.59a1 1 0 1 0 2 0v-.6a1 1 0 0 0-1-1Z" 
              fill="currentColor"
            />
            <path 
              d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" 
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
      <p className="text-sage-700 animate-pulse-opacity text-center max-w-xs">{message}</p>
    </div>
  );
};

export default LoadingState;
