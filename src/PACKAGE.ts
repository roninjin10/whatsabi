/// <reference path="../smithers.d.ts" />
import { Smithers as S } from "@smthrs/targets"
import { Package as examples } from "../examples/PACKAGE.js"

const srcs = S.Filegroup({
  srcs: S.glob(["**", "!__tests__/**"]),
})

const tests = S.Filegroup({
  srcs: S.glob(["__tests__/**"]),
})

// _generated-interfaces.ts is generated but stays committed, unlike a pure
// build artifact: examples/index-interfaces.ts imports the package and the
// package imports the generated file (the Makefile's "has to be done in two
// steps because of circular import"), so the checked-in copy is the
// generator's own seed and cannot be Materialized from nothing. stdout:
// declares that the tool prints the file's next contents, replacing the
// Makefile's `> $@_; mv`. Check mode (the default verb) regenerates and
// fails on drift against the checked-in copy; --write updates it for
// commit.
const generated = S.Generate({
  bin: S.NodeModule.Bin("tsx"),
  args: ["examples/index-interfaces.ts"],
  data: [srcs, examples.srcs],
  stdout: "_generated-interfaces.ts",
})

export const Package = S.Package({
  targets: { generated, srcs, tests },
})
