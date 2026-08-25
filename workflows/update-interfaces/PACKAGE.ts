/// <reference path="../../smithers.d.ts" />
import { Smithers as S } from "@smthrs/targets"
import { Package as examples } from "../../examples/PACKAGE.js"
import { Package as root } from "../../PACKAGE.js"
import { Package as src } from "../../src/PACKAGE.js"

// The interfaces table lags the ecosystem by design; curation is judgment
// work, so it is an agent workflow rather than codegen. The workflow
// settles by opening a PR (an outward action, so approval is declared)
// whose gates prove the extended table regenerates cleanly and passes the
// suite. src.generated as a gate runs its check verb after the agent's
// write, so a hand-edited generated file cannot slip through.
const updateInterfaces = S.Agent.Pr({
  agent: S.Agent.Codex("luna"),
  prompt: S.file("SKILL.md"),
  data: [src.srcs, examples.srcs],
  changes: ["examples/index-interfaces.ts", "src/_generated-interfaces.ts"],
  gates: [src.generated, root.typeCheck, root.test],
  secrets: [S.Secret("GITHUB_TOKEN")],
  sandbox: { network: true },
  approval: "required",
})

export const Package = S.Package({
  targets: { updateInterfaces },
})
