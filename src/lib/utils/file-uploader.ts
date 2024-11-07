import { supabase } from '@/lib/supabase/client';

export type UploadOptions = {
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  onProgress?: (progress: number) => void;
  onDetailedProgress?: (details: UploadProgressDetails) => void;
  batchSize?: number;
  maxBandwidth?: number; // bytes per second
  priorityWeights?: Record<UploadPriority, number>;
};

export type UploadProgressDetails = {
  totalFiles: number;
  uploadedFiles: number;
  currentFileName: string;
  currentFileProgress: number;
  overallProgress: number;
  status: 'uploading' | 'paused' | 'cancelled' | 'completed' | 'error';
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
};

export type UploadPriority = 'high' | 'medium' | 'low';

export type QueueItem = {
  file: File;
  path: string;
  priority: UploadPriority;
  addedAt: number;
};

export type UploadError = {
  code: string;
  message: string;
  details?: any;
  retryCount: number;
  timestamp: number;
};

type UploadState = {
  queue: Array<{ file: File; path: string }>;
  uploadedSize: number;
  totalSize: number;
  startTime: number;
  lastUpdateTime: number;
  lastUploadedSize: number;
  uploadedFiles: number;
  currentFileName: string;
  currentFileProgress: number;
};

export class FileUploader {
  private queue: QueueItem[] = [];
  private uploading = false;
  private paused = false;
  private cancelled = false;
  private options: Required<UploadOptions>;
  private currentUpload: AbortController | null = null;
  private uploadState: UploadState = {
    queue: [],
    uploadedSize: 0,
    totalSize: 0,
    startTime: Date.now(),
    lastUpdateTime: Date.now(),
    lastUploadedSize: 0,
    uploadedFiles: 0,
    currentFileName: '',
    currentFileProgress: 0,
  };
  private bandwidthThrottle: number = 0;
  private errors: Record<string, UploadError[]> = {};
  private readonly priorityWeights: Record<UploadPriority, number>;

  constructor(options: UploadOptions = {}) {
    this.options = {
      maxRetries: 3,
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
      batchSize: 3,
      onProgress: () => {},
      onDetailedProgress: () => {},
      maxBandwidth: Infinity,
      priorityWeights: {
        high: 3,
        medium: 2,
        low: 1,
      },
      ...options,
    };
    this.priorityWeights = this.options.priorityWeights;
  }

  private throttle(chunk: ArrayBuffer): Promise<void> {
    if (!this.options.maxBandwidth || this.options.maxBandwidth === Infinity) {
      return Promise.resolve();
    }

    const chunkSize = chunk.byteLength;
    const delay = (chunkSize / this.options.maxBandwidth) * 1000;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private async uploadChunk(chunk: ArrayBuffer, controller: AbortController): Promise<void> {
    await this.throttle(chunk);
    // Implement chunk upload logic here
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityDiff = this.priorityWeights[b.priority] - this.priorityWeights[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.addedAt - b.addedAt; // FIFO within same priority
    });
  }

  private logError(fileId: string, error: UploadError): void {
    if (!this.errors[fileId]) {
      this.errors[fileId] = [];
    }
    this.errors[fileId].push(error);
    this.saveState(); // Save errors with state
  }

