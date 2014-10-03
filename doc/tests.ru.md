# Создание тестов в Gemini

Для блока, который будет тестироваться, необходимо составить составлены один или несколько *наборов тестов*.
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

* `name` - название нового тестового набора, которое отображается в отчетах и названиях снимков экрана;
* `callback(suite)` - функция обратного вызова. Используется для настройки тестового набора. Получает экземпляр класса *SuiteBuilder*, описанного ниже.

## Mетоды класса SuiteBuilder

Все методы можно связать в цепочку:

* `setUrl(url)` - указывает адрес веб-страницы, снимок которой необходимо сделать.
  Адрес задается относительно поля `rootUrl` конфигурационного файла.
* `setCaptureElements('selector1', 'selector2', ...})` - указывает CSS-селекторы элементов для определения области веб-страницы, снимок которой нужен для теста.

  Захватываемая для снимка область экрана определяется минимальным прямоугольником, который включает в себя все необходимые элементы и их размеры `box-shadow`.

  Метод также может принимать массив:

  ```
      suite.setCaptureElements(['.selector1', '.selector2']);
  ```
**NB**: Все тесты из набора будут неуспешными, если хотя бы один из элементов не будет найден.

* `skip([browser])` - пропустить все тесты и вложенные наборы:
    - `skip()` - для всех браузеров;
    - `skip(browserName)` или `skip({browserName: browserName})` - для всех версий указанного браузера;
    - `skip({browserName: browserName, version: browserVersion})` - только для указанной версии браузера;
    - `skip([browser1, browser2, ...])` - для нескольких браузеров или версий.

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

* `capture(stateName, callback(actions, find))` - определяет новое состояние снимка.
  
  Опциональная функция обратного вызова описывает последовательность действий, которая приводит страницу к данному состоянию. Новый цикл действий, приводящий к новому состоянию, всегда начинается от **предыдущего** и выполняется последовательно в порядке объявления, без перезапуска браузера между этапами выполнения.

  Функция обратного вызова принимает два аргумента:
   * `actions` - объект, методы которого можно связать в цепочку. Используется для определения выполнения ряда действий.
   * `find(selector)` -  функция поиска элемента, перед началом работы с ним.
     Поиск является отложенным и выполняется только при первом обращении к данному элементу.
     Поиск будет выполнен один раз для каждого вызова `find`. Если вам необходимо выполнить несколько действий над одним и тем же элементом, сохраните результат в переменную:

    ```javascript
        .capture('name', function(actions, find) {
            var button = find('.button');
            actions.mouseDown(button)
                .mouseUp(button);
        });
    ```

* `before(callback(actions, find))` - используйте данную функцию для выполнения кода до первого состояния. Данные аргументы функции обратного вызова одинаковы и для функции обратного вызова `capture`.
  
  Контекст является общим для обратного вызова `before` и всех других обратных вызовов состояния набора. Можно использовать этот прием для поиска нужного элемента один раз для всего набора, и результат будет всегда актуален.

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

        gemin.suite('parent', function(parent) {
            parent.setUrl('/some/path')
                .setCaptureElements('.selector1', '.selector2');
                .capture('state');

            gemini.suite('first child', function(child) {
                //данный набор фиксирует один и тот же элемент на разных страницах
                child.setUrl('/other/path')
                    .capture('other state');
            });

            gemini.suite('second child', function(child) {
                //данный набор фиксирует разные элементы на одной и той же странице
                child.setCaptureElements('.next-selector'})
                    .capture('third state', function(actions, elements) {
                        // ...
                    })

                gemini.suite('grandchild', function(grandchild) {
                    //child suites can have own childs
                    grandchild.capture('fourth state');

                });
            });

            gemini.suite('third child', function(child) {
                //this child uses completely different URL and set
                //of elements
                child.setUrl('/some/another/path')
                    .setCaptureElements('.different-selector');
                    .capture('fifth state');
            });
        });
    ```

## Доступные действия

При вызове методов аргумента `actions` обратного вызова, у вас есть возможность запрограммировать ряд шагов, которые приведут блок в необходимое состояние. Все вызовы можно объединить в цепочку. Таким образом, каждый последующий шаг будет выполняться после завершения предыдущего. В списке, представленном ниже, `element` может бы как CSS-селектором, так и результатом вызова `find`.

* `click(element)` - клик мышью по центру элемента.
* `doubleClick(element)` - двойной клик мышью по центру элемента.
* `mouseDown(element, [button])` - нажатие кнопкой мыши на центр элемента. Возможные значения кнопки: 0 - левая, 1 - средняя, 2 - правая. По умолчанию используется левая кнопка.
* `mouseUp(element)` - отпускание кнопки мыши.
* `mouseMove(element, [offset])` - наведение курсора на элемент. Смещение задается относительно центра элемента. По умолчанию `{x: 0, y: 0}`.
* `dragAndDrop(element, dragTo)` - перетаскивание `element` в другой `dragTo`-элемент.
* `executeJS(function(window))` - запуск указанной функции в браузере. Аргументом функции является объект браузера `window`:

    ```javascript
        actions.executeJS(function(window) {
            window.alert('Hello!');
        });
    ```
**NB**: Функция выполняется в контексте браузера, поэтому любые ссылки на внешний контекст обратного вызова работать не будут.

* `wait(milliseconds)` - ожидание указанного времени до выполнения следующего действия. Если действие является последним в списке, откладывает снятие скриншота на этот период времени.
* `sendKeys([element], keys)` - отправляет серию нажатий на клавиатуру к указанному или к активному в данный момент элементу страницы.  
Вы можете отправить специальную клавишу, используя один из предусмотренных констант, а именно:

    ```javascript
        actions.sendKeys(gemini.ARROW_DOWN);
    ```
Полный список специальных ключей:

    `NULL`, `CANCEL`, `HELP`, `BACK_SPACE`, `TAB`, `CLEAR`, `RETURN`, `ENTER`, `SHIFT`, `LEFT_SHIFT `, `CONTROL`,
    `LEFT_CONTROL`, `ALT`, `LEFT_ALT`, `PAUSE`, `ESCAPE`, `SPACE`, `PAGE_UP`, `PAGE_DOWN`, `END`, `HOME`, `LEFT`,
    `ARROW_LEFT`, `UP`, `ARROW_UP`, `RIGHT`, `ARROW_RIGHT`, `DOWN,`, `ARROW_DOWN`, `INSERT`, `DELETE`, `SEMICOLON`,
    `EQUALS`, `NUMPAD0`, `NUMPAD1`, `NUMPAD2`, `NUMPAD3`, `NUMPAD4`, `NUMPAD5`, `NUMPAD6`, `NUMPAD7`, `NUMPAD8`,
    `NUMPAD9`, `MULTIPLY`, `ADD`, `SEPARATOR`, `SUBTRACT`, `DECIMAL`, `DIVIDE`, `F1`, `F2`, `F3`, `F4`, `F5`,
    `F6`, `F7`, `F8`, `F9`, `F10`, `F11`, `F12`, `COMMAND`, `META`, `ZENKAKU_HANKAKU`.

* `focus(element)` - устанавливает фокус на указанный элемент.
* `setWindowSize(width, height)` - устанавливает размера окна браузера.