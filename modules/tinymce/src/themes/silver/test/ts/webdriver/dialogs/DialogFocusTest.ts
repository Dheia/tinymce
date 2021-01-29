import { FocusTools, PhantomSkipper, RealMouse } from '@ephox/agar';
import { TestHelpers } from '@ephox/alloy';
import { after, before, describe, it } from '@ephox/bedrock-client';
import { Fun } from '@ephox/katamari';
import { PlatformDetection } from '@ephox/sand';
import { SugarDocument, SugarElement } from '@ephox/sugar';
import { WindowManagerImpl } from 'tinymce/core/api/WindowManager';

import * as WindowManager from 'tinymce/themes/silver/ui/dialog/WindowManager';

import TestExtras from '../../module/TestExtras';

describe('webdriver.tinymce.themes.silver.dialogs.DialogFocusTest', () => {
  before(function () {
    const platform = PlatformDetection.detect();

    // This test won't work on PhantomJS or on all Mac OS browsers (webdriver actions appear to be ignored)
    if (PhantomSkipper.detect() || platform.os.isOSX()) {
      this.skip();
    }
  });

  let helpers: TestExtras;
  let windowManager: WindowManagerImpl;
  let style: SugarElement<HTMLStyleElement>;
  before(() => {
    helpers = TestExtras();
    windowManager = WindowManager.setup(helpers.extras);
    style = TestHelpers.GuiSetup.addStyles(SugarDocument.getDocument(), [
      '[role="dialog"] { border: 1px solid black; padding: 2em; background-color: rgb(131,193,249); top: 40px; position: absolute; }',

      ':focus { outline: 3px solid green; !important; }'
    ]);
  });

  after(() => {
    TestHelpers.GuiSetup.removeStyles(style);
    helpers.destroy();
  });

  it('Check dialog component can be focused', async () => {
    windowManager.open({
      title: 'Custom Dialog',
      body: {
        type: 'panel',
        items: [
          {
            name: 'input1',
            type: 'input'
          }
        ]
      },
      buttons: [
        {
          type: 'cancel',
          text: 'Close'
        }
      ],
      initialData: {
        input1: 'Dog'
      }
    }, { }, Fun.noop);

    await FocusTools.pTryOnSelector(
      'focus should start on input',
      SugarDocument.getDocument(),
      '.tox-textfield'
    );

    await RealMouse.pClickOn('body');

    await FocusTools.pTryOnSelector(
      'focus should be on body',
      SugarDocument.getDocument(),
      'body'
    );

    await RealMouse.pClickOn('.tox-dialog');

    await FocusTools.pTryOnSelector(
      'focus should move to input after clicking on the dialog',
      SugarDocument.getDocument(),
      '.tox-textfield'
    );

    await RealMouse.pClickOn('body');

    await FocusTools.pTryOnSelector(
      'focus should be on body (again)',
      SugarDocument.getDocument(),
      'body'
    );

    await RealMouse.pClickOn('.tox-dialog__footer');

    await FocusTools.pTryOnSelector(
      'focus should move to input after clicking on the dialog footer',
      SugarDocument.getDocument(),
      '.tox-textfield'
    );
  });
});
