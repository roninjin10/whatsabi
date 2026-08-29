# Triage a contract address

Input: a contract address, an optional chain, and an optional GitHub issue
URL with context.

whatsabi failed or misbehaved on this address: wrong ABI, unresolved
proxy, missing selectors, or a crash. Reproduce the report and land a
regression test.

1. If an issue URL is provided, read the thread for the expected behavior.
2. Reproduce with `examples/autoload.ts <address>` and
   `examples/resolveproxy.ts <address>`.
3. Record the address's bytecode and explorer responses as fixtures under
   src/__tests__/__fixtures__ so the reproduction replays offline.
4. Minimize: identify which stage is wrong (disasm, selector extraction,
   proxy resolution, or a loader).
5. Add a regression test in src/__tests__ that replays the recorded
   fixtures. If the cause is clear and the fix is small, fix it.
   Otherwise land the failing test with a skip marker and a comment
   naming the suspected stage.

Keep the diff minimal. Do not refactor unrelated code.
