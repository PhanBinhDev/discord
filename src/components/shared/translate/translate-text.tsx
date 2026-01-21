import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { DictKey } from '@/internationalization/get-dictionaries';
import { getByPath } from '@/utils';

type TranslateTextProps = {
  value: DictKey;
  params?: Record<string, string | number>;
};

const TranslateText = ({ value, params }: TranslateTextProps) => {
  const { dict } = useClientDictionary();

  let translated = getByPath(dict, value) ?? value;

  // Replace params if provided
  if (params && typeof translated === 'string') {
    Object.entries(params).forEach(([key, val]) => {
      translated = (translated as string).replace(
        new RegExp(`{{${key}}}`, 'g'),
        String(val),
      );
    });
  }

  return <>{translated}</>;
};

export default TranslateText;
