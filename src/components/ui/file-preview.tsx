import { X } from 'lucide-react';
import { Button } from './button';
import Image from 'next/image';

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  className?: string;
}

export function FilePreview({ file, onRemove, className }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf';

  return (
    <div className={`relative group ${className}`}>
      <div className="flex items-center p-2 rounded-lg border bg-white">
        {isImage && (
          <div className="relative w-20 h-20">
            <Image
              src={URL.createObjectURL(file)}
              alt={file.name}
              fill
              className="object-cover rounded"
            />
          </div>
        )}
        {isPDF && (
          <div className="w-20 h-20 flex items-center justify-center bg-red-100 rounded">
            <span className="text-sm font-medium text-red-700">PDF</span>
          </div>
        )}
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 