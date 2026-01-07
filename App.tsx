import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisCard } from './components/AnalysisCard';
import { AnalyzedFile, AnalysisStatus } from './types';
import { analyzePdfDocument, fileToBase64, generateGlobalSummary } from './services/geminiService';

const STORAGE_KEY = 'pdf-analyzer-history-v1';

const App: React.FC = () => {
  const [files, setFiles] = useState<AnalyzedFile[]>([]);
  const [isGlobalSummaryLoading, setIsGlobalSummaryLoading] = useState(false);
  const [globalSummary, setGlobalSummary] = useState<string | null>(null);
  
  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AnalyzedFile[] = JSON.parse(stored);
        // We restore them, but they won't have the 'file' object (it's not serializable)
        // We set status to COMPLETED for valid ones, ignore PROCESSING ones from previous session
        const validFiles = parsed.map(f => ({
          ...f,
          status: f.status === AnalysisStatus.PROCESSING ? AnalysisStatus.IDLE : f.status,
          error: f.status === AnalysisStatus.PROCESSING ? 'Sayfa yenilendi, işlem iptal edildi.' : f.error
        }));
        setFiles(validFiles);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  // Save to LocalStorage whenever files change (only successful ones to save space)
  useEffect(() => {
    const filesToSave = files.map(({ file, ...rest }) => rest); // Exclude the File object
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filesToSave));
  }, [files]);

  // Effect to process files that are in IDLE state
  useEffect(() => {
    const processNextFile = async () => {
      // Find the first file that is IDLE and has a File object (means it's a new upload)
      const fileToProcess = files.find(f => f.status === AnalysisStatus.IDLE && f.file);
      
      if (fileToProcess && fileToProcess.file) {
        // Mark as PROCESSING
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
  }, [files]);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const newAnalyzedFiles: AnalyzedFile[] = newFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      fileSize: file.size,
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

  const handleGenerateGlobalSummary = async () => {
    const completedSummaries = files
      .filter(f => f.status === AnalysisStatus.COMPLETED && f.summary)
      .map(f => f.summary as string);
    
    if (completedSummaries.length < 2) return;

    setIsGlobalSummaryLoading(true);
    try {
      const result = await generateGlobalSummary(completedSummaries);
      setGlobalSummary(result);
    } catch (error) {
      console.error(error);
      alert("Genel özet oluşturulurken bir hata oluştu.");
    } finally {
      setIsGlobalSummaryLoading(false);
    }
  };

  const completedFilesCount = files.filter(f => f.status === AnalysisStatus.COMPLETED).length;

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
            Gemini AI 2.0 tarafından desteklenmektedir
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Intro Section */}
        <div className="text-center space-y-3 mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Akıllı Belge Analizi ve Arşiv
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ders notlarını yükleyin, LaTeX destekli özetler alın ve otomatik arşivleyin.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm p-1">
          <FileUpload onFilesSelected={handleFilesSelected} />
        </div>

        {/* Global Summary Action */}
        {completedFilesCount > 1 && !globalSummary && (
          <div className="flex justify-center">
             <button 
              onClick={handleGenerateGlobalSummary}
              disabled={isGlobalSummaryLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all flex items-center space-x-2 disabled:opacity-70"
            >
              {isGlobalSummaryLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Tümünü Birleştirerek Özetleniyor...</span>
                </>
              ) : (
                <>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <span>Tüm Belgeler İçin Genel Özet Oluştur</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Display Global Summary */}
        {globalSummary && (
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-6 relative">
            <button 
              onClick={() => setGlobalSummary(null)}
              className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="flex items-center space-x-2 mb-4">
              <span className="bg-indigo-600 text-white p-1 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </span>
              <h2 className="text-xl font-bold text-indigo-900">Bütünleşik Genel Özet</h2>
            </div>
            <AnalysisCard 
              fileData={{
                id: 'global-summary',
                fileName: 'Bütünleşik Analiz Raporu',
                status: AnalysisStatus.COMPLETED,
                summary: globalSummary,
                uploadTimestamp: Date.now()
              }} 
              onRemove={() => setGlobalSummary(null)}
              onRetry={() => {}} 
            />
          </div>
        )}

        {/* List Section */}
        {files.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Belgelerim ({files.length})
              </h3>
              {files.length > 0 && (
                <button 
                  onClick={() => {
                    if(confirm("Tüm geçmiş silinecek. Emin misiniz?")) {
                      setFiles([]);
                      setGlobalSummary(null);
                      localStorage.removeItem(STORAGE_KEY);
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium"
                >
                  Geçmişi Temizle
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
                    onRetry={file.file ? handleRetryFile : () => {}} // Only allow retry if File object exists
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