import { ApproxStructure, Assertions, Chain, GeneralSteps, Guard, Logger, Step, UiControls, Waiter } from '@ephox/agar';
import { UnitTest } from '@ephox/bedrock';
import { Cell, Future, Option, Result } from '@ephox/katamari';
import { Value, Attr } from '@ephox/sugar';
import * as Behaviour from 'ephox/alloy/api/behaviour/Behaviour';
import { Invalidating } from 'ephox/alloy/api/behaviour/Invalidating';
import * as GuiFactory from 'ephox/alloy/api/component/GuiFactory';
import * as AlloyTriggers from 'ephox/alloy/api/events/AlloyTriggers';
import { Container } from 'ephox/alloy/api/ui/Container';
import * as GuiSetup from 'ephox/alloy/test/GuiSetup';

UnitTest.asynctest('InvalidatingTest', (success, failure) => {

  const root = Cell(Option.none());

  GuiSetup.setup((store, doc, body) => {
    return GuiFactory.build({
        dom: {
          tag: 'input'
        },
        behaviours: Behaviour.derive([
          Invalidating.config({
            invalidClass: 'test-invalid',
            getRoot: root.get,
            notify: {},
            validator: {
              validate (input) {
                const value = Value.get(input.element());
                const res = value === 'good-value' ? Result.value('good-value') : Result.error('bad value: ' + value);
                return Future.pure(res);
              },
              onEvent: 'custom.test.validate'
            }
          })
        ])
      }
    );
  }, (doc, body, gui, component, store) => {

    // This will be used for the other root.
    const other = GuiFactory.build({
      dom: {
        tag: 'input'
      }
    });
    gui.add(other);

    const sCheckValidOf = (label, comp) => {
      return Logger.t(
        label,
        Step.control(

          Assertions.sAssertStructure(
            'Checking structure after marking valid',
            ApproxStructure.build((s, str, arr) => {
              return s.element('input', {
                classes: [
                  arr.not('test-invalid')
                ]
              });
            }),
            comp.element()
          ),
          Guard.tryUntil('valid', 100, 1000)
        )
      );
    };

    const sCheckInvalidOf = (label, comp) => {
      return Logger.t(
        label,
        Step.control(
          Assertions.sAssertStructure(
            'Checking structure after marking invalid',
            ApproxStructure.build((s, str, arr) => {
              return s.element('input', {
                classes: [
                  arr.has('test-invalid')
                ]
              });
            }),
            comp.element()
          ),
          Guard.tryUntil('invalid', 100, 100)
        )
      );
    };

    const sCheckValid = (label) => {
      return sCheckValidOf(label, component);
    };

    const sCheckInvalid = (label) => {
      return sCheckInvalidOf(label, component);
    };

    const sCheckIsInvalidOf = (label, comp, expected) => {
      return Logger.t(
        label,
        Step.control(
          Step.sync(() => {
            Assertions.assertEq(
              'Checking invalid status is: ' + expected,
              expected,
              Invalidating.isInvalid(comp)
            );
          }),
          Guard.tryUntil('invalid status was not: ' + expected, 100, 100)
        )
      );
    };

    const sCheckIsValid = (label) => {
      return sCheckIsInvalidOf(label, component, false);
    };

    const sCheckIsInvalid = (label) => {
      return sCheckIsInvalidOf(label, component, true);
    };

    const sCheckHasTitleOf = (label, comp, titlePrefix) => {
      return Logger.t(
        label,
        Step.control(
          Assertions.sAssertStructure(
            'Checking structure after marking invalid',
            ApproxStructure.build((s, str, arr) => {
              return s.element('input', {
                attrs: {
                  title: str.startsWith(titlePrefix)
                }
              });
            }),
            comp.element()
          ),
          Guard.tryUntil('valid', 100, 100)
        )
      );
    };

    const sCheckHasNoTitleOf = (label, comp) => {
      return Logger.t(
        label,
        Step.control(
          Assertions.sAssertStructure(
            'Checking structure after marking valid',
            ApproxStructure.build((s, str, arr) => {
              return s.element('input', {
                attrs: {
                  title: str.none()
                }
              });
            }),
            comp.element()
          ),
          Guard.tryUntil('invalid', 100, 100)
        )
      );
    };

    const sCheckHasTitle = (label, titlePrefix) => {
      return sCheckHasTitleOf(label, component, titlePrefix);
    };

    const sCheckHasNoTitle = (label) => {
      return sCheckHasNoTitleOf(label, component);
    };

    const sValidate = GeneralSteps.sequence([
      Step.sync(() => {
        AlloyTriggers.emit(component, 'custom.test.validate');
      }),
      // It is future based, so give it a bit of time. The rest of the assertions should all
      // repeat until as well to stop this being fragile. I just don't want it to pass incorrectly
      // because the validation hasn't finished yet.
      Step.wait(100)
    ]);

    const cQueryApi = Chain.on((value, next, die) => {
      Invalidating.query(component).get((res) => {
        next(Chain.wrap(res));
      });
    });

    const cRunApi = Chain.on((value, next, die) => {
      Invalidating.run(component).get((res) => {
        next(Chain.wrap(res));
      });
    });

    const cCheckValidationFails = (label, expected) => {
      return Chain.op((res: Result<any, any>) => {
        res.fold((err) => {
          Assertions.assertEq(label, expected, err);
        }, (val) => {
          throw new Error(label + ': Unexpected value: ' + val);
        });
      });
    };

    const cCheckValidationPasses = (label, expected) => {
      return Chain.op((res: Result<any, any>) => {
        res.fold((err) => {
          throw new Error(label + ': Unexpected error: ' + err);
        }, (val) => {
          Assertions.assertEq(label, expected, val);
        });
      });
    };

    return [
      GuiSetup.mAddStyles(doc, [
        '.test-invalid { outline: 3px solid red; }'
      ]),

      // Wait for the first thing to be invalid
      Waiter.sTryUntil(
        'A validation on load is configured, so wait for the first failure',
        sCheckInvalid('Should be invalid on load'),
        100,
        4000
      ),

      Step.sync(() => {
        Invalidating.markValid(component);
      }),

      sCheckValid('after 1xmarkValid, should be valid'),
      sCheckIsValid('the isInvalid API should return false'),
      sCheckHasNoTitle('the field should no longer have a title'),

      Step.sync(() => {
        Invalidating.markInvalid(component, 'programmatic bad value');
      }),

      sCheckInvalid('after markInvalid, should be invalid'),
      sCheckIsInvalid('the isInvalid API should return true'),
      sCheckHasTitle('the field should have a title', 'programmatic'),

      UiControls.sSetValueOn(gui.element(), 'input', 'good-value'),
      sValidate,
      sCheckValid('validation should have fixed it (eventually... because future based)'),

      UiControls.sSetValueOn(gui.element(), 'input', 'bad-value'),
      sValidate,
      sCheckInvalid('validation should fail (eventually... because future based)'),
      sCheckHasTitle('the field should have a title', 'bad value:'),

      Chain.asStep({ }, [
        cQueryApi,
        cCheckValidationFails('Querying "bad-value"', 'bad value: bad-value')
      ]),
      sCheckInvalid('validation should fail (eventually... because future based)'),

      UiControls.sSetValueOn(gui.element(), 'input', 'good-value'),
      Chain.asStep({ }, [
        cQueryApi,
        cCheckValidationPasses('Querying "good-value"', 'good-value')
      ]),
      sCheckInvalid('the query API should not change the classes on the input'),

      Chain.asStep({ }, [
        cRunApi,
        cCheckValidationPasses('Running on "good-value"', 'good-value')
      ]),
      sCheckValid('run API should update classes on the input to success'),

      UiControls.sSetValueOn(gui.element(), 'input', 'bad-value'),
      Chain.asStep({ }, [
        cRunApi,
        cCheckValidationFails('Running on "bad-value"', 'bad value: bad-value')
      ]),
      sCheckInvalid('run API should update classes on the input to failure'),

      Step.sync(() => {
        Invalidating.markValid(component);
      }),
      sCheckValid('Before changing getRoot, everything should be valid again'),

      sCheckValidOf('Other should initially be valid', other),
      Step.sync(() => {
        root.set(Option.some(other.element()));
      }),

      Chain.asStep({ }, [
        cRunApi,
        cCheckValidationFails('Running on "bad-value"', 'bad value: bad-value')
      ]),
      sCheckInvalidOf('After running validation, the "other" should be invalid now', other),
      sCheckValid('The first input should stay valid the whole time'),

      UiControls.sSetValueOn(gui.element(), 'input', 'good-value'),
      Chain.asStep({ }, [
        cRunApi,
        cCheckValidationPasses('Running on "good-value"', 'good-value')
      ]),
      sCheckValidOf('After running validation, the "other" should be valid now', other),
      sCheckValid('The first input should stay valid the whole time'),

      Step.sync(() => {
        Invalidating.markInvalid(component, 'programmatic bad value');
      }),
      sCheckInvalidOf('After running markInvalid, the "other" should be invalid again', other),
      sCheckValid('The first input should stay valid the whole time'),

      Step.sync(() => {
        Invalidating.markValid(component);
      }),
      sCheckValidOf('After running markValid, the "other" should be valid again', other),
      sCheckValid('The first input should stay valid the whole time'),

      GuiSetup.mRemoveStyles
    ];
  }, () => { success(); }, failure);
});
