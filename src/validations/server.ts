import { getGlobalDict } from '@/lib/dictionary-store';
import z from 'zod';

const dict = getGlobalDict();

export const serverSchema = z.object({
  name: z
    .string()
    .nonempty(dict?.servers.nameRequired)
    .min(1, dict?.servers.nameRequired)
    .max(100, dict?.servers.nameMaxLength),
  isPublic: z.boolean().default(true),
});

export type ServerFormValues = z.infer<typeof serverSchema>;
