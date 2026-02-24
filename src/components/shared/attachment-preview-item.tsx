import { Button } from '@/components/ui/button';
import { FileWithPreview } from '@/types';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import Image from 'next/image';

interface AttachementPreviewItemProps {
  attachment: FileWithPreview;
  onRemove: () => void;
}

const AttachementPreviewItem = ({
  attachment,
  onRemove,
}: AttachementPreviewItemProps) => {
  return (
    <li className="shrink-0 relative">
      <div className="aspect-square flex-col w-full h-full rounded-md border p-3 border-muted-foreground/10 flex items-center justify-center overflow-hidden">
        <div className="flex-1 mb-2">
          {attachment.preview && (
            <Image
              src={attachment.preview}
              alt={attachment.file.name}
              className="w-full h-full object-cover rounded-sm"
              width={50}
              height={50}
            />
          )}
        </div>
        <span className="text-xs mt-auto text-muted-foreground">
          {attachment.file.name}
        </span>
      </div>
      <div className="absolute top-2 right-2 flex rounded-md bg-muted p-1">
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          className="hover:bg-muted-foreground/10 size-6"
        >
          <IconPencil className="size-4" />
        </Button>
        <Button
          variant="danger"
          size="icon-sm"
          type="button"
          className="hover:bg-muted-foreground/10 size-6"
          onClick={onRemove}
        >
          <IconTrash className="size-4" />
        </Button>
      </div>
    </li>
  );
};

export default AttachementPreviewItem;
