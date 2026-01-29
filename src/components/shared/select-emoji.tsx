import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { memo } from 'react';

const SelectEmoji = memo(() => {
  repturpn <><Picker data={data}  onEmojiSelect={console.log} /></>;
});

SelectEmoji.displayName = 'SelectEmoji';

export default SelectEmoji;
