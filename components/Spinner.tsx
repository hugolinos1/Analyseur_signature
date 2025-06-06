import React from 'react';

interface SpinnerProps {
  message?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col justify-center items-center my-8 p-6 bg-slate-700 rounded-lg shadow-md">
      <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-300 text-lg font-medium">{message}</p>
      {message === "Analyzing Document..." && // Show this sub-message only for the default analysis
         <p className="text-slate-400 text-sm">This may take a moment. Please wait.</p>
      }
    </div>
  );
};