/// <reference path="../smithers.d.ts" />
import { Smithers as S } from "@smthrs/targets"

const srcs = S.Filegroup({
  srcs: S.glob(["**"]),
})

// The example scripts carry `#!/usr/bin/env -S tsx` shebangs for direct
// execution; addressing tsx explicitly makes the interpreter a declared
// input. Each runner's data is the import closure of this package's files,
// so it reaches the library source in ../src without importing
// src/PACKAGE.ts — that import would complete a cycle, since src's
// generated target consumes these files. The Makefile's run-examples passes
// $(ADDRESS) to each; with Smithers the contract address arrives as
// trailing invocation args. The matrix is a plain function over
// S.Shell.Run, not a primitive.
const example = (name: string) => {
  return S.Shell.Run({
    bin: S.NodeModule.Bin("tsx"),
    args: [`examples/${name}.ts`],
    data: [S.ImportClosure({ entries: srcs })],
    secrets: [S.Secret("INFURA_API_KEY"), S.Secret("ETHERSCAN_API_KEY")],
    sandbox: { network: true },
  })
}

const autoload = example("autoload")

const bytecode = example("bytecode")

const dot = example("dot")

const resolveproxy = example("resolveproxy")

const benchmarkSelectors = example("benchmark-selectors")

export const Package = S.Package({
  targets: {
    autoload,
    benchmarkSelectors,
    bytecode,
    dot,
    resolveproxy,
    srcs,
  },
})
