import { TinyDom } from '@ephox/mcagar';
import { Insert, Remove, SugarElement } from '@ephox/sugar';
import Editor from 'tinymce/core/api/Editor';

const createScrollDiv = (height: number) => SugarElement.fromHtml<HTMLElement>(`<div style="height: ${height}px;"></div>`);

const setupPageScroll = (editor: Editor, amount: number) => {
  const target = editor.inline ? TinyDom.body(editor) : TinyDom.container(editor);

  const divBefore = createScrollDiv(amount);
  const divAfter = createScrollDiv(amount);

  Insert.before(target, divBefore);
  Insert.after(target, divAfter);

  return () => {
    Remove.remove(divBefore);
    Remove.remove(divAfter);
  };
};

export {
  setupPageScroll
};
