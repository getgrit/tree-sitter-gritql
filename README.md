# tree-sitter-gritql

[![CI Status](https://img.shields.io/github/actions/workflow/status/getgrit/tree-sitter-gritql/ci.yml)](https://github.com/getgrit/tree-sitter-gritql/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/github/license/getgrit/tree-sitter-gritql)](https://github.com/getgrit/tree-sitter-gritql/blob/main/LICENSE)
[![Discord](https://img.shields.io/discord/1063097320771698699?logo=discord&label=discord)](https://docs.grit.io/discord)

A tree-sitter parser for [GritQL](https://docs.grit.io/language/overview) files.

GritQl is an AST-aware query language for searching and transforming source code.

## Syntax Example

```grit
language js

`console.log($my_message)` => `winston.info($my_message)` where {
  $my_message <: string()
}
```

Explore the [interactive tutorial](https://docs.grit.io/tutorials/gritql) to learn more about GritQL.

## References
- [GritQL Language Overview](https://docs.grit.io/language/overview)
- [GritQL Language Reference](https://docs.grit.io/language/syntax)
- [Grit Standard Libarary](https://github.com/getgrit/stdlib)
