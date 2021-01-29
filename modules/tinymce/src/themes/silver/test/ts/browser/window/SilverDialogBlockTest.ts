import { Mouse } from '@ephox/agar';
import { TestHelpers } from '@ephox/alloy';
import { beforeEach, context, describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { TinyHooks, TinyUiActions } from '@ephox/mcagar';
import { Attribute, Height, SelectorFind, SugarDocument, SugarElement, SugarLocation, Width } from '@ephox/sugar';
import { assert } from 'chai';

import Editor from 'tinymce/core/api/Editor';
import { Dialog } from 'tinymce/core/api/ui/Ui';
import Theme from 'tinymce/themes/silver/Theme';

import * as DialogUtils from '../../module/DialogUtils';

describe('browser.tinymce.themes.silver.window.SilverDialogBlockTest', () => {
  const store = TestHelpers.TestStore();
  const hook = TinyHooks.bddSetupLight<Editor>({
    base_url: '/project/tinymce/js/tinymce'
  }, [ Theme ]);

  const dialogSpec: Dialog.DialogSpec<{ fred: string }> = {
    title: 'Test dialog',
    body: {
      type: 'panel',
      items: [
        {
          type: 'input',
          name: 'fred',
          label: 'Freds input'
        }
      ]
    },
    buttons: [
      {
        type: 'cancel',
        name: 'cancel',
        text: 'Cancel'
      },
      {
        type: 'custom',
        name: 'clickable',
        text: 'Clickable?'
      }
    ],
    initialData: {
      fred: 'Some string'
    },
    onAction: store.adder('clicked')
  };

  const pClick = async (editor: Editor) => {
    const button = await TinyUiActions.pWaitForUi(editor, 'button:contains("Clickable?")') as SugarElement<HTMLButtonElement>;
    const coords = SugarLocation.absolute(button);
    const centerX = coords.left + 0.5 * Width.get(button);
    const centerY = coords.top + 0.5 * Height.get(button);
    const elem = SugarElement.fromPoint(SugarDocument.getDocument(), centerX, centerY).getOrDie();
    Mouse.click(elem);
  };

  const pAssertBlock = async (editor: Editor, blocked: boolean) => {
    const button = await TinyUiActions.pWaitForUi(editor, 'button:contains("Clickable?")');
    const parent = SelectorFind.closest(button, '[aria-busy]');
    const isBlocked = parent
      .bind((parent) => Attribute.getOpt(parent, 'aria-busy'))
      .is('true');
    assert.equal(isBlocked, blocked, 'Blocked state of the dialog');
  };

  Arr.each([
    { label: 'Modal', params: { }},
    { label: 'Inline', params: { inline: 'toolbar' as 'toolbar' }}
  ], (test) => {
    context(test.label, () => {
      beforeEach(() => {
        store.clear();
      });

      it('TINY-6487: Ensure the button clicks when unblocked', async () => {
        const editor = hook.editor();
        DialogUtils.open(editor, dialogSpec, test.params);
        await pClick(editor);
        store.assertEq(`Ensure that it clicks (${test.label})`, [ 'clicked' ]);
        DialogUtils.close(editor);
      });

      it('TINY-6487: Ensure the button does not click when blocked', async () => {
        const editor = hook.editor();
        const api = DialogUtils.open(editor, dialogSpec, test.params);
        api.block('Block message');
        await pClick(editor);
        store.cAssertEq(`Ensure that it has not clicked (${test.label})`, []);
        DialogUtils.close(editor);
      });

      it('TINY-6487: Ensure that the button does click after unblocking', async () => {
        const editor = hook.editor();
        const api = DialogUtils.open(editor, dialogSpec, test.params);
        api.block('Block message');
        api.unblock();
        await pClick(editor);
        store.cAssertEq(`Ensure that it has not clicked (${test.label})`, [ 'clicked' ]);
        DialogUtils.close(editor);
      });

      it('TINY-6487: Ensure that the button gets blocked', async () => {
        const editor = hook.editor();
        const api = DialogUtils.open(editor, dialogSpec, test.params);
        api.block('Block message');
        await pAssertBlock(editor, true);
        api.unblock();
        await pAssertBlock(editor, false);
        DialogUtils.close(editor);
      });
    });
  });
});
