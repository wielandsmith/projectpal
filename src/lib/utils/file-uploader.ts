import { supabase } from '@/lib/supabase/client';

export type UploadPriority = 'high' | 'medium' | 'low';
export type UploadStatus = 'pending' | 'uploading' | 'paused' | 'completed' | 'error';

export interface UploadProgressDetails {
  currentFileName: string;
  currentFileProgress: number;
  overallProgress: number;
  uploadedFiles: number;
  totalFiles: number;
  status: UploadStatus;
  speed?: number;
  estimatedTimeRemaining?: number;
}

export interface UploadError {
  code: string;
  message: string;
  fileName: string;
  retryCount: number;
  timestamp: number;
}

interface QueueItem {
  file: File;
  path: string;
  priority: UploadPriority;
  bucket: string;
  retryCount: number;
  controller: AbortController;
}

interface FileUploaderOptions {
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  batchSize?: number;
  onProgress?: (progress: number) => void;
  onDetailedProgress?: (details: UploadProgressDetails) => void;
  maxBandwidth?: number;
  priorityWeights?: {
    high: number;
    medium: number;
    low: number;
  };
}

export class FileUploader {
  private queue: QueueItem[] = [];
  private activeUploads = 0;
  private isPaused = false;
  private errors: UploadError[] = [];
  private uploadStartTime: number | null = null;
  private bytesUploaded = 0;
  private totalBytes = 0;
  private bandwidthLimit: number;

  private readonly maxRetries: number;
  private readonly initialRetryDelay: number;
  private readonly maxRetryDelay: number;
  private readonly batchSize: number;
  private readonly onProgress?: (progress: number) => void;
  private readonly onDetailedProgress?: (details: UploadProgressDetails) => void;
  private readonly priorityWeights: { [K in UploadPriority]: number };

  constructor(options: FileUploaderOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.initialRetryDelay = options.initialRetryDelay ?? 1000;
    this.maxRetryDelay = options.maxRetryDelay ?? 30000;
    this.batchSize = options.batchSize ?? 3;
    this.onProgress = options.onProgress;
    this.onDetailedProgress = options.onDetailedProgress;
    this.bandwidthLimit = options.maxBandwidth ?? Infinity;
    this.priorityWeights = options.priorityWeights ?? {
      high: 3,
      medium: 2,
      low: 1
    };
  }

  async addToQueue(
    file: File, 
    path: string, 
    priority: UploadPriority = 'medium',
    bucket: string = 'project-resources'
  ): Promise<void> {
    const controller = new AbortController();
    this.queue.push({
      file,
      path,
      priority,
      bucket,
      retryCount: 0,
      controller
    });
    this.totalBytes += file.size;
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isPaused || this.activeUploads >= this.batchSize) {
      return;
    }

    // Sort queue by priority
    this.queue.sort((a, b) => 
      this.priorityWeights[b.priority] - this.priorityWeights[a.priority]
    );

    while (this.queue.length > 0 && this.activeUploads < this.batchSize) {
      const item = this.queue.shift();
      if (!item) break;

      this.activeUploads++;
      if (!this.uploadStartTime) {
        this.uploadStartTime = Date.now();
      }

      try {
        await this.uploadFile(item);
      } catch (error) {
        console.error(`Error uploading ${item.file.name}:`, error);
        if (item.retryCount < this.maxRetries) {
          const delay = Math.min(
            this.initialRetryDelay * Math.pow(2, item.retryCount),
            this.maxRetryDelay
          );
          item.retryCount++;
          setTimeout(() => {
            this.queue.unshift(item);
            this.processQueue();
          }, delay);
        } else {
          this.errors.push({
            code: 'UPLOAD_FAILED',
            message: error instanceof Error ? error.message : 'Upload failed',
            fileName: item.file.name,
            retryCount: item.retryCount,
            timestamp: Date.now()
          });
        }
      } finally {
        this.activeUploads--;
        this.processQueue();
      }
    }
  }

  private async uploadFile(item: QueueItem): Promise<void> {
    const { file, path, bucket, controller } = item;
    const chunkSize = 1024 * 1024; // 1MB chunks
    let uploadedBytes = 0;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        abortSignal: controller.signal,
      });

    if (error) throw error;

    this.bytesUploaded += file.size;
    this.updateProgress(file.name, uploadedBytes / file.size * 100);
  }

  private updateProgress(fileName: string, fileProgress: number): void {
    const overallProgress = (this.bytesUploaded / this.totalBytes) * 100;
    const uploadedFiles = this.getUploadedFilesCount();
    const totalFiles = uploadedFiles + this.queue.length;

    // Calculate speed and estimated time
    let speed, estimatedTimeRemaining;
    if (this.uploadStartTime) {
      const elapsedTime = (Date.now() - this.uploadStartTime) / 1000; // in seconds
      speed = this.bytesUploaded / elapsedTime; // bytes per second
      const remainingBytes = this.totalBytes - this.bytesUploaded;
      estimatedTimeRemaining = remainingBytes / speed;
    }

    const details: UploadProgressDetails = {
      currentFileName: fileName,
      currentFileProgress: fileProgress,
      overallProgress,
      uploadedFiles,
      totalFiles,
      status: this.isPaused ? 'paused' : 'uploading',
      speed,
      estimatedTimeRemaining,
    };

    this.onProgress?.(overallProgress);
    this.onDetailedProgress?.(details);
  }

  private getUploadedFilesCount(): number {
    return Math.floor((this.bytesUploaded / this.totalBytes) * (this.queue.length + this.activeUploads));
  }

  pause(): void {
    this.isPaused = true;
    this.queue.forEach(item => item.controller.abort());
  }

  resume(): void {
    this.isPaused = false;
    this.processQueue();
  }

  cancel(): void {
    this.queue.forEach(item => item.controller.abort());
    this.queue = [];
    this.activeUploads = 0;
    this.bytesUploaded = 0;
    this.totalBytes = 0;
    this.uploadStartTime = null;
  }

  getErrors(): UploadError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  setBandwidthLimit(bytesPerSecond: number): void {
    this.bandwidthLimit = bytesPerSecond;
  }
} 