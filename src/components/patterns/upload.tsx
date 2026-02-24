'use client';

import { formatBytes, useFileUpload } from '@/hooks/use-file-upload';
import { useEffect, useState } from 'react';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { DictKey } from '@/internationalization/get-dictionaries';
import { cn } from '@/lib/utils';
import { FileWithPreview } from '@/types';
import { IconUpload } from '@tabler/icons-react';

interface FileUploadItem extends FileWithPreview {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface ProgressUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  className?: string;
  onFilesChange?: (files: FileWithPreview[]) => void;
  simulateUpload?: boolean;
  title?: DictKey;
  description?: DictKey;
}

export function Pattern({
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = '*',
  multiple = true,
  className,
  onFilesChange,
  simulateUpload = true,
  title = 'common.upload.title',
  description = 'common.upload.dragOrDrop',
}: ProgressUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>([]);
  const [filesToNotify, setFilesToNotify] = useState<FileWithPreview[]>([]);

  const [
    { isDragging },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles,
    maxSize,
    accept,
    multiple,
    initialFiles: [],
    onFilesChange: newFiles => {
      // Convert to upload items when files change, preserving existing status
      const newUploadFiles = newFiles.map(file => {
        // Check if this file already exists in uploadFiles
        const existingFile = uploadFiles.find(
          existing => existing.id === file.id,
        );

        if (existingFile) {
          // Preserve existing file status and progress
          return {
            ...existingFile,
            ...file, // Update any changed properties from the file
          };
        } else {
          // New file - set to uploading
          return {
            ...file,
            progress: 0,
            status: 'uploading' as const,
          };
        }
      });
      setUploadFiles(newUploadFiles);
      setFilesToNotify(newFiles);
    },
  });

  // Notify parent component of files after render
  useEffect(() => {
    if (filesToNotify.length > 0) {
      onFilesChange?.(filesToNotify);
    }
  }, [filesToNotify, onFilesChange]);

  // Simulate upload progress
  useEffect(() => {
    if (!simulateUpload) return;

    const interval = setInterval(() => {
      setUploadFiles(prev =>
        prev.map(file => {
          if (file.status !== 'uploading') return file;

          const increment = Math.random() * 15 + 5;
          const newProgress = Math.min(file.progress + increment, 100);

          if (newProgress > 50 && Math.random() < 0.1) {
            return {
              ...file,
              status: 'error' as const,
              error: 'Upload failed. Please try again.',
            };
          }

          // Complete when progress reaches 100%
          if (newProgress >= 100) {
            return {
              ...file,
              progress: 100,
              status: 'completed' as const,
            };
          }

          return {
            ...file,
            progress: newProgress,
          };
        }),
      );
    }, 500);

    return () => clearInterval(interval);
  }, [simulateUpload]);

  return (
    <div className={cn('w-full max-w-2xl', className)}>
      <div
        className={cn(
          'rounded-lg relative border border-dashed p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input {...getInputProps()} className="sr-only" />

        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              isDragging ? 'bg-primary/10' : 'bg-muted',
            )}
          >
            <IconUpload
              className={cn(
                'h-6',
                isDragging ? 'text-primary' : 'text-muted-foreground',
              )}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              <TranslateText value={title} />
            </h3>
            <p className="text-muted-foreground text-sm">
              <TranslateText value={description} />
            </p>
            <p className="text-muted-foreground text-xs">
              <TranslateText
                value="common.upload.supportedFormats"
                params={{ maxSize: formatBytes(maxSize) }}
              />
            </p>
          </div>

          <Button onClick={openFileDialog}>
            <IconUpload className="h-4 w-4" />
            <TranslateText value="common.upload.selectFiles" />
          </Button>
        </div>
      </div>
    </div>
  );
}
