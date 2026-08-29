# Update the known-interfaces table

examples/index-interfaces.ts is the hand-curated source for
src/_generated-interfaces.ts, the table whatsabi uses to label detected
interfaces (ERC-20, ERC-721, and so on).

1. Survey finalized ERCs and widely deployed interfaces that the table
   does not cover, for example newer token, account, or proxy standards.
   Prefer standards with measurable on-chain adoption.
2. For each addition, append the interface's human-readable function
   signatures to examples/index-interfaces.ts, matching the existing
   format and ordering.
3. Regenerate src/_generated-interfaces.ts by running the //src:generated
   target in write mode.
4. Cite the ERC number and its status for each addition in the PR
   description.

Add nothing that is a draft or has negligible deployment.
