# Конфигурация Gemini

Конфигурационный файл Gemini `.gemini.yml` находится в корне проекта.

**Пример содержимого файла**:

```yaml
rootUrl: http://site.example.com
gridUrl: http://selenium-grid.example.com:4444/wd/hub
browsers:
  phantomjs: phantomjs
  chrome: chrome
  opera12:
    browserName: opera
    version: '12.06'
  firefox28:
    browserName: firefox
    version: '28.0'
  firefox27:
    browserName: firefox
    version: '27.0'
```

Поля конфигурационного файла:

* `rootUrl` - корневой адрес вашего веб-сайта. Целевые адреса ваших тестов будут назначены относительно корневого URL.
* `gridUrl` - адрес Selenium Grid для создания скриншотов. Параметр обязателен, если тесты запускаются в каких-либо браузерах помимо PhantomJS.
* `browsers` - список браузеров, используемых для тестирования. Все браузеры должны быть доступны в Selenium Grid.

    Формат поля `browsers`:

    ```yaml
    browsers:
      $browser-id:
        browserName: $name
        version: $version
        # ... other browser capabilities as $key: $value
    ```  
Допустимо указывать несколько версий одного и того же браузера (только в том случае, если эти версии доступны в вашем экземпляре Selenium Grid). Если версия не указана, будет использована любая доступная версия браузера с указанным именем.

  Сокращенный вариант записи `$browser-id: {browserName: $name}` - `$browser-id: $name`.  
  
  Значение `$browser-id` используется для идентификации браузера в отчётах и в именах файлов скриншотов.

* `projectRoot` - корневой каталог проекта. Относительно этого каталога будут назначены все относительные
  пути в других настройках и опциях. По умолчанию, это каталог, в котором раположен конфигурационный файл.
* `screenshotsDir` - каталог для хранения файлов со снимками экрана, указанный относительно директории конфигурационного файла. По умолчанию – `gemini/screens`.
* `debug` - включить debug-вывод в терминал.
* `http.timeout` - таймаут запроса к Selenium Grid (мс).
* `http.retries` - количество попыток отправки запроса в Selenium Grid.
* `http.retryDelay` - пауза перед повторной отправкой запроса в Selenium Grid (мс).
* `windowSize` - размеры окна браузера. Например, `1600x1200`.