  private getDetailedError(error: any): UploadError {
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.details || error,
      retryCount: 0,
      timestamp: Date.now(),
    };
  }

  private saveState() {
    const state = {
      ...this.uploadState,
      queue: this.uploadState.queue,
      errors: this.errors,
      progress: {
        totalFiles: this.queue.length,
        uploadedFiles: this.uploadState.uploadedFiles,
        currentFileName: this.uploadState.currentFileName,
        currentFileProgress: this.uploadState.currentFileProgress,
        overallProgress: (this.uploadState.uploadedSize / this.uploadState.totalSize) * 100,
      },
    };
    localStorage.setItem('uploadState', JSON.stringify(state));
  }

  private loadState(): boolean {
    const savedState = localStorage.getItem('uploadState');
    if (!savedState) return false;

    try {
      const state = JSON.parse(savedState);
      this.uploadState = {
        ...state,
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        lastUploadedSize: state.uploadedSize,
      };
      this.errors = state.errors || {};
      return true;
    } catch (error) {
      console.error('Failed to load upload state:', error);
      return false;
    }
  }

  getErrors(fileId?: string): UploadError[] {
    if (fileId) {
      return this.errors[fileId] || [];
    }
    return Object.values(this.errors).flat();
  }

  clearErrors(fileId?: string): void {
    if (fileId) {
      delete this.errors[fileId];
    } else {
      this.errors = {};
    }
    this.saveState();
  }

  setBandwidthLimit(bytesPerSecond: number): void {
    this.options.maxBandwidth = bytesPerSecond;
  }

  setPriority(fileId: string, priority: UploadPriority): void {
    const item = this.queue.find(i => i.file.name === fileId);
    if (item) {
      item.priority = priority;
      this.sortQueue();
      this.saveState();
    }
  }

  async uploadWithRetry(file: File, path: string, attempt = 1): Promise<string> {
    if (this.paused || this.cancelled) {
      throw new Error(this.paused ? 'Upload paused' : 'Upload cancelled');
    }

    try {
      const controller = new AbortController();
      this.currentUpload = controller;

      const { data, error } = await supabase.storage
        .from('projects')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          abortSignal: controller.signal,
        });

      if (error) throw error;
      
      this.uploadState.uploadedSize += file.size;
      this.saveState();
      
      return data.path;
    } catch (error: any) {
      if (error.message === 'Upload paused' || error.message === 'Upload cancelled') {
        throw error;
      }
      
      if (attempt < this.options.maxRetries) {
        const delay = this.calculateRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.uploadWithRetry(file, path, attempt + 1);
      }
      throw error;
    } finally {
      this.currentUpload = null;
    }
  }

  async addToQueue(file: File, path: string, priority: UploadPriority = 'medium'): Promise<void> {
    const queueItem: QueueItem = {
      file,
      path,
      priority,
      addedAt: Date.now(),
    };
    
    this.queue.push(queueItem);
    this.uploadState.queue.push(queueItem);
    this.uploadState.totalSize += file.size;
    this.sortQueue();
    this.saveState();

    if (!this.uploading && !this.paused) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.paused || this.cancelled) {
      this.uploading = false;
      return;
    }

    this.uploading = true;
    const batch = this.queue.splice(0, this.options.batchSize);
    const batchSize = batch.reduce((acc, { file }) => acc + file.size, 0);

    try {
      await Promise.all(
        batch.map(async ({ file, path }, index) => {
          const speed = this.calculateSpeed();
          const estimatedTimeRemaining = this.calculateEstimatedTimeRemaining(speed);

          this.options.onDetailedProgress({
            totalFiles: this.queue.length + batch.length,
            uploadedFiles: index,
            currentFileName: file.name,
            currentFileProgress: 0,
            overallProgress: (this.uploadState.uploadedSize / this.uploadState.totalSize) * 100,
            status: 'uploading',
            speed,
            estimatedTimeRemaining,
          });

          const uploadedPath = await this.uploadWithRetry(file, path);

          this.options.onDetailedProgress({
            totalFiles: this.queue.length + batch.length,
            uploadedFiles: index + 1,
            currentFileName: file.name,
            currentFileProgress: 100,
            overallProgress: (this.uploadState.uploadedSize / this.uploadState.totalSize) * 100,
            status: 'uploading',
            speed,
            estimatedTimeRemaining,
          });

          return uploadedPath;
        })
      );

      // Clear saved state if batch completes successfully
      if (this.queue.length === 0) {
        localStorage.removeItem('uploadState');
      }
    } catch (error) {
      console.error('Batch upload failed:', error);
      if (!this.cancelled && !this.paused) {
        this.queue.unshift(...batch);
      }
      this.options.onDetailedProgress({
        totalFiles: this.queue.length,
        uploadedFiles: 0,
        currentFileName: '',
        currentFileProgress: 0,
        overallProgress: (this.uploadState.uploadedSize / this.uploadState.totalSize) * 100,
        status: 'error',
      });
    }

    if (!this.cancelled && !this.paused) {
      await this.processQueue();
    }
  }

  resume(): void {
    this.paused = false;
    if (this.loadState()) {
      this.processQueue();
    }
  }

  pause(): void {
    this.paused = true;
    if (this.currentUpload) {
      this.currentUpload.abort();
    }
  }

  cancel(): void {
    this.cancelled = true;
    if (this.currentUpload) {
      this.currentUpload.abort();
    }
    this.queue = [];
    this.updateProgress({
      totalFiles: 0,
      uploadedFiles: 0,
      currentFileName: '',
      currentFileProgress: 0,
      overallProgress: 0,
      status: 'cancelled'
    });
  }

  private updateProgress(details: UploadProgressDetails): void {
    this.options.onProgress?.(details.overallProgress);
    this.options.onDetailedProgress?.(details);
  }

  private calculateSpeed(): number {
    const now = Date.now();
    const timeDiff = (now - this.uploadState.lastUpdateTime) / 1000;
    const sizeDiff = this.uploadState.uploadedSize - this.uploadState.lastUploadedSize;
    return sizeDiff / timeDiff;
  }

  private calculateEstimatedTimeRemaining(speed: number): number {
    const remainingSize = this.uploadState.totalSize - this.uploadState.uploadedSize;
    return speed > 0 ? remainingSize / speed : 0;
  }

  private calculateRetryDelay(attempt: number): number {
    return Math.min(
      this.options.initialRetryDelay * Math.pow(2, attempt - 1),
      this.options.maxRetryDelay
    );
  }
} 