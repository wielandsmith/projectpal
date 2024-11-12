import { supabase } from '@/lib/supabase/client';
import { FileUploader } from './file-uploader';

export type FileUploadResult = {
  path: string;
  url: string;
  error?: string;
};

export type FileUploadOptions = {
  bucket: 'projects' | 'materials' | 'resources';
  folder: string;
  maxSize?: number;
  allowedTypes?: string[];
  generateUniqueName?: boolean;
};

const DEFAULT_OPTIONS: Partial<FileUploadOptions> = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/*', 'application/pdf'],
  generateUniqueName: true,
};

export class UploadHelper {
  private fileUploader: FileUploader;

  constructor() {
    this.fileUploader = new FileUploader({
      maxRetries: 3,
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
      batchSize: 3,
    });
  }

  /**
   * Generate a unique file name to prevent collisions
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${timestamp}-${random}.${extension}`;
  }

  /**
   * Validate a file against size and type constraints
   */
  private validateFile(file: File, options: FileUploadOptions): string | null {
    if (options.maxSize && file.size > options.maxSize) {
      return `File size exceeds ${options.maxSize / 1024 / 1024}MB limit`;
    }

    if (options.allowedTypes && options.allowedTypes.length > 0) {
      const isAllowed = options.allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', ''));
        }
        return file.type === type;
      });

      if (!isAllowed) {
        return `File type ${file.type} is not allowed`;
      }
    }

    return null;
  }

  /**
   * Get a public URL for a file
   */
  private async getPublicUrl(bucket: string, path: string): Promise<string> {
    const { data } = await supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Upload a single file
   */
  async uploadFile(
    file: File,
    options: FileUploadOptions
  ): Promise<FileUploadResult> {
    try {
      const error = this.validateFile(file, { ...DEFAULT_OPTIONS, ...options });
      if (error) {
        return { path: '', url: '', error };
      }

      const fileName = options.generateUniqueName 
        ? this.generateFileName(file.name)
        : file.name;
      
      const path = `${options.folder}/${fileName}`;

      await this.fileUploader.addToQueue(file, path, 'medium');
      const url = await this.getPublicUrl(options.bucket, path);

      return { path, url };
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        path: '',
        url: '',
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: File[],
    options: FileUploadOptions
  ): Promise<FileUploadResult[]> {
    return Promise.all(files.map(file => this.uploadFile(file, options)));
  }

  /**
   * Upload project files with appropriate organization
   */
  async uploadProjectFiles(
    featuredImage: File | null,
    materials: File[],
    resources: File[],
    projectId: string
  ): Promise<{
    featuredImageUrl?: string;
    materialUrls: string[];
    resourceUrls: string[];
  }> {
    const results = {
      featuredImageUrl: '',
      materialUrls: [] as string[],
      resourceUrls: [] as string[],
    };

    // Upload featured image
    if (featuredImage) {
      const { url } = await this.uploadFile(featuredImage, {
        bucket: 'projects',
        folder: `${projectId}/featured`,
        allowedTypes: ['image/*'],
      });
      results.featuredImageUrl = url;
    }

    // Upload materials
    const materialResults = await this.uploadFiles(materials, {
      bucket: 'materials',
      folder: projectId,
      allowedTypes: ['application/pdf'],
    });
    results.materialUrls = materialResults
      .filter(r => !r.error)
      .map(r => r.url);

    // Upload resources
    const resourceResults = await this.uploadFiles(resources, {
      bucket: 'resources',
      folder: projectId,
      allowedTypes: ['application/pdf', 'image/*'],
    });
    results.resourceUrls = resourceResults
      .filter(r => !r.error)
      .map(r => r.url);

    return results;
  }

  /**
   * Upload lesson/step files
   */
  async uploadLessonFiles(
    imageFile: File | null,
    resources: File[],
    projectId: string,
    lessonId: string
  ): Promise<{
    imageUrl?: string;
    resourceUrls: string[];
  }> {
    const results = {
      imageUrl: '',
      resourceUrls: [] as string[],
    };

    // Upload lesson image
    if (imageFile) {
      const { url } = await this.uploadFile(imageFile, {
        bucket: 'projects',
        folder: `${projectId}/lessons/${lessonId}`,
        allowedTypes: ['image/*'],
      });
      results.imageUrl = url;
    }

    // Upload lesson resources
    const resourceResults = await this.uploadFiles(resources, {
      bucket: 'resources',
      folder: `${projectId}/lessons/${lessonId}`,
      allowedTypes: ['application/pdf', 'image/*'],
    });
    results.resourceUrls = resourceResults
      .filter(r => !r.error)
      .map(r => r.url);

    return results;
  }

  /**
   * Delete a file
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(bucket: string, paths: string[]): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
  }
}

// Export a singleton instance
export const uploadHelper = new UploadHelper(); 