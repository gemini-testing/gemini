# Создание тестов в Gemini

Для тестируемого блока необходимо составить один или несколько *наборов тестов*.
Каждый набор должен содержать несколько *состояний*, которые нужно проверить. Для каждого состояния необходимо указать *последовательность действий*, приводящую блок к данному состоянию.

## Определение тестовых наборов

Наборы тестов определяются методом `gemini.suite`.

**Пример**:

```javascript
    var gemini = require('gemini');
    gemini.suite('button', function(suite) {
        suite
            .setUrl('/path/to/page')
            .setCaptureElements('.button')
            .before(function(actions, find) {
            	this.button = find('.buttons');
            })
            .capture('plain')
            .capture('hovered', function(actions, find) {
                actions.mouseMove(this.button);
            })
            .capture('pressed', function(actions, find) {
                actions.mouseDown(this.button);
            })
            .capture('clicked', function(actions, find) {
                actions.mouseUp(this.button);
            });
    });
```

Аргументы `gemini.suite`:

* `name` – название нового тестового набора, которое отображается в отчетах и названиях снимков экрана;
* `callback(suite)` – функция обратного вызова. Используется для настройки тестового набора. Получает экземпляр класса *SuiteBuilder*, описанного ниже.

## Методы класса SuiteBuilder

Все методы можно связать в цепочку:

* `setUrl(url)` – указывает адрес веб-страницы, снимок которой необходимо сделать.
  Адрес задается относительно поля `rootUrl` конфигурационного файла.
* `setCaptureElements('selector1', 'selector2', ...})` – указывает CSS-селекторы элементов для определения области веб-страницы, снимок которой нужен для теста.

  Захватываемая для снимка область экрана определяется минимальным прямоугольником, который включает в себя все необходимые элементы и размеры их `box-shadow`.

  Метод также может принимать массив:

  ```
      suite.setCaptureElements(['.selector1', '.selector2']);
  ```
**NB**: Все тесты из набора будут неуспешными, если хотя бы один из элементов не будет найден.

* `ignoreElements('selector1', 'selctor2')` - элементы, попадающие под заданный селектор будут проигнорированы при сравнении скриншотов.

* `setTolerance(value)` – перезаписывает предельно допустимое различие между цветами для всего набора.
  (Подробности смотрите в описании опции `tolerance` в документации по [настройке gemini](/doc/config.ru.md)).

* `skip([browser])` – пропустить все тесты и вложенные наборы:
    - `skip()` – для всех браузеров;
    - `skip(browserName)` или `skip({browserName: browserName})` – для всех версий указанного браузера;
    - `skip({browserName: browserName, version: browserVersion})` – только для указанной версии браузера;
    - `skip([browser1, browser2, ...])` – для нескольких браузеров или версий.

  Все браузеры из последующих вызовов `skip()` добавляются в список пропускаемых. Таким образом,

    ```javascript
        suite.skip({browserName: 'browser1', version: '1.0'})
            .skip('browser2');
    ```
   эквивалентно

    ```javascript
        suite.skip([
            {browserName: 'browser1', version: '1.0'},
            'browser2'
        ]);
    ```

* `capture(stateName, [options], callback(actions, find))` – определяет новое состояние для тестирования.

  Опциональная функция обратного вызова описывает последовательность действий, которая приводит страницу к данному состоянию. Новый цикл действий, приводящий к новому состоянию, всегда начинается от **предыдущего** и выполняется последовательно в порядке объявления, без перезапуска браузера между этапами выполнения.

  Функция обратного вызова принимает два аргумента:
   * `actions` – объект, методы которого можно связать в цепочку. Используется для определения выполнения ряда действий.
   * `find(selector)` –  функция поиска элемента, перед началом работы с ним.
     Поиск является отложенным и выполняется только при первом обращении к данному элементу.
     Поиск будет выполнен один раз для каждого вызова `find`. Если вам необходимо выполнить несколько действий над одним и тем же элементом, сохраните результат в переменную:

    ```javascript
        .capture('name', function(actions, find) {
            var button = find('.button');
            actions.mouseDown(button)
                .mouseUp(button);
        });
    ```
  Параметр `options` позволяет задать предельно допустимое различие между цветами для отдельного состояния:

  ```js
  .capture('name', {tolerance: 30}, function(actions, find) {
  });
  ```
  Подробности смотрите в описании опции `tolerance` в документации по [настройке gemini](/doc/config.ru.md).

* `before(callback(actions, find))` – используйте данную функцию для выполнения кода до первого состояния. Аргументы функции аналогичны аргументам `capture`.

  Контекст является общим для обратного вызова `before` и всех других обратных вызовов состояния набора, что позволяет производить поиск нужного элемента один раз для всего набора. При этом результат будет всегда актуален.

    ```javascript
        suite.before(function(actions, find) {
            this.button = find('.buttons');
        })
        .capture('hovered', function(actions, find) {
            actions.mouseMove(this.button);
        })
        .capture('pressed', function(actions, find) {
            actions.mouseDown(this.button);
        })
    ```

## Вложенные наборы

Наборы могут быть вложенными. В этом случае внутренний набор наследует от внешнего `url` и `captureElements`.
Эти свойства могут быть переопределены во внутренних наборах, не оказывая влияния на внешние.
Каждый новый набор вызывает перезапуск браузера, даже если адрес страницы не меняется.

