# Gemini events

* `updateResult` - emitted always during update. The event is emitted with 1 argument `result`:

    * `result.refPath` - absolute path to the reference image
    * `result.updated` - boolean value which is `true` when reference image have been changed and `false` when not
