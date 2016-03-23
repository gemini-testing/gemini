/**
 * @typedef {Object} StateResult
 * @property {String} stateName
 * @property {String} suiteId
 * @property {String} suitePath
 * @property {String} suiteName
 * @property {String} browserId
 */

/**
 * @typedef {StateResult} TestStateResult
 * @property {Boolean} equal
 * @property {Function} saveDiffTo
 * @property {String} referencePath
 * @property {String} currentPath
 */

/**
 * @typedef {StateResult} WarningStateResult
 * @property {String} message
 */

/**
 * @typedef {StateResult} ErrorStateResult
 * @property {String} [stack]
 * @property {String} [message]
 */

/**
 * @typedef {Object} ViewModelResult
 * @property {String} suites
 * @property {Number} total
 * @property {Number} passed
 * @property {Number} failed
 * @property {Number} skipped
 * @property {Number} retries
 */
