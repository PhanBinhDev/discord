import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation } from '@tanstack/react-query';
import { useMutation as useConvexMutation } from 'convex/react';

interface UploadFileResult {
  storageId: Id<'_storage'>;
  url?: string | null;
}

export function useUploadFile() {
  const generateUploadUrl = useConvexMutation(api.storage.generateUploadUrl);

  return useMutation({
    mutationFn: async (file: File): Promise<UploadFileResult> => {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error('Failed to upload file');
      }

      console.log('Upload file response:', result);

      const { storageId } = await result.json();

      return { storageId };
    },
  });
}
