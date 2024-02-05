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

function mk_bin_expr(n, op, expr) {
  return prec.left(n,
      seq(
        field("lhs", expr),
        field("operator", op),
        field("rhs", expr)
      )
    );
}

module.exports = grammar({
  name: 'Viper',

  extras: $ => [
    $.block_comment,
    $.line_comment,
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
    block_comment: $ => seq(
      "/*",
      repeat(choice(/.|\n|\r/)),
      "*/"
    ),
    line_comment: $ => token(seq('//', /.*/)),
    method: $ => seq(
      'method',
      field("name", $.ident),
      parens(commaSep($.parameter)),
      optional($.returns),
      repeat($.requires),
      repeat($.ensures),
      field("body", optional($.block))
    ),
    returns: $ => seq(
      'returns',
      parens(commaSep1($.parameter))
    ),
    block: $ => braces(repeat($.stmt)),
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
      field("condition", parens($.expr)),
      field("then_clause", $.block),
      field("else_clause", optional(
        seq(
          'else',
          $.block
        )
      ))
    ),
    assign_stmt: $ =>seq(
      field("target", $.assign_target),
      ':=',
      field("expr", $.expr)
    ),
    inhale_stmt: $ => seq('inhale', $.expr),
    exhale_stmt: $ => seq('exhale', $.expr),
    assert_stmt: $ => seq('assert', $.expr),
    assume_stmt: $ => seq('assume', $.expr),
    fold_stmt: $ => seq('fold', $.expr),
    unfold_stmt: $ => seq('unfold', $.expr),
    label: $ => seq('label', $.ident),
    goto_stmt: $ => seq('goto', field("target", $.ident)),
    var_decl: $ => seq(
      'var',
      field("ident", $.ident),
      ':',
      $.typ,
      optional(
        seq(
          ':=',
          field("expr", $.expr)
        )
      )
    ),
    predicate: $ => seq(
      'predicate', 
      field("name", $.ident),
      parens(commaSep($.parameter)),
      optional(braces($.expr))
    ),
    field: $ => seq('field', $.ident, ':', $.ident),
    domain: $ => seq(
      'domain',
      field("name", $.ident),
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
      field("name", $.ident),
      parens(commaSep(choice($.parameter, $.typ))),
      ':',
      $.ident
    ),
    function: $ => seq(
      'function',
      field("name", $.ident),
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
      optional($.ident),
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
      'true',
      'false',
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
      optional(brackets(field("label", $.ident))),
      parens(field("expr", $.expr))
    ),
    ternary_expr: $ => prec.left(1, seq(
      field("condition", $.expr),
      '?',
      field("then_expr", $.expr),
      ':',
      field("else_expr", $.expr)
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
    bin_expr: $ =>
      choice(
        mk_bin_expr(3, "+", $.expr),
        mk_bin_expr(3, "-", $.expr),
        mk_bin_expr(3, "/", $.expr),
        mk_bin_expr(2, "==>", $.expr),
        mk_bin_expr(3, "&&", $.expr),
        mk_bin_expr(3, "==", $.expr),
        mk_bin_expr(3, "!=", $.expr),
        mk_bin_expr(3, "<", $.expr),
        mk_bin_expr(3, ">", $.expr),
        mk_bin_expr(3, "<=", $.expr),
        mk_bin_expr(3, ">=", $.expr),
        mk_bin_expr(3, "union", $.expr),
        mk_bin_expr(3, "setminus", $.expr)
      ),
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
