import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisCard } from './components/AnalysisCard';
import { AnalyzedFile, AnalysisStatus } from './types';
import { analyzePdfDocument, fileToBase64 } from './services/geminiService';

const App: React.FC = () => {
  const [files, setFiles] = useState<AnalyzedFile[]>([]);
  
  // Effect to process files that are in IDLE state
  useEffect(() => {
    const processNextFile = async () => {
      // Find the first file that is IDLE
      const fileToProcess = files.find(f => f.status === AnalysisStatus.IDLE);
      
      if (fileToProcess) {
        // Mark as PROCESSING immediately to prevent duplicate calls
        setFiles(prev => prev.map(f => 
          f.id === fileToProcess.id ? { ...f, status: AnalysisStatus.PROCESSING } : f
        ));

        try {
          const base64Data = await fileToBase64(fileToProcess.file);
          const summary = await analyzePdfDocument(base64Data, fileToProcess.file.type);
          
          setFiles(prev => prev.map(f => 
            f.id === fileToProcess.id 
              ? { ...f, status: AnalysisStatus.COMPLETED, summary } 
              : f
          ));
        } catch (error: any) {
          setFiles(prev => prev.map(f => 
            f.id === fileToProcess.id 
              ? { ...f, status: AnalysisStatus.ERROR, error: error.message } 
              : f
          ));
        }
      }
    };

    processNextFile();
  }, [files]); // Dependency on files ensures we check again after a status update

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const newAnalyzedFiles: AnalyzedFile[] = newFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: AnalysisStatus.IDLE,
      uploadTimestamp: Date.now()
    }));

    setFiles(prev => [...prev, ...newAnalyzedFiles]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleRetryFile = useCallback((id: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status: AnalysisStatus.IDLE, error: undefined } : f
    ));
  }, []);

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Ders Notu Analizörü
            </h1>
          </div>
          <div className="text-sm text-gray-500 hidden sm:block">
            Gemini AI tarafından desteklenmektedir
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Intro Section */}
        <div className="text-center space-y-3 mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Belgelerinizi Saniyeler İçinde Özetleyin
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Uzun ders notlarını, akademik makaleleri veya raporları yükleyin. 
            Yapay zeka sizin için önemli noktaları, kavramları ve özetleri çıkarsın.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm p-1">
          <FileUpload onFilesSelected={handleFilesSelected} />
        </div>

        {/* List Section */}
        {files.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Analizler ({files.length})
              </h3>
              {files.some(f => f.status === AnalysisStatus.COMPLETED) && (
                <button 
                  onClick={() => setFiles([])}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium"
                >
                  Tümünü Temizle
                </button>
              )}
            </div>

            <div className="space-y-4">
              {files
                .sort((a, b) => b.uploadTimestamp - a.uploadTimestamp)
                .map(file => (
                  <AnalysisCard 
                    key={file.id} 
                    fileData={file} 
                    onRemove={handleRemoveFile}
                    onRetry={handleRetryFile}
                  />
                ))
              }
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
