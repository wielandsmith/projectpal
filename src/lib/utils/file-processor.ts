import imageCompression from 'browser-image-compression';

export type FileProcessingOptions = {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  maxRetries?: number;
  retryDelay?: number;
};

const defaultOptions: FileProcessingOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  maxRetries: 3,
  retryDelay: 1000,
};

export class FileProcessor {
  private queue: Array<{ file: File; type: string }> = [];
  private processing = false;
  private options: FileProcessingOptions;

  constructor(options: FileProcessingOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  async processFile(file: File, type: string): Promise<File> {
    if (file.type.startsWith('image/')) {
      return this.compressImage(file);
    }
    return file;
  }

  private async compressImage(file: File): Promise<File> {
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: this.options.maxSizeMB,
        maxWidthOrHeight: this.options.maxWidthOrHeight,
        useWebWorker: this.options.useWebWorker,
      });
      return new File([compressedFile], file.name, { type: file.type });
    } catch (error) {
      console.error('Image compression failed:', error);
      return file;
    }
  }

  async addToQueue(file: File, type: string): Promise<void> {
    this.queue.push({ file, type });
    if (!this.processing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const { file, type } = this.queue.shift()!;

    try {
      const processedFile = await this.processFile(file, type);
      // Emit processed file event or callback
      this.onFileProcessed?.(processedFile, type);
    } catch (error) {
      console.error('File processing failed:', error);
      this.onFileError?.(file, error);
    }

    await this.processQueue();
  }

  onFileProcessed?: (file: File, type: string) => void;
  onFileError?: (file: File, error: any) => void;
} 