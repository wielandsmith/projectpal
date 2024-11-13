import { X } from 'lucide-react';
import { Button } from './button';

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  className?: string;
}

export function FilePreview({ file, onRemove, className = '' }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf';

  return (
    <div className={`relative flex items-center p-2 bg-white/50 rounded-lg border ${className}`}>
      {isImage && (
        <div className="w-12 h-12 mr-3">
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="w-full h-full object-cover rounded"
          />
        </div>
      )}
      {isPDF && (
        <div className="w-12 h-12 mr-3 flex items-center justify-center bg-red-100 rounded">
          <span className="text-xs font-medium text-red-800">PDF</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="ml-2"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Remove file</span>
      </Button>
    </div>
  );
} 