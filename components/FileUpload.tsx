import React, { useState, useCallback, useRef } from 'react';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, disabled }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChangeInternal = useCallback((selectedFile: File | null | undefined) => {
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFileName(selectedFile.name);
        onFileChange(selectedFile);
      } else {
        alert("Please upload a PDF file.");
        setFileName(null);
        onFileChange(null);
        if(fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
      }
    } else {
      setFileName(null);
      onFileChange(null);
    }
  }, [onFileChange]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChangeInternal(event.target.files?.[0]);
  }, [handleFileChangeInternal]);


  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (disabled) return;
    event.currentTarget.classList.add('border-sky-500', 'bg-slate-600');
  }, [disabled]);
  
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (disabled) return;
    event.currentTarget.classList.remove('border-sky-500', 'bg-slate-600');
  }, [disabled]);


  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (disabled) return;
    event.currentTarget.classList.remove('border-sky-500', 'bg-slate-600');
    const file = event.dataTransfer.files?.[0];
     if (file) {
        handleFileChangeInternal(file);
         if(fileInputRef.current) { 
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInputRef.current.files = dataTransfer.files;
        }
    }
  }, [disabled, handleFileChangeInternal]);


  return (
    <div className="w-full p-6 bg-slate-700 rounded-lg shadow-md">
      <label 
        htmlFor="pdf-upload" 
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-slate-500 border-dashed rounded-lg cursor-pointer hover:border-sky-500 hover:bg-slate-600 transition-all duration-150 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-10 h-10 mb-3 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <p className="mb-2 text-sm text-slate-300"><span className="font-semibold">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-slate-400">PDF files only</p>
        </div>
        <input 
          id="pdf-upload" 
          type="file" 
          className="hidden" 
          accept=".pdf" 
          onChange={handleInputChange} 
          disabled={disabled}
          ref={fileInputRef}
        />
      </label>
      {fileName && <p className="mt-3 text-sm text-center text-slate-300">Selected file: <span className="font-semibold text-sky-400">{fileName}</span></p>}
    </div>
  );
};
