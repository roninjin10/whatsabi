/// <reference path="./smithers.d.ts" />
import { Smithers as S } from "@smthrs/targets"
import { Package as examples } from "./examples/PACKAGE.js"
import { Package as src } from "./src/PACKAGE.js"

// PACKAGE.ts files are discovered automatically: the CLI globs the tree and
// indexes each file's Package export under path-derived labels
// (//src:generated, //examples:autoload, //:test) before the workspace
// runs. Only targets passed to S.Package are public; consts that stay out
// of the map are private to this file. Other PACKAGE.ts files reference
// public targets as properties of the imported Package.
const packageJson = S.file("//package.json")
const lockfile = S.file("//pnpm-lock.yaml")
const readme = S.file("//README.md")
const license = S.file("//LICENSE")
const tsconfig = S.file("//tsconfig.json")
const tsconfigBase = S.file("//tsconfig.base.json")
const tsconfigCjs = S.file("//tsconfig.cjs.json")
const tsconfigEsm = S.file("//tsconfig.esm.json")
const tsconfigTypes = S.file("//tsconfig.types.json")
const packageCjsJson = S.file("//package.cjs.json")
const packageEsmJson = S.file("//package.esm.json")
const sizeLimitConfig = S.file("//.size-limit.cjs")
const typedocConfig = S.file("//typedoc.json")
const viteConfig = S.file("//vite.config.ts")

// The manifest's files: allowlist names "*config.*" verbatim.
const configs = S.Filegroup({
  srcs: S.glob(["*config.*"]),
})

const compileEsm = S.Shell.Build({
  bin: S.NodeModule.Bin("typescript", "tsc"),
  args: ["--project", "tsconfig.esm.json"],
  data: [src.srcs, tsconfigEsm, tsconfigBase],
  outDirs: ["lib.esm"],
})

// The build:esm npm script follows tsc with `cp package.esm.json
// lib.esm/package.json` to stamp the emitted tree's module type. The copy
// is a first-class target so the compile stays a pure tsc invocation.
const esmPackageStamp = S.Copy({
  from: packageEsmJson,
  to: "lib.esm/package.json",
})

const buildEsm = S.Filegroup({
  srcs: [compileEsm, esmPackageStamp],
})

const compileCjs = S.Shell.Build({
  bin: S.NodeModule.Bin("typescript", "tsc"),
  args: ["--project", "tsconfig.cjs.json"],
  data: [src.srcs, tsconfigCjs, tsconfigBase],
  outDirs: ["lib.cjs"],
})

const cjsPackageStamp = S.Copy({
  from: packageCjsJson,
  to: "lib.cjs/package.json",
})

const buildCjs = S.Filegroup({
  srcs: [compileCjs, cjsPackageStamp],
})

const buildTypes = S.Shell.Build({
  bin: S.NodeModule.Bin("typescript", "tsc"),
  args: ["--project", "tsconfig.types.json"],
  data: [src.srcs, tsconfigTypes, tsconfigBase],
  outDirs: ["lib.types"],
})

// The publishable library: the three emit flavors package.json's exports
// map points at.
const build = S.Filegroup({
  srcs: [buildEsm, buildCjs, buildTypes],
})

const watch = S.Shell.Serve({
  bin: S.NodeModule.Bin("typescript", "tsc"),
  args: ["--project", "tsconfig.esm.json", "-w"],
  data: [src.srcs, tsconfigEsm, tsconfigBase],
})

const typeCheck = S.Shell.Test({
  bin: S.NodeModule.Bin("typescript", "tsc"),
  args: ["--noEmit", "--project", "tsconfig.json"],
  data: [src.srcs, src.tests, tsconfig, tsconfigBase],
})

const buildDocs = S.Shell.Build({
  bin: S.NodeModule.Bin("typedoc"),
  data: [src.srcs, typedocConfig, readme, packageJson],
  outDirs: ["docs"],
})

// The Makefile name for the same build.
const docs = S.Alias(buildDocs)

const serveDocs = S.Shell.Serve({
  bin: S.Host.bin("python"),
  args: ["-m", "http.server", "-d", "./docs"],
  data: [buildDocs],
  readiness: { port: 8000 },
})

