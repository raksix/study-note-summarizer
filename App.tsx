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

  // Save to LocalStorage
  useEffect(() => {
    const filesToSave = files.map(({ file, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filesToSave));
  }, [files]);

  // Process IDLE files
  useEffect(() => {
    const processNextFile = async () => {
      const fileToProcess = files.find(f => f.status === AnalysisStatus.IDLE && f.file);
      
      if (fileToProcess && fileToProcess.file) {
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

  const handleDownloadFullReport = () => {
    const completedFiles = files.filter(f => f.status === AnalysisStatus.COMPLETED);
    
    // Nothing to download if no global summary and no completed files
    if (completedFiles.length === 0 && !globalSummary) {
      alert("İndirilecek analiz bulunamadı.");
      return;
    }

    const data = {
      date: new Date().toLocaleDateString('tr-TR'),
      globalSummary,
      files: completedFiles.map(f => ({
        title: f.fileName,
        content: f.summary
      }))
    };

    const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ders Notu Analiz Raporu - ${data.date}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  
  <!-- Libraries for rendering Markdown and Math on client side -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
    
    /* Markdown Styles */
    .markdown-body h1 { font-size: 1.75em; font-weight: 700; margin-bottom: 0.5em; margin-top: 1em; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
    .markdown-body h2 { font-size: 1.4em; font-weight: 600; margin-bottom: 0.5em; margin-top: 1.2em; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
    .markdown-body h3 { font-size: 1.2em; font-weight: 600; margin-bottom: 0.5em; margin-top: 1em; color: #475569; }
    .markdown-body p { margin-bottom: 1em; line-height: 1.7; color: #374151; }
    .markdown-body ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; color: #374151; }
    .markdown-body ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; color: #374151; }
    .markdown-body li { margin-bottom: 0.3em; }
    .markdown-body strong { font-weight: 700; color: #111827; }
    .markdown-body blockquote { border-left: 4px solid #3b82f6; padding-left: 1em; margin-left: 0; color: #555; font-style: italic; background: #f8fafc; padding-top: 0.5em; padding-bottom: 0.5em; }
    .markdown-body code { background-color: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #dc2626; }
    .markdown-body pre { background-color: #1e293b; padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; }
    .markdown-body pre code { background-color: transparent; color: #e2e8f0; padding: 0; }
    .markdown-body table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
    .markdown-body th, .markdown-body td { border: 1px solid #cbd5e1; padding: 0.5em; text-align: left; }
    .markdown-body th { background-color: #f1f5f9; font-weight: 600; }
    
    @media print {
      body { background-color: white; }
      .shadow { box-shadow: none; }
      .border { border: none; }
      .page-break { page-break-before: always; }
      .no-print { display: none; }
    }
  </style>
</head>
<body class="p-8">
  <div class="max-w-4xl mx-auto space-y-8" id="report-container">
    <div class="text-center py-8 border-b border-gray-200">
        <h1 class="text-3xl font-bold text-gray-900">Ders Notu Analiz Raporu</h1>
        <p class="text-gray-500 mt-2">${data.date}</p>
    </div>
  </div>

  <script>
    const data = ${JSON.stringify(data)};
    
    document.addEventListener("DOMContentLoaded", function() {
      const container = document.getElementById('report-container');
      
      // 1. Render Global Summary if exists
      if (data.globalSummary) {
        const div = document.createElement('div');
        div.className = "bg-white p-10 rounded-xl shadow border border-indigo-100 mb-8";
        div.innerHTML = \`
            <h2 class="text-2xl font-bold text-indigo-900 mb-6 pb-4 border-b border-indigo-100">Bütünleşik Genel Özet</h2>
            <div class="markdown-body">\${marked.parse(data.globalSummary)}</div>
        \`;
        container.appendChild(div);
      }

      // 2. Render Individual Files
      data.files.forEach((file, index) => {
        const div = document.createElement('div');
        // Add page break for print if not the first item
        const pageBreakClass = (index > 0 || data.globalSummary) ? "page-break" : "";
        
        div.className = "bg-white p-10 rounded-xl shadow border border-gray-200 mb-8 " + pageBreakClass;
        div.innerHTML = \`
            <h2 class="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">\${file.title}</h2>
            <div class="markdown-body">\${marked.parse(file.content)}</div>
        \`;
        container.appendChild(div);
      });

      // 3. Render Math
      renderMathInElement(document.body, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    });
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Analiz_Raporu_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
             <div className="absolute top-4 right-4 flex items-center space-x-2">
              <button 
                onClick={() => setGlobalSummary(null)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Kapat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
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
            <div className="flex items-center justify-between px-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                Belgelerim ({files.length})
              </h3>
              
              <div className="flex items-center space-x-3">
                {/* Download All Button */}
                {(completedFilesCount > 0 || globalSummary) && (
                  <button
                    onClick={handleDownloadFullReport}
                    className="flex items-center space-x-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg transition-colors shadow-sm"
                    title="Tüm raporu HTML olarak indir"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="hidden sm:inline">Tüm Raporu İndir</span>
                  </button>
                )}

                {/* Clear History Button */}
                <button 
                  onClick={() => {
                    if(confirm("Tüm geçmiş silinecek. Emin misiniz?")) {
                      setFiles([]);
                      setGlobalSummary(null);
                      localStorage.removeItem(STORAGE_KEY);
                    }
                  }}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Geçmişi Temizle</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {files
                .sort((a, b) => b.uploadTimestamp - a.uploadTimestamp)
                .map(file => (
                  <AnalysisCard 
                    key={file.id} 
                    fileData={file} 
                    onRemove={handleRemoveFile}
                    onRetry={file.file ? handleRetryFile : () => {}} 
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