**Пример**:

    ```javascript
        var gemini = require('gemini');

        gemini.suite('parent', function(parent) {
            parent.setUrl('/some/path')
                .setCaptureElements('.selector1', '.selector2');
                .capture('state');

            gemini.suite('first child', function(child) {
                //данный набор захватывает один и тот же элемент на разных страницах
                child.setUrl('/other/path')
                    .capture('other state');
            });

            gemini.suite('second child', function(child) {
                //данный набор захватывает разные элементы на одной и той же странице
                child.setCaptureElements('.next-selector'})
                    .capture('third state', function(actions, elements) {
                        // ...
                    })

                gemini.suite('grandchild', function(grandchild) {
                    //у внутренних наборов могут быть свои вложенные наборы
                    grandchild.capture('fourth state');

                });
            });

            gemini.suite('third child', function(child) {
                //у этого набора абсолютно другие URL и набор элементов
                child.setUrl('/some/another/path')
                    .setCaptureElements('.different-selector');
                    .capture('fifth state');
            });
        });
    ```

## Доступные действия

Объект `actions` позволяет вам запрограммировать ряд шагов, которые приведут блок в необходимое состояние. Все вызовы можно объединить в цепочку. Таким образом, каждый последующий шаг будет выполняться после завершения предыдущего. В списке, представленном ниже, `element` может бы как CSS-селектором, так и результатом вызова `find`.

* `click(element)` – клик мышью по центру элемента.
* `doubleClick(element)` – двойной клик мышью по центру элемента.
* `mouseDown(element, [button])` – нажатие кнопкой мыши на центр элемента. Возможные значения кнопки: 0 – левая, 1 – средняя, 2 – правая. По умолчанию используется левая кнопка.
* `mouseUp(element)` – отпускание кнопки мыши.
* `mouseMove(element, [offset])` – навести курсор на нужный элемент. Смещение задается относительно левого верхнего угла элемента. По умолчанию, курсор наводится на центр элемента.
* `dragAndDrop(element, dragTo)` – перетаскивание `element` в другой `dragTo`-элемент.
* `flick(speed, swipe)` - флик по экрану с заданной скоростью `speed.x` и `speed.y`.
* `flick(offsets, speed, element)` - флик по элементу, начиная с его центра и заканчивая в соответствии смещениям
   `offsets.x` и `offset.y`.
* `executeJS(function(window))` – запуск указанной функции в браузере. Аргументом функции является объект браузера `window`:

    ```javascript
        actions.executeJS(function(window) {
            window.alert('Hello!');
        });
    ```
**NB**: Функция выполняется в контексте браузера, поэтому любые ссылки на её внешний контекст работать не будут.

* `wait(milliseconds)` – ожидание указанного времени до выполнения следующего действия. Если действие является последним в списке, откладывает снятие скриншота на этот период времени.
* `waitForElementToShow(selector, [timeout])` - ждет пока на странице появится элемент, попадающий под `selector`.
  Завершается с ошибкой, если по истечении `timeout` миллисекунд элемент так и не появился (по умолчанию 1000).
* `waitForElementToHide(selector, [timeout])` - ждет пока элемент, попадающий под `selector`, пропадет со страницы.
  Завершается с ошибкой, если по истечении `timeout` миллисекунд элемент все еще отображается (по умолчанию 1000).
* `waitForJSCondition(function(window), timeout)` - ждет пока указанная функция вернет `true`. Функция выполняется
  в контексте браузера, поэтому ссылки на объекты из внешней области видимости работать не будут. Завершается с
  ошибкой, если по истечении `timeout` миллисекунд функция все еще возвращает `false` (по умолчанию 1000).
* `sendKeys([element], keys)` – отправляет серию нажатий на клавиатуру к указанному или к активному в данный момент элементу страницы.
Вы можете отправить специальную клавишу, используя одну из предусмотренных констант, а именно:

    ```javascript
        actions.sendKeys(gemini.ARROW_DOWN);
    ```
Полный список специальных ключей (у некоторых ключей есть сокращенная запись):

`NULL`, `CANCEL`, `HELP`, `BACK_SPACE`, `TAB`, `CLEAR`, `RETURN`, `ENTER`, `LEFT_SHIFT` ⇔ `SHIFT`,
`LEFT_CONTROL` ⇔ `CONTROL`, `LEFT_ALT` ⇔ `ALT`, `PAUSE`, `ESCAPE`, `SPACE`, `PAGE_UP`, `PAGE_DOWN`, `END`, `HOME`,
`ARROW_LEFT` ⇔ `LEFT`, `ARROW_UP` ⇔ `UP`, `ARROW_RIGHT` ⇔ `RIGHT`, `ARROW_DOWN` ⇔ `DOWN`, `INSERT`, `DELETE`,
`SEMICOLON`, `EQUALS`, `NUMPAD0`, `NUMPAD1`, `NUMPAD2`, `NUMPAD3`, `NUMPAD4`, `NUMPAD5`, `NUMPAD6`, `NUMPAD7`,
`NUMPAD8`, `NUMPAD9`, `MULTIPLY`, `ADD`, `SEPARATOR`, `SUBTRACT`, `DECIMAL`, `DIVIDE`, `F1`, `F2`, `F3`, `F4`, `F5`,
`F6`, `F7`, `F8`, `F9`, `F10`, `F11`, `F12`, `COMMAND` ⇔ `META`, `ZENKAKU_HANKAKU`.

* `sendFile(element, path)` – выбор файла в заданном элементе `input[type=file]`. `path` должен существовать
  в локальной системе (там же, где запущен `gemini`).
* `focus(element)` – устанавливает фокус на указанный элемент.
* `setWindowSize(width, height)` – устанавливает размера окна браузера.
* `tap(element)` - делает тап по элементу на устройстве с тач интерфейсом.