// Replaces the deploy half of .github/workflows/docs.yml: publish the
// typedoc site to GitHub Pages. The emitted CI (githubCi below) wires it
// to pushes on main.
const deployDocs = S.Github.Pages({
  site: buildDocs,
  secrets: [S.Secret("GITHUB_TOKEN")],
  sandbox: { network: true },
})

// The recorded upstream API responses are a build artifact, not workspace
// state. Upstream this is a gitignored .cache/ directory
// (src/internal/filecache.ts), an ONLINE=1 switch, and an actions/cache
// step. Here recording is a Build with network access whose output is the
// response store; test targets depend on it and replay hermetically, with
// no network in their sandbox. Refresh is scheduled, not ambient (see
// refreshFixtures).
const recordFixtures = S.Shell.Build({
  bin: S.NodeModule.Bin("vitest"),
  args: ["run"],
  env: { ONLINE: "1" },
  data: [src.srcs, src.tests, examples.srcs, viteConfig, tsconfigBase],
  secrets: [S.Secret("INFURA_API_KEY"), S.Secret("ETHERSCAN_API_KEY")],
  sandbox: { network: true },
  outDirs: [".cache"],
})

const test = S.Shell.Test({
  bin: S.NodeModule.Bin("vitest"),
  args: ["run"],
  data: [src.srcs, src.tests, examples.srcs, recordFixtures, viteConfig, tsconfigBase],
})

// The Makefile's test-providers matrix is a plain function over
// S.Shell.Test rather than a matrix primitive. PROVIDER selects which
// client library the provider-facing tests run against; unset, they
// default to ethers.
const providerTest = (provider: string) => {
  return S.Shell.Test({
    bin: S.NodeModule.Bin("vitest"),
    args: ["run"],
    env: { PROVIDER: provider },
    data: [src.srcs, src.tests, examples.srcs, recordFixtures, viteConfig, tsconfigBase],
  })
}

const testEthers = providerTest("ethers")

const testWeb3 = providerTest("web3")

const testViem = providerTest("viem")

const testViemTransport = providerTest("viem:transport")

const testViemPublicClient = providerTest("viem:publicClient")

const testProviders = S.Suite({
  tests: [
    testEthers,
    testWeb3,
    testViem,
    testViemTransport,
    testViemPublicClient,
  ],
})

// README code fences are the library's most-read API examples and the
// first place to drift. CodeBlocks is a derived filegroup: each fenced
// ts/js block becomes a virtual module, so the snippets type-check like
// any other source. buildTypes plus the manifest's exports map let tsc
// resolve `import ... from "@shazow/whatsabi"` to the local emit.
const readmeSnippets = S.Markdown.CodeBlocks({
  file: readme,
  lang: ["ts", "js"],
})

const checkReadme = S.Shell.Test({
  bin: S.NodeModule.Bin("typescript", "tsc"),
  args: ["--noEmit", "--strict"],
  data: [readmeSnippets, buildTypes, packageJson],
})

// Semver as a gate. baseline is the last published version's declaration
// files, fetched from the registry and content-addressed by version;
// surface is this tree's emit. The target classifies the API delta
// (patch, minor, major) and fails when the version in package.json does
// not cover it.
const apiCompat = S.Api.Compat({
  baseline: S.Npm.Published({ manifest: packageJson }),
  surface: buildTypes,
  manifest: packageJson,
})

// Dead code as set algebra: everything in src that the public entry
// point, the tests, and the examples cannot reach. No tool config to
// maintain; the answer falls out of the same per-file resolution rows
// other targets are keyed on.
const reachable = S.ImportClosure({
  entries: [S.file("//src/index.ts"), src.tests, examples.srcs],
})

const deadCode = S.Test({
  expect: S.Files.difference(src.srcs, reachable.files),
  toBe: "empty",
})

const audit = S.Shell.Test({
  bin: S.PackageManager.bin,
  args: ["audit", "--prod", "--audit-level", "high"],
  data: [packageJson, lockfile],
  sandbox: { network: true },
})

// Agentic lint: exported symbols touched by the diff must carry TSDoc that
// typedoc can render; the published docs site is generated from these
// comments. Runs on the diff, not the tree. An empty diff is vacuously
// green: the agent is never invoked. --fix writes the missing comments
// inside the declared write-set.
const docsLint = S.Agent.Lint({
  agent: S.Agent.Codex("luna"),
  prompt: S.file("//workflows/lints/api-docs.md"),
  data: [S.gitDiff({ paths: ["src/**"] })],
  fixes: ["src/**"],
})

