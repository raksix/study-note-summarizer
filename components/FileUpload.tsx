import React, { useCallback } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, disabled }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      
      const files = Array.from(e.dataTransfer.files).filter(
        (file: File) => file.type === 'application/pdf'
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected, disabled]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && !disabled) {
      const files = Array.from(e.target.files).filter(
        (file: File) => file.type === 'application/pdf'
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out
        ${disabled 
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
          : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-500 cursor-pointer'
        }`}
    >
      <input
        type="file"
        multiple
        accept="application/pdf"
        onChange={handleFileChange}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
        <div className={`p-4 rounded-full ${disabled ? 'bg-gray-100' : 'bg-blue-100 text-blue-600'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium text-gray-700">
            PDF dosyalarını buraya sürükleyin
          </p>
          <p className="text-sm text-gray-500 mt-1">
            veya dosya seçmek için tıklayın
          </p>
        </div>
        <div className="text-xs text-gray-400 font-medium bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
          Çoklu dosya desteklenir
        </div>
      </div>
    </div>
  );
};