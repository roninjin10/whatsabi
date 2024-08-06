build:
	tsc --project tsconfig.esm.json

watch:
	tsc --project tsconfig.esm.json -w

test:
	vitest run

test-providers:
	PROVIDER=ethers vitest run
	PROVIDER=web3 vitest run
	PROVIDER=viem vitest run
	PROVIDER=viem:transport vitest run
	PROVIDER=viem:publicClient vitest run

clean:
	rm -rf ./lib ./lib.*

publish: clean
	pnpm i
	pnpm run build:esm
	pnpm run build:cjs
	pnpm run build:types
	pnpm pack
	size-limit

run-examples:
	./examples/autoload.ts $(ADDRESS)
	./examples/bytecode.ts $(ADDRESS)
	./examples/dot.ts $(ADDRESS)
	./examples/resolveproxy.ts $(ADDRESS)
