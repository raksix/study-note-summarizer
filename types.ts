export enum AnalysisStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AnalyzedFile {
  id: string;
  // file is optional because when loading from localStorage history, we don't have the File object
  file?: File; 
  fileName: string; // Store name separately for history
  fileSize?: number; // Store size separately for history
  status: AnalysisStatus;
  summary?: string;
  error?: string;
  uploadTimestamp: number;
}

export interface SummaryResponse {
  overview: string;
  keyPoints: string[];
  detailedAnalysis: string;
}