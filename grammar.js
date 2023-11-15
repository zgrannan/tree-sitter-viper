function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)))
}

function commaSep(rule) {
  return optional(commaSep1(rule))
}

function parens(rule) {
  return seq('(', rule, ')');
}

function braces(rule) {
  return seq('{', rule, '}');
}

function brackets(rule) {
  return seq('[', rule, ']');
}

module.exports = grammar({
  name: 'Viper',

  extras: $ => [
    $.comment,
    /[\s\uFEFF\u2060\u200B\u00A0]/
  ],

  rules: {
    source_file: $ => repeat(
      choice(
        $.domain,
        $.field,
        $.function,
        $.predicate,
        $.method,
        $.stmt, // Technically not allowed at toplevel, but allow parse
        $.expr  // Technically not allowed at toplevel, but allow parse
      )
    ),
    comment: $ => token(seq('//', /.*/)),
    method: $ => seq(
      'method',
      $.ident,
      parens(commaSep($.parameter)),
      optional($.returns),
      repeat($.requires),
      repeat($.ensures),
      optional($.method_body)
    ),
    returns: $ => seq(
      'returns',
      parens(commaSep1($.parameter))
    ),
    method_body: $ => braces(repeat($.stmt)),
    stmt: $ => prec(1, choice(
      $.var_decl,
      $.label,
      $.assign_stmt,
      $.inhale_stmt,
      $.exhale_stmt,
      $.assert_stmt,
      $.assume_stmt,
      $.fold_stmt,
      $.unfold_stmt,
      $.goto_stmt,
      $.if_stmt,
      $.function_call
    )),
    if_stmt: $ => seq(
      'if',
      parens($.expr),
      braces(repeat($.stmt)),
      optional(
        seq(
          'else',
          braces(repeat($.stmt))
        )
      )
    ),
    assign_stmt: $ =>seq(
      $.assign_target,
      ':=',
      $.expr
    ),
    inhale_stmt: $ => seq('inhale', $.expr),
    exhale_stmt: $ => seq('exhale', $.expr),
    assert_stmt: $ => seq('assert', $.expr),
    assume_stmt: $ => seq('assume', $.expr),
    fold_stmt: $ => seq('fold', $.expr),
    unfold_stmt: $ => seq('unfold', $.expr),
    label: $ => seq('label', $.ident),
    goto_stmt: $ => seq('goto', $.ident),
    var_decl: $ => seq(
      'var',
      $.ident,
      ':',
      $.typ,
      optional(
        seq(
          ':=',
          $.expr
        )
      )
    ),
    predicate: $ => seq(
      'predicate', 
      $.ident, 
      parens(commaSep($.parameter)),
      optional(braces($.expr))
    ),
    field: $ => seq('field', $.ident, ':', $.ident),
    domain: $ => seq(
      'domain',
      $.ident,
      braces(
        repeat(
          choice(
            $.domain_function,
            $.axiom
          ),
        ),
      )
    ),
    domain_function: $ => seq(
      'function',
      $.ident,
      parens(commaSep($.parameter)),
      ':',
      $.ident
    ),
    function: $ => seq(
      'function',
      $.ident,
      parens(commaSep($.parameter)),
      ':',
      $.ident,
      repeat($.requires),
      repeat($.ensures),
      optional(braces($.expr))
    ),
    requires: $ => seq(
      'requires',
      $.spec_expr
    ),
    ensures: $ => seq(
      'ensures',
      $.spec_expr
    ),
    spec_expr: $ => choice(
      $.expr,
      brackets(seq(
        $.expr, ",", $.expr
      ))
    ),
    axiom: $ => seq(
      'axiom',
      $.ident,
      braces($.expr)
    ),
    assign_target: $ => choice(
      $.ident,
      $.field_access_expr
    ),
    expr: $ => choice(
      $.index_expr,
      $.old_expr,
      $.ternary_expr,
      $.field_access_expr,
      $.unfolding,
      $.quantified_expr,
      $.int_literal,
      $.unary_expr,
      $.bin_expr,
      $.function_call,
      $.ident,
      $.let_expr,
      parens($.expr)
    ),
    typ: $ => seq($.ident, optional(brackets($.ident))),
    index_expr : $ => prec.left(3, seq($.expr, brackets($.expr))),
    unary_expr : $ => prec.left(1, seq(
      '!',
      $.expr
    )),
    let_expr : $ => seq(
      'let',
      $.ident,
      '==',
      parens($.expr),
      'in',
      $.expr
    ),
    old_expr: $ => seq(
      'old',
      optional(brackets($.ident)),
      parens($.expr)
    ),
    ternary_expr: $ => prec.left(1, seq(
      $.expr,
      '?',
      $.expr,
      ':',
      $.expr
    )),
    field_access_expr: $ => prec.left(1, seq(
      $.expr,
      '.',
      $.ident
    )),
    unfolding: $ => seq(
      'unfolding',
      $.expr,
      'in',
      $.expr
    ),
    function_call: $ => prec(10, seq(
      $.ident,
      parens(commaSep($.expr))
    )),
    bin_expr: $ => prec.left(2, seq(
      $.expr,
      choice(
        "+",
        "-",
        "/",
        "==>",
        "&&",
        "==",
        "!=",
        "<",
        ">",
        "<=",
        ">=",
        "union",
        "setminus"
      ),
      $.expr
    )),
    quantified_expr: $ => seq(
      choice('forall', 'exists'),
      commaSep1($.parameter),
      '::',
      optional($.triggers),
      $.expr
    ),
    triggers: $ => braces(commaSep1($.expr)),
    ident: $ => /[a-zA-Z_][a-zA-Z0-9_\$]*/,
    parameter: $ => seq(
      $.ident,
      ':',
      $.typ
    ),
    int_literal: $ => /[0-9]+/,
  }
});
