/**
 * @file Tree-sitter grammar definition for GritQL
 * @author Iuvo AI, Inc.
 * @license MIT
 */

const PREC = {
  NOT: 0,
  AND_IN_LINE: 3,
  OR_IN_LINE: 2,
  PATTERN_AS: 10,
  MUL: 8,
  DIV: 8,
  MOD: 8,
  ADD: 7,
  SUB: 7,
  REWRITE: 3,
  ACCUMULATE: 3,
  PATTERN_LIMIT: 1,
  PATTERN_WHERE: 1,
  PATTERN: -20,
};

module.exports = grammar({
  name: 'gritql',

  extras: ($) => [$.comment, /\s/],

  word: ($) => $.name,

  conflicts: ($) => [[$.source_file]],

  rules: {
    source_file: ($) =>
      seq(
        field('version', optional($.version)),
        field('language', optional($.langdecl)),
        field('definitions', listWithSeparator($.definition, '\n')),
        optional(field('pattern', $._pattern)),
        field('definitions', listWithSeparator($.definition, '\n')),
      ),

    sequential: ($) => seq('sequential', '{', field('sequential', commaSep1($._pattern)), '}'),
    files: ($) => seq('multifile', '{', field('files', commaSep1($._pattern)), '}'),

    // todo definition should be hidden _definition and we should get rid of the fields
    // match on node type instead of the field.
    definition: ($) =>
      choice(
        field('pattern', $.patternDefinition),
        field('predicate', $.predicateDefinition),
        field('function', $.functionDefinition),
        field('foreign', $.foreignFunctionDefinition),
      ),

    version: ($) => seq('engine ', 'marzano', '(', $.doubleConstant, ')'),

    // how many flavors possible?
    language_flavor: (_$) =>
      token(
        choice(
          // JavaScript flavors:
          'flow',
          'flowComments',
          'typescript',
          'jsx',
          // Technically raw JS is supported, but we encourage using typescript in most cases - it will match raw JS fine
          'js_do_not_use',
          // Markflow flavors:
          'inline',
          'block',
          // PHP flavors:
          'only',
          'html',
        ),
      ),

    langdecl: ($) =>
      prec.right(
        seq(
          'language',
          field('name', $.languageName),
          optional(seq('(', field('flavor', $.language_flavor), ')', optional(';'))),
        ),
      ),
    // --- patterns

    _pattern: ($) =>
      prec(
        PREC.PATTERN,
        choice(
          $._literal,
          $.patternNot,
          $.patternOr,
          $.patternOrElse,
          $.patternAny,
          $.patternAnd,
          $.patternMaybe,
          $.patternIfElse,
          $.patternContains,
          $.patternIncludes,
          $.patternAfter,
          $.patternBefore,
          $.within,
          $.bubble,
          $.nodeLike,
          $.mapAccessor,
          $.listIndex,
          $.dot,
          $.some,
          $.every,
          $.underscore,
          $.variable,
          $.regexPattern,
          $.patternAs,
          $.patternLimit,
          $.assignmentAsPattern,
          $.patternAccumulate,
          $.rewrite,
          $.like,
          $.log,
          $.range,
          $.patternWhere,
          $.mulOperation,
          $.divOperation,
          $.modOperation,
          $.addOperation,
          $.subOperation,
          $.sequential,
          $.files,
          seq('(', $._pattern, ')'),
        ),
      ),

    _container: ($) => choice($.variable, $.mapAccessor, $.listIndex),

    mulOperation: ($) =>
      prec.left(PREC.MUL, seq(field('left', $._pattern), '*', field('right', $._pattern))),
    divOperation: ($) =>
      prec.left(PREC.DIV, seq(field('left', $._pattern), '/', field('right', $._pattern))),
    modOperation: ($) =>
      prec.left(PREC.MOD, seq(field('left', $._pattern), '%', field('right', $._pattern))),
    addOperation: ($) =>
      prec.left(PREC.ADD, seq(field('left', $._pattern), '+', field('right', $._pattern))),
    subOperation: ($) =>
      prec.left(PREC.SUB, seq(field('left', $._pattern), '-', field('right', $._pattern))),

    patternAs: ($) =>
      prec.right(
        PREC.PATTERN_AS,
        seq(field('pattern', $._pattern), 'as', field('variable', $.variable)),
      ),

    patternLimit: ($) =>
      prec.right(
        PREC.PATTERN_LIMIT,
        seq(field('pattern', $._pattern), 'limit', field('limit', $.intConstant)),
      ),

    // statement, in the engine this is a predicate that always evaluates to true
    // This is useful for initializing variables at the root of a pattern definition
    assignmentAsPattern: ($) =>
      seq(field('container', $._container), '=', field('pattern', $._pattern)),

    // Primarily used for initializing variables at the root of a pattern definition
    patternAccumulate: ($) =>
      prec.right(PREC.ACCUMULATE, seq(field('left', $._pattern), '+=', field('right', $._pattern))),

    patternWhere: ($) =>
      prec.right(
        PREC.PATTERN_WHERE,
        seq(field('pattern', $._pattern), 'where', field('side_condition', $._predicate)),
      ),

    _literal: ($) =>
      choice(
        $.codeSnippet,
        $.top,
        $.bottom,
        $.stringConstant,
        $.intConstant,
        $.doubleConstant,
        $.booleanConstant,
        $.undefined,
        $.map,
        $.list,
      ),

    patternNot: ($) => prec(PREC.NOT, seq(choice('!', 'not'), field('pattern', $._pattern))),

    patternOr: ($) => seq('or', '{', field('patterns', commaSep1($._pattern)), '}'),

    patternOrElse: ($) => seq('orelse', '{', field('patterns', commaSep($._pattern)), '}'),

    patternAny: ($) => seq('any', '{', field('patterns', commaSep($._pattern)), '}'),

    patternAnd: ($) => seq('and', '{', field('patterns', commaSep($._pattern)), '}'),

    patternMaybe: ($) => seq('maybe', allowCurly(field('pattern', $._pattern))),

    patternAfter: ($) => seq('after', field('pattern', $._pattern)),

    patternBefore: ($) => seq('before', field('pattern', $._pattern)),

    patternContains: ($) =>
      prec.right(
        seq(
          'contains',
          allowCurly(field('contains', $._pattern)),
          optional(seq('until', field('until', $._pattern))),
        ),
      ),

    patternIncludes: ($) => seq('includes', allowCurly(field('includes', $._pattern))),

    rewrite: ($) =>
      prec.right(
        PREC.REWRITE,
        seq(
          field('left', $._pattern),
          field('annotation', optional($.annotation)),
          '=>',
          field('right', $._pattern),
        ),
      ),

    // --- conditional pattern ------------
    patternIfElse: ($) =>
      prec.right(
        seq(
          'if',
          seq('(', field('if', $._predicate), ')'),
          allowCurly(field('then', $._pattern)),
          optional(seq('else', allowCurly(field('else', $._pattern)))),
        ),
      ),
    // --- conditional pattern ------------

    within: ($) => seq('within', allowCurly(field('pattern', $._pattern))),

    _bubbleScope: ($) => prec.right(seq('bubble', optional(seq('(', commaSep($.variable), ')')))),

    bubble: ($) =>
      seq(field('variables', $._bubbleScope), allowCurly(field('pattern', $._pattern))),

    namedArg: ($) =>
      choice(
        // TODO
        // this should be `field('variable', $.variable)`
        // but keeping it as $._pattern while we are still
        // trying to maintain compatability with scala.
        // currently anything other than a  variable
        // will fail at compile time.
        field('variable', $._pattern),
        seq(field('name', $.name), '=', field('pattern', $._pattern)),
      ),

    // maybe we should have a different fieldname for each choice?
    nodeLike: ($) =>
      seq(field('name', $.name), seq('(', field('named_args', commaSep($.namedArg)), ')')),

    like: ($) =>
      seq(
        'like',
        optional(seq('(', field('threshold', $._pattern), ')')),
        '{',
        field('example', $._pattern),
        '}',
      ),

    map: ($) => seq('{', field('elements', commaSep($.mapElement)), '}'),

    mapElement: ($) => seq(field('key', $.name), ':', field('value', $._pattern)),

    mapAccessor: ($) =>
      seq(field('map', choice($.map, $._container)), '.', field('key', choice($.name, $.variable))),

    list: ($) =>
      prec.right(
        seq(
          optional($.name),
          '[',
          field('patterns', commaSep(choice($._pattern, $.dotdotdot))),
          ']',
        ),
      ),

    listIndex: ($) =>
      prec.right(
        seq(
          field('list', choice($.list, $._container)),
          '[',
          field('index', choice($._container, $.signedIntConstant)),
          ']',
        ),
      ),

    dot: (_$) => '.',

    some: ($) => seq('some', allowCurly(field('pattern', $._pattern))),
    every: ($) => seq('every', allowCurly(field('pattern', $._pattern))),

    // todo remove $... and separaete ... from some
    dotdotdot: ($) => prec.left(seq(/\$?\.\.\.\*?/, optional(allowCurly($._pattern)))),

    underscore: (_$) => '$_',

    regexPattern: ($) =>
      seq(
        field('regex', choice($.regex, $.snippetRegex)),
        field('variables', optional(seq('(', commaSep($.variable), ')'))),
      ),

    // node api does not have good support for fields (big sad)
    // I double checked by priniting out a JSON stringified
    // version of the object and it does not have the necessary
    // fields. so in order to hide _pattern we create this intermediate
    // value to extract the patternDefinitionBody.
    patternDefinitionBody: ($) => seq('{', field('patterns', commaSep($._pattern)), '}'),

    patternDefinition: ($) =>
      seq(
        field('visibility', optional('private')),
        // space here is kind of gross, but lets us differentiate from pattern() nodelike
        'pattern ',
        field('name', $.name),
        seq('(', field('args', commaSep($.variable)), ')'),
        field('language', optional($.langdecl)),
        field('body', $.patternDefinitionBody),
      ),

    predicateDefinitionBody: ($) => seq('{', field('predicates', commaSep($._predicate)), '}'),

    predicateDefinition: ($) =>
      seq(
        // space here is kind of gross, but lets us differentiate from predicate() nodelike
        'predicate ',
        field('name', $.name),
        seq('(', field('args', commaSep($.variable)), ')'),
        field('body', $.predicateDefinitionBody),
      ),

    noBraces: (_$) =>
      /(?:"(?:[^"\\]|\\.)*")|(?:'(?:[^'\\]|\\.)*')|(?:`(?:[^`\\]|\\.)*`)|([^{}"`'\r\n]+)/,

    foreignLanguageCode: ($) =>
      repeat1(choice($.noBraces, $.comment, seq('{', $.foreignLanguageCode, '}'))),

    foreignFunctionBody: ($) => seq('{', field('code', $.foreignLanguageCode), '}'),

    functionDefinitionBody: ($) => seq('{', field('predicates', commaSep($._predicate)), '}'),

    functionDefinition: ($) =>
      seq(
        // space here is kind of gross, but lets us differentiate from function() nodelike
        'function ',
        field('name', $.name),
        seq('(', field('args', commaSep($.variable)), ')'),
        field('body', $.functionDefinitionBody),
      ),

    foreignFunctionDefinition: ($) =>
      seq(
        // space here is kind of gross, but lets us differentiate from function() nodelike
        'function ',
        field('name', $.name),
        seq('(', field('args', commaSep($.variable)), ')'),
        field('language', $.foreignLanguageName),
        field('body', $.foreignFunctionBody),
      ),

    _logMessage: ($) =>
      choice(
        seq('message', '=', field('message', choice($.stringConstant, $.variable))),
        field('message', alias('$message', $.variable)),
      ),
    _logVariable: ($) =>
      choice(seq('variable', '=', field('variable', $.variable)), field('variable', $.variable)),

    log: ($) =>
      seq(
        'log(',
        choice(
          $._logMessage,
          $._logVariable,
          seq($._logMessage, ',', $._logVariable),
          seq($._logVariable, ',', $._logMessage),
        ),
        optional(','),
        ')',
      ),

    _start_line: ($) => seq('start_line', '=', field('start_line', $.intConstant)),
    _end_line: ($) => seq('end_line', '=', field('end_line', $.intConstant)),
    _start_column: ($) => seq('start_column', '=', field('start_column', $.intConstant)),
    _end_column: ($) => seq('end_column', '=', field('end_column', $.intConstant)),

    range: ($) =>
      seq(
        'range(',
        choice(
          $._start_line,
          $._end_line,
          $._start_column,
          $._end_column,

          seq($._start_line, ',', $._end_line),
          seq($._end_line, ',', $._start_line),

          seq($._start_line, ',', $._start_column),
          seq($._start_column, ',', $._start_line),

          seq($._start_line, ',', $._end_column),
          seq($._end_column, ',', $._start_line),

          seq($._start_column, ',', $._end_line),
          seq($._end_line, ',', $._start_column),

          seq($._end_column, ',', $._end_line),
          seq($._end_line, ',', $._end_column),

          seq($._start_column, ',', $._end_column),
          seq($._end_column, ',', $._start_column),

          seq($._end_line, ',', $._start_column, ',', $._end_column),
          seq($._end_line, ',', $._end_column, ',', $._start_column),
          seq($._start_column, ',', $._end_line, ',', $._end_column),
          seq($._start_column, ',', $._end_column, ',', $._end_line),
          seq($._end_column, ',', $._end_line, ',', $._start_column),
          seq($._end_column, ',', $._start_column, ',', $._end_line),

          seq($._start_line, ',', $._start_column, ',', $._end_column),
          seq($._start_line, ',', $._end_column, ',', $._start_column),
          seq($._start_column, ',', $._start_line, ',', $._end_column),
          seq($._start_column, ',', $._end_column, ',', $._start_line),
          seq($._end_column, ',', $._start_line, ',', $._start_column),
          seq($._end_column, ',', $._start_column, ',', $._start_line),

          seq($._end_line, ',', $._start_line, ',', $._end_column),
          seq($._end_line, ',', $._end_column, ',', $._start_line),
          seq($._start_line, ',', $._end_line, ',', $._end_column),
          seq($._start_line, ',', $._end_column, ',', $._end_line),
          seq($._end_column, ',', $._end_line, ',', $._start_line),
          seq($._end_column, ',', $._start_line, ',', $._end_line),

          seq($._end_line, ',', $._start_column, ',', $._start_line),
          seq($._end_line, ',', $._start_line, ',', $._start_column),
          seq($._start_column, ',', $._end_line, ',', $._start_line),
          seq($._start_column, ',', $._start_line, ',', $._end_line),
          seq($._start_line, ',', $._end_line, ',', $._start_column),
          seq($._start_line, ',', $._start_column, ',', $._end_line),

          seq($._start_line, ',', $._end_line, ',', $._start_column, ',', $._end_column),
          seq($._start_line, ',', $._end_line, ',', $._end_column, ',', $._start_column),
          seq($._start_line, ',', $._start_column, ',', $._end_line, ',', $._end_column),
          seq($._start_line, ',', $._start_column, ',', $._end_column, ',', $._end_line),
          seq($._start_line, ',', $._end_column, ',', $._end_line, ',', $._start_column),
          seq($._start_line, ',', $._end_column, ',', $._start_column, ',', $._end_line),

          seq($._end_line, ',', $._start_line, ',', $._start_column, ',', $._end_column),
          seq($._end_line, ',', $._start_line, ',', $._end_column, ',', $._start_column),
          seq($._end_line, ',', $._start_column, ',', $._start_line, ',', $._end_column),
          seq($._end_line, ',', $._start_column, ',', $._end_column, ',', $._start_line),
          seq($._end_line, ',', $._end_column, ',', $._start_line, ',', $._start_column),
          seq($._end_line, ',', $._end_column, ',', $._start_column, ',', $._start_line),

          seq($._start_column, ',', $._end_line, ',', $._start_line, ',', $._end_column),
          seq($._start_column, ',', $._end_line, ',', $._end_column, ',', $._start_line),
          seq($._start_column, ',', $._start_line, ',', $._end_line, ',', $._end_column),
          seq($._start_column, ',', $._start_line, ',', $._end_column, ',', $._end_line),
          seq($._start_column, ',', $._end_column, ',', $._end_line, ',', $._start_line),
          seq($._start_column, ',', $._end_column, ',', $._start_line, ',', $._end_line),

          seq($._end_column, ',', $._end_line, ',', $._start_column, ',', $._start_line),
          seq($._end_column, ',', $._end_line, ',', $._start_line, ',', $._start_column),
          seq($._end_column, ',', $._start_column, ',', $._end_line, ',', $._start_line),
          seq($._end_column, ',', $._start_column, ',', $._start_line, ',', $._end_line),
          seq($._end_column, ',', $._start_line, ',', $._end_line, ',', $._start_column),
          seq($._end_column, ',', $._start_line, ',', $._start_column, ',', $._end_line),
        ),
        optional(','),
        ')',
      ),

    _predicate: ($) =>
      choice(
        $.predicateNot,
        $.predicateMaybe,
        $.predicateAnd,
        $.predicateOr,
        $.predicateAny,
        $.predicateIfElse,
        $.predicateAssignment,
        $.predicateAccumulate,
        $.predicateRewrite,
        $.log,
        $.predicateGreater,
        $.predicateLess,
        $.predicateGreaterEqual,
        $.predicateLessEqual,
        $.predicateNotEqual,
        $.predicateEqual,
        $.predicateMatch,
        $.predicateCall,
        seq('(', $._predicate, ')'),
        $.booleanConstant,
        $.predicateReturn,
      ),

    predicateNot: ($) => prec(PREC.NOT, seq(choice('not', '!'), field('predicate', $._predicate))),

    predicateMaybe: ($) => seq('maybe', field('predicate', $._predicate)),

    predicateAnd: ($) =>
      seq(optional('and'), '{', field('predicates', commaSep($._predicate)), '}'),

    predicateOr: ($) => seq('or', '{', field('predicates', commaSep($._predicate)), '}'),

    predicateAny: ($) => seq('any', '{', field('predicates', commaSep($._predicate)), '}'),

    predicateIfElse: ($) =>
      prec.right(
        seq(
          'if',
          seq('(', field('if', $._predicate), ')'),
          field('then', $._predicate),
          optional(seq('else', field('else', $._predicate))),
        ),
      ),

    predicateRewrite: ($) =>
      seq(
        field('left', $.variable),
        field('annotation', optional($.annotation)),
        '=>',
        field('right', $._pattern),
      ),

    predicateAssignment: ($) =>
      seq(field('container', $._container), '=', field('pattern', $._pattern)),

    predicateAccumulate: ($) => seq(field('left', $.variable), '+=', field('right', $._pattern)),

    predicateGreater: ($) => seq(field('left', $.variable), '>', field('right', $._pattern)),

    predicateLess: ($) => seq(field('left', $.variable), '<', field('right', $._pattern)),

    predicateGreaterEqual: ($) => seq(field('left', $.variable), '>=', field('right', $._pattern)),

    predicateLessEqual: ($) => seq(field('left', $.variable), '<=', field('right', $._pattern)),

    predicateNotEqual: ($) => seq(field('left', $.variable), '!=', field('right', $._pattern)),

    predicateEqual: ($) => seq(field('left', $.variable), '==', field('right', $._pattern)),

    predicateMatch: ($) =>
      seq(field('left', choice($._container, $._literal)), '<:', field('right', $._pattern)),

    predicateCall: ($) =>
      seq(field('name', $.name), seq('(', field('named_args', commaSep($.namedArg)), ')')),

    predicateReturn: ($) => seq('return', field('pattern', $._pattern)),

    // --- tokens and lexical definitions

    booleanConstant: (_$) => token(choice('true', 'false')),

    // variable: ($ or ^) => $.name,
    variable: (_$) => /[\$\^][A-Za-z0-9_]*/,

    // name for variables, labels
    name: (_$) => /[\^#A-Za-z_][A-Za-z0-9_]*/,

    // These are languages that you can write foreign functions in
    foreignLanguageName: (_$) => choice('js'),

    // These are target languages
    languageName: (_$) =>
      choice(
        'grit',
        'js',
        'html',
        'css',
        'json',
        'java',
        'csharp',
        'python',
        'go',
        'markdown',
        'rust',
        'ruby',
        'sol',
        'solidity',
        'hcl',
        'yaml',
        'ast',
        'universal',
        'sql',
        'toml',
        'php',
        'c',
        'ruby',
      ),

    backtickSnippet: (_$) => /`(?:[^`\\]|\\\$|\\\\|\\`|\\n)*`/,

    rawBacktickSnippet: (_$) => /raw`(?:[^`\\]|\\\$|\\\\|\\`|\\n)*`/,

    doubleQuoteSnippet: (_$) => /"(?:[^"\\]|\\\$|\\\\|\\"|\\n)*"/,

    languageSpecificSnippet: ($) =>
      seq(field('language', $.languageName), field('snippet', $.doubleQuoteSnippet)),

    // a code snippet may be prefixed by a label;
    // the label may be prefixed by a module or sort name (separated from the label by a dot)
    // used to be: /((?:[A-Za-z0-9_]+\.)?[A-Za-z0-9_]*)?`(?:[^`\\]|\\`|\\n)*`/
    codeSnippet: ($) =>
      seq(
        field('source', choice($.backtickSnippet, $.languageSpecificSnippet, $.rawBacktickSnippet)),
      ),

    undefined: (_$) => token('undefined'),

    top: (_$) => token('Top'),

    bottom: (_$) => token('Bottom'),

    intConstant: (_$) => token(/[0-9]+/),
    signedIntConstant: (_$) => token(/-?[0-9]+/),

    doubleConstant: (_$) => token(/[+-]?[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/),

    // string literals
    stringConstant: (_$) => /"(?:[^"\\]|\\.)*"/,

    regex: (_$) => /r"(?:[^"\\]|\\.)*"/,

    snippetRegex: ($) => seq('r', field('snippet', $.backtickSnippet)),

    annotation: (_$) => token(/@[A-Za-z][A-Za-z0-9]*/),

    _separator: (_$) => token(choice(',', '\n')),

    // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890
    comment: (_$) => token(choice(seq('//', /.*/), seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'))),
  },
});

function commaSep1(rule) {
  return listWithSeparator1(rule, ',');
}
function commaSep(rule) {
  return optional(commaSep1(rule));
}
function listWithSeparator(rule, sep) {
  return optional(listWithSeparator1(rule, sep));
}
function listWithSeparator1(rule, sep) {
  return seq(rule, repeat(seq(sep, rule)), optional(sep));
}
function allowCurly(rule) {
  return choice(rule, seq('{', rule, '}'));
}
