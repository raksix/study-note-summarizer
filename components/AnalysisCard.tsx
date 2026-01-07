import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { AnalyzedFile, AnalysisStatus } from '../types';

interface AnalysisCardProps {
  fileData: AnalyzedFile;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ fileData, onRemove, onRetry }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusColor = () => {
    switch (fileData.status) {
      case AnalysisStatus.PROCESSING: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case AnalysisStatus.COMPLETED: return 'bg-green-100 text-green-800 border-green-200';
      case AnalysisStatus.ERROR: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (fileData.status) {
      case AnalysisStatus.PROCESSING: return 'Analiz Ediliyor...';
      case AnalysisStatus.COMPLETED: return 'Analiz Tamamlandı';
      case AnalysisStatus.ERROR: return 'Hata Oluştu';
      default: return 'Beklemede';
    }
  };

  // Check if this is a historical item (no file object)
  const isHistoryItem = !fileData.file && fileData.status === AnalysisStatus.COMPLETED;

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md mb-6 ${isHistoryItem ? 'border-blue-100' : 'border-gray-200'}`}>
      {/* Header Section */}
      <div 
        className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer bg-gray-50/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className={`p-2 rounded-lg border shadow-sm shrink-0 ${isHistoryItem ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isHistoryItem ? 'text-blue-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isHistoryItem ? "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" : "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"} />
             </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 truncate" title={fileData.fileName}>
              {fileData.fileName}
            </h3>
            <div className="flex items-center space-x-2 mt-0.5">
              {fileData.fileSize && (
                <>
                  <span className="text-xs text-gray-500">
                    {(fileData.fileSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <span className="text-gray-300">•</span>
                </>
              )}
              {isHistoryItem && (
                 <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
                   Geçmiş Kayıt
                 </span>
              )}
              {!isHistoryItem && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {fileData.status === AnalysisStatus.ERROR && onRetry && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRetry(fileData.id); }}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Tekrar Dene"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(fileData.id); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Kaldır"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
           <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content Section */}
      {isExpanded && (
        <div className="p-6 bg-white min-h-[200px]">
          {fileData.status === AnalysisStatus.PROCESSING && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium animate-pulse">Yapay zeka notları analiz ediyor...</p>
            </div>
          )}

          {fileData.status === AnalysisStatus.ERROR && (
             <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
               <strong>Hata:</strong> {fileData.error || 'Bilinmeyen bir hata oluştu.'}
             </div>
          )}

          {fileData.status === AnalysisStatus.COMPLETED && fileData.summary && (
            <div className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
              >
                {fileData.summary}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};