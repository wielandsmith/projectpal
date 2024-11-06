import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  onFileSelect: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number; // in bytes
  maxFiles?: number;
  className?: string;
}

export function FileDropZone({
  onFileSelect,
  accept,
  maxSize = 5 * 1024 * 1024, // 5MB default
  maxFiles = 1,
  className
}: FileDropZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => {
        if (file.errors[0]?.code === 'file-too-large') {
          return `File ${file.file.name} is too large. Max size is ${maxSize / 1024 / 1024}MB`;
        }
        if (file.errors[0]?.code === 'file-invalid-type') {
          return `File ${file.file.name} has invalid type`;
        }
        return file.errors[0]?.message || 'Invalid file';
      });
      setError(errors[0]);
      return;
    }

    setError(null);
    onFileSelect(acceptedFiles);
  }, [maxSize, onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-gray-200",
          "hover:border-primary hover:bg-primary/5",
          "cursor-pointer",
          className
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <Upload className="h-8 w-8 text-gray-400" />
          <div className="text-sm text-gray-600">
            {isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <p>
                Drag & drop files here, or click to select files
                <br />
                <span className="text-xs text-gray-400">
                  Max size: {maxSize / 1024 / 1024}MB
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
} 