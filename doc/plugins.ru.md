# Написание плагинов

Плагин Gemini — это обычный npm-пакет с именем `gemini-<имя плагина>`. Модуль
должен экспортировать единственную функцию, принимающую экземпляр класса 
`Gemini` и указанные пользователем опции. Например:

```js
module.exports = function(gemini, options) {
    console.log('Привет из плагина');
};
```

Документацию на объект `gemini` можно найти в разделе
[Программный API](programmatic-api.ru.md).

Опции задаются пользователем в конфигурационном файле и передаются плагину без
изменений. Например:

.gemini.yml:
```yaml
plugins:
  greeter:
    name: Mr. Incredible 
```

Плагин:
```javascript
module.exports = function(gemini, options) {
    console.log('Hello, %s' options.name);
};

```

При публикации плагина, добавьте `gemini-plugin` в раздел `keywords` в вашем
`package.json`. Это поможет пользователям найти ваш плагин.
