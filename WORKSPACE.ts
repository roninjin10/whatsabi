/// <reference path="./smithers.d.ts" />
import { Smithers as S } from "@smthrs/targets"

const packageJson = S.file("//package.json")
const lockfile = S.file("//pnpm-lock.yaml")

// package.json declares no engines and CI's setup-node pins nothing, so the
// nix dev shell is the source of truth: flake.nix pins nodejs_26.
const runtime = S.Runtime.Node({ version: "26" })

// The manifest's packageManager field names pnpm without a version; CI pins
// major 8 via pnpm/action-setup, so the pin is declared explicitly.
const packageManager = S.PackageManager.Pnpm({
  manifest: packageJson,
  lockfile,
  version: "8",
})

const nodeModules = S.Npm.NodeModules({ packageJson })

// Host binaries this workspace admits. A target using S.Host.bin("python")
// fails at graph load when the bin is not declared here, and at run start
// when the host lacks it.
const host = S.Host({
  bins: ["python"],
})

// Every value below is a layer; the config keys compose them, with
// dependencies between them (nodeModules needs packageManager, both need
// runtime) wired by requirement. `layer` remains an escape hatch for a
// workspace that wants to compose Effect layers by hand.
export const Workspace = S.Workspace("whatsabi", {
  repository: "git+https://github.com/shazow/whatsabi.git",
  cache: S.Cache({ directory: ".flows" }),
  runtime,
  packageManager,
  nodeModules,
  host,
})
