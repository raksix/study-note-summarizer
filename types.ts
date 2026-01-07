export enum AnalysisStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AnalyzedFile {
  id: string;
  file: File;
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
