# API documentation lint

Scope: the diff only.

For each exported symbol added or changed in the diff (functions, classes,
types, and consts reachable from src/index.ts or src/whatsabi.ts):

- It must carry a TSDoc comment that typedoc can render: a one-line
  summary, `@param` for each parameter, `@returns` when the return value
  is not obvious from the summary, and `@example` for new public entry
  points.
- The comment must describe behavior, not restate the signature.
- Modules under src/internal/ are exempt.

Report each missing or inadequate comment with file, line, and symbol. In
fix mode, write the comment from the implementation; do not change code.
