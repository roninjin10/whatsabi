/// <reference path="../../smithers.d.ts" />
import { Smithers as S } from "@smthrs/targets"
import { Package as examples } from "../../examples/PACKAGE.js"
import { Package as root } from "../../PACKAGE.js"

// The recurring issue shape for this library: "whatsabi gets 0x... wrong".
// payload turns the report into typed workflow input; the agent reproduces
// with the example scripts, records the address's upstream responses as
// committed fixtures, and lands a replayable regression test. gates rerun
// the suite so the new test is proven against the recorded responses,
// offline. maxRounds bounds the reproduce-minimize-test loop.
const triageAddress = S.Agent.Diff({
  agent: S.Agent.Codex("luna"),
  prompt: S.file("SKILL.md"),
  payload: {
    address: S.Input.String("Contract address, e.g. 0x7a25...488d"),
    chain: S.Input.Optional(S.Input.String("Chain name, defaults to mainnet")),
    issue: S.Input.Optional(S.Input.String("GitHub issue URL with context")),
  },
  mcp: [S.Mcp.Http("github", "https://api.githubcopilot.com/mcp/")],
  data: [S.ImportClosure({ entries: examples.srcs }), root.recordFixtures],
  changes: ["src/__tests__/**"],
  gates: [root.test],
  secrets: [S.Secret("INFURA_API_KEY"), S.Secret("ETHERSCAN_API_KEY")],
  sandbox: { network: true },
  maxRounds: 3,
})

export const Package = S.Package({
  targets: { triageAddress },
})