// size-limit imports { whatsabi } from each emitted bundle and enforces
// the budgets in .size-limit.cjs (20 kb esm, 40 kb cjs).
const checkSize = S.Shell.Test({
  bin: S.NodeModule.Bin("size-limit"),
  data: [buildEsm, buildCjs, sizeLimitConfig, packageJson],
})

const clean = S.Shell.Run({
  command: "rm -rf ./lib ./lib.*",
})

// `pnpm pack` over the manifest's files: allowlist. S.Npm.Pack knows the
// <name>-<version>.tgz naming, so the output is not spelled out here.
const pack = S.Npm.Pack({
  manifest: packageJson,
  data: [build, src.srcs, examples.srcs, configs, readme, license],
})

const prePublish = S.Suite({
  tests: [typeCheck, test, testProviders, checkSize, checkReadme, apiCompat],
})

// Replaces the Makefile's publish target, which stopped after
// `pnpm pack; size-limit` and printed "Run: pnpm login; pnpm publish".
// The preflight is structural (gates), the manual hand-off is the
// approval, and the registry gets provenance attestation.
const publish = S.Npm.Publish({
  pack,
  gates: [prePublish],
  provenance: true,
  secrets: [S.Secret("NPM_TOKEN")],
  sandbox: { network: true },
  approval: "required",
})

// Tags vX.Y.Z from the manifest and opens the GitHub release; the notes
// are written by the agent from the commit history since the last tag.
const release = S.Github.Release({
  manifest: packageJson,
  notes: S.Agent.Codex("luna"),
  data: [pack],
  gates: [prePublish],
  secrets: [S.Secret("GITHUB_TOKEN")],
  sandbox: { network: true },
  approval: "required",
})

// Filegroup groups files, Suite groups tests, Alias renames one target. A
// dependency edge always means "materialize files", never "execute".
const ci = S.Suite({
  tests: [
    typeCheck,
    test,
    testProviders,
    src.generated,
    checkSize,
    checkReadme,
    apiCompat,
    deadCode,
    audit,
    docsLint,
  ],
})

// The .github/workflows files are emitted from the graph, not hand-written:
// each entry maps a trigger to a target and the generator writes the
// actions boilerplate (pnpm and node setup, fixture materialization) from
// the workspace layers. Check mode fails on drift; --write regenerates.
// This replaces the hand-written test.yml and docs.yml.
const githubCi = S.Github.Ci({
  workflows: {
    test: { on: { push: ["main"], pullRequest: true, dispatch: true }, run: ci },
    docs: { on: { push: ["main"], dispatch: true }, run: deployDocs },
  },
  changes: [".github/workflows/**"],
})

const preCommit = S.Suite({
  tests: [typeCheck, src.generated],
})

const prePush = S.Suite({
  tests: [typeCheck, test, checkReadme, docsLint],
})

// Committing and PR-opening are targets, so their guards are the same
// suites CI runs; a commit that would fail CI cannot be created. Invoking
// the target is the consent for its outward action.
const commit = S.Git.Commit({
  gates: [preCommit],
  message: S.Agent.Codex("luna"),
})

const pr = S.Git.Pr({
  gates: [prePush],
  secrets: [S.Secret("GITHUB_TOKEN")],
  sandbox: { network: true },
})

// Triggers are targets. Recordings rot as contracts upgrade and explorer
// APIs evolve; the schedule re-records the store and replays the provider
// matrix against it, so rot surfaces weekly instead of during an
// unrelated PR.
const refreshFixtures = S.Cron({
  schedule: "0 6 * * 1",
  refresh: [recordFixtures],
  run: [testProviders],
})

export const Package = S.Package({
  defaultVisibility: "public",
  targets: {
    apiCompat,
    audit,
    build,
    buildCjs,
    buildDocs,
    buildEsm,
    buildTypes,
    checkReadme,
    checkSize,
    ci,
    clean,
    commit,
    deadCode,
    deployDocs,
    docs,
    docsLint,
    githubCi,
    pack,
    pr,
    preCommit,
    prePublish,
    prePush,
    publish,
    recordFixtures,
    refreshFixtures,
    release,
    serveDocs,
    test,
    testEthers,
    testProviders,
    testViem,
    testViemPublicClient,
    testViemTransport,
    testWeb3,
    typeCheck,
    watch,
  },
})
