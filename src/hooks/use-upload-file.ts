import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { FileWithPreview } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { useMutation as useConvexMutation } from 'convex/react';

interface UploadFileResult {
  storageId: Id<'_storage'>;
  url?: string | null;
}

export function useUploadFile() {
  const generateUploadUrl = useConvexMutation(api.storage.generateUploadUrl);

  return useMutation({
    mutationFn: async (
      files: File[] | FileWithPreview[],
    ): Promise<UploadFileResult[]> => {
      const normalizedFiles: File[] = files.map(item =>
        item instanceof File ? item : item.file,
      );

      const uploads = normalizedFiles.map(async file => {
        const uploadUrl = await generateUploadUrl();

        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error('Failed to upload file');
        }

        const { storageId } = await result.json();

        return { storageId };
      });

      return Promise.all(uploads);
    },
  });
}
