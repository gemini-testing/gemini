# Введение в работу с Gemini

[Gemini](https://github.com/gemini-testing/gemini) – это утилита для
регрессионного тестирования отображения веб-страниц.

Ключевые возможности:

* Работа в различных браузерах:

  - Google Chrome (тестируется в последней версии)

  - Mozilla Firefox (тестируется в последней версии)

  - [IE8+](doc/ie-support.md)

  - Opera 12+;

* Тестирование фрагментов веб-страниц;

* Учет свойств `box-shadow` и `outline` при вычислении позиции и размера
  элемента;

* Игнорирование не ошибочных различий между изображениями (артефакты
  рендеринга, текстовая каретка);

* Сбор статистики покрытия CSS-кода тестами.

Gemini создан в [Яндексе](http://www.yandex.com/) и используется
разработчиками библиотек блоков.

Данный документ шаг за шагом описывает установку и настройку `Gemini`
и предназначен для быстрого старта работы с утилитой.

## Установка стороннего ПО

Перед началом работы с `Gemini` необходимо установить следующее программное
обеспечение:

1. Сервер WebDriver. Существует несколько вариантов:

   - [Selenium Server](http://docs.seleniumhq.org/download/) – для
     тестирования в различных браузерах.

   - [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/) - for
     для тестирования в Google Chrome.

   - [PhantomJS](http://phantomjs.org/) — запускать командой `phantomjs
     --webdriver=4444`.

   - Облачные сервисы, например [SauceLabs] (http://saucelabs.com/) или
     [BrowserStack](http://www.browserstack.com/)

2. Компилятор с поддержкой C++11 (Например, `GCC@4.6` и выше). Это требование
   пакета [png-img](https://github.com/gemini-testing/png-img).


## Установка Gemini

### Глобальная установка

Для установки утилиты используется команда `install` пакетного менеджера
[npm](https://www.npmjs.org/):

```
npm install -g gemini
```

Глобальная инсталляция будет использоваться для запуска команд.

### Локальная установка

Для написания тестов нам также понадобится локальная инсталляция `Gemini`.
В папке проекта выполните команду:

```
npm install gemini
```

## Настройка

Настройка утилиты происходит путем редактирования конфигурационного файла
`.gemini.yml`, который расположен в корневой папке проекта. Для примера мы
будем запускать тесты в локально установленном `PhantomJS`.

В этом случае, минимальная конфигурация будет содержать только корневой адрес
вашего сайта и требований к `PhantomJS` для WebDriver. Например:

```yaml
rootUrl: http://yandex.com
browsers:
  PhantomJS:
    desiredCapabilities:
      browserName: phantomjs
```


Также, в этом случае необходимо вручную запустить `PhantomJS` в режиме
`WebDriver`:

```
phantomjs --webdriver=4444
```

В случае, если вы используете удаленный серевер WebDriver, вы можете указать
его адрес с помощью опции `gridUrl`:

```yaml
rootUrl: http://yandex.com
gridUrl: http://selenium.example.com:4444/wd/hub

browsers:
  chrome:
    desriedCapabilities:
      browserName: chrome
      version: "45.0"

  firefox:
    desriedCapabilities:
      browserName: firefox
      version: "39.0"

```

Вы также можете указать отдельный адрес сервера для каждого бразуера:

```yaml
rootUrl: http://yandex.com

browsers:
  gridUrl: http://chrome-node.example.com:4444/wd/hub
  chrome:
    desriedCapabilities:
      browserName: chrome
      version: "45.0"

  firefox:
    gridUrl: http://firefox-node.example.com:4444/wd/hub
    desriedCapabilities:
      browserName: firefox
      version: "39.0"

```

### Другие настройки

[Подробнее](doc/config.ru.md) о структуре конфигурационного файла и доступных
опциях.

## Создание тестов

Каждый тестируемый блок может находиться в одном из нескольких фиксированных
состояний. Состояния проверяются при помощи цепочек последовательных действий,
описанных в тестовых наборах блока.

Для примера, напишем тест для поискового блока на
[yandex.com](http://www.yandex.com):

```javascript
var gemini = require('gemini');

gemini.suite('yandex-search', function(suite) {
    suite.setUrl('/')
        .setCaptureElements('.main-table')
        .capture('plain')
        .capture('with text', function(actions, find) {
            actions.sendKeys(find('.input__control'), 'hello gemini');
        });
});
```

Мы создаем новый тестовый набор `yandex-search` и говорим, что будем снимать
элемент `.main-table` c корневого URL `http://yandex.com`. При этом у блока
есть два состояния:

* `plain` – сразу после загрузки страницы;
* `with text` - c введенным в элемент `.input__control` текстом `hello gemini`.

Состояния выполняются последовательно в порядке определения, без перезагрузки
страницы между ними.

[Подробнее](doc/tests.ru.md) о методах создания тестов.

## Использование CLI

Для завершения создания теста необходимо сделать эталонные снимки используя
команду

```
gemini gather [путь к файлам тестов]
```

Для запуска тестов используется команда сравнения текущего состояния блока
с эталонным снимком:

```
gemini test [путь к файлам тестов]
```

Чтобы наглядно увидеть разницу между текущим изображением и эталоном (diff),
можно использовать функцию HTML-отчёта:

```
gemini test --reporter html [путь к файлам тестов]
```

или получить консольный и HTML отчёты одновременно:

```
gemini test --reporter html --reporter flat [путь к файлам с тестами]
```

[Подробнее](doc/commands.ru.md) о работе с командной строкой и доступных
аргументах.

## GUI

Вместо командной строки можно использовать графический интерфейс `Gemini`.
Соответствующий пакет
[gemini-gui](https://github.com/gemini-testing/gemini-gui) устанавливается
отдельно:

```
npm install -g gemini-gui
```

Преимущества GUI:

* Удобный просмотр эталонных изображений;

* Наглядная демонстрация различий между эталоном и текущим состоянием
  в реальном времени;

* Возможность лёгкого обновления эталонных изображений.

## Плагины

Gemini может быть расширен при помощи плагинов. Вы можете выбрать один из
[существующих плагинов](https://www.npmjs.com/browse/keyword/gemini-plugin)
или [написать свой собственный](doc/plugins.md). Чтобы использовать плагин,
установите и включите его в `.gemini.yml`:

```yaml
plugins:
  some-awesome-plugin:
    plugin-option: value
```

## Gemini API

Программный интерфейс Gemini позволяет использовать утилиту в качестве
инструмента тестирования в скриптах и инструментах сборки.

[Подробнее](doc/programmatic-api.ru.md) о Gemini API.
