module.exports = {
    extends: 'gemini-testing',
    root: true,

    "rules": {

        ////////// Possible Errors //////////

        "no-cond-assign": 2,                  // disallow assignment in conditional expressions
        "no-constant-condition": 0,           // disallow use of constant expressions in conditions
        "no-control-regex": 2,                // disallow control characters in regular expressions
        "no-debugger": 2,                     // disallow use of debugger
        "no-dupe-args": 2,                    // disallow duplicate arguments in functions
        "no-dupe-keys": 2,                    // disallow duplicate keys when creating object literals
        "no-duplicate-case": 2,               // disallow a duplicate case label
        "no-empty-character-class": 2,        // disallow the use of empty character classes in regular expressions
        "no-ex-assign": 2,                    // disallow assigning to the exception in a catch block
        "no-extra-boolean-cast": 2,           // disallow double-negation boolean casts in a boolean context
        "no-extra-parens": ["error", "all"],  // disallow unnecessary parentheses (off by default)
        "no-extra-semi": 2,                   // disallow unnecessary semicolons
        "no-func-assign": 2,                  // disallow overwriting functions written as function declarations
        "no-inner-declarations": 2,           // disallow function or variable declarations in nested blocks
        "no-invalid-regexp": 2,               // disallow invalid regular expression strings in the RegExp constructor
        "no-irregular-whitespace": 2,         // disallow irregular whitespace outside of strings and comments
        "no-negated-in-lhs": 2,               // disallow negation of the left operand of an in expression
        "no-obj-calls": 2,                    // disallow the use of object properties of the global object (Math and JSON) as functions
        "no-regex-spaces": 2,                 // disallow multiple spaces in a regular expression literal
        "no-sparse-arrays": 2,                // disallow sparse arrays
        "no-unexpected-multiline": 2,         // Avoid code that looks like two expressions but is actually one (off by default)
        "no-unreachable": 2,                  // disallow unreachable statements after a return, throw, continue, or break statement
        "no-unsafe-finally": 2,               // disallow control flow statements in finally blocks
        "use-isnan": 2,                       // disallow comparisons with the value NaN
        "valid-typeof": 2,                    // Ensure that the results of typeof are compared against a valid string

        ////////// Best Practices //////////

        "accessor-pairs": 0,                // enforces getter/setter pairs in objects (off by default)
        "array-callback-return": 2,         // enforce return statements in callbacks of array methods
        "block-scoped-var": 0,              // treat var statements as if they were block scoped (off by default)
        "curly": 2,                         // specify curly brace conventions for all control statements
        "default-case": 2,                  // require default case in switch statements (off by default)
        "dot-location": [2, "property"],    // enforces consistent newlines before or after dots (off by default)
        "eqeqeq": 2,                        // require the use of === and !==
        "guard-for-in": 0,                  // make sure for-in loops have an if statement (off by default)
        "no-alert": 2,                      // disallow the use of alert, confirm, and prompt
        "no-caller": 2,                     // disallow use of arguments.caller or arguments.callee
        "no-case-declarations": 2,          // disallow lexical declarations in case clauses
        "no-div-regex": 2,                  // disallow division operators explicitly at beginning of regular expression (off by default)
        "no-else-return": 2,                // disallow else after a return in an if (off by default)
        "no-empty-pattern": 2,              // disallow empty destructuring patterns
        "no-eq-null": 2,                    // disallow comparisons to null without a type-checking operator (off by default)
        "no-eval": 2,                       // disallow use of eval()
        "no-extend-native": 2,              // disallow adding to native types
        "no-extra-bind": 2,                 // disallow unnecessary function binding
        "no-extra-label": 2,                // disallow unnecessary labels
        "no-fallthrough": 2,                // disallow fallthrough of case statements
        "no-floating-decimal": 2,           // disallow the use of leading or trailing decimal points in numeric literals (off by default)
        "no-implicit-globals": 2,           // disallow var and named function declarations in the global scope
        "no-implied-eval": 2,               // disallow use of eval()-like methods
        "no-invalid-this": 0,               // disallow this keywords outside of classes or class-like objects
        "no-iterator": 2,                   // disallow usage of __iterator__ property
        "no-labels": 2,                     // disallow use of labeled statements
        "no-lone-blocks": 2,                // disallow unnecessary nested blocks
        "no-loop-func": 2,                  // disallow creation of functions within loops
        "no-magic-numbers": 0,              // disallow magic numbers
        "no-multi-spaces": 2,               // disallow use of multiple spaces
        "no-multi-str": 2,                  // disallow use of multiline strings
        "no-native-reassign": 2,            // disallow reassignments of native objects
        "no-new-func": 2,                   // disallow use of new operator for Function object
        "no-new-wrappers": 2,               // disallows creating new instances of String, Number, and Boolean
        "no-new": 2,                        // disallow use of new operator when not part of the assignment or comparison
        "no-octal-escape": 2,               // disallow use of octal escape sequences in string literals, such as var foo = "Copyright \251";
        "no-octal": 2,                      // disallow use of octal literals
        "no-proto": 2,                      // disallow usage of __proto__ property
        "no-script-url": 2,                 // disallow use of javascript: urls
        "no-self-assign": 2,                // disallow assignments where both sides are exactly the same
        "no-self-compare": 2,               // disallow comparisons where both sides are exactly the same (off by default)
        "no-sequences": 2,                  // disallow use of comma operator
        "no-unused-expressions": 2,         // disallow usage of expressions in statement position
        "no-unused-labels": 2,              // disallow unused labels
        "no-useless-call": 2,               // disallow unnecessary calls to .call() and .apply()
        "no-useless-concat": 2,             // disallow unnecessary concatenation of literals or template literals
        "no-useless-escape": 2,             // disallow unnecessary escape characters
        "no-void": 2,                       // disallow use of void operator (off by default)
        "no-warning-comments": 2,           // disallow usage of configurable warning terms in comments, e.g. TODO or FIXME (off by default)
        "no-with": 2,                       // disallow use of the with statement
        "radix": 2,                         // require use of the second argument for parseInt() (off by default)
        "wrap-iife": 2,                     // require immediate function invocation to be wrapped in parentheses (off by default)
        "yoda": 2,                          // require or disallow Yoda conditions
    }
};
