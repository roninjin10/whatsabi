import { ethers } from "ethers";

import { ABI, ABIFunction, ABIEvent } from "./abi";

type OpCode = number;

// Some opcodes we care about, doesn't need to be a complete list
const opcodes: { [key: string]: OpCode } = {
    "STOP": 0x00,
    "EQ": 0x14,
    "ISZERO": 0x15,
    "CALLVALUE": 0x34,
    "JUMPI": 0x57,
    "JUMPDEST": 0x5b,
    "PUSH1": 0x60,
    "PUSH4": 0x63,
    "PUSH32": 0x7f,
    "DUP1": 0x80,
    "LOG1": 0xa1,
    "LOG4": 0xa4,
}

// Return PUSHN width of N if PUSH instruction, otherwise 0
export function pushWidth(instruction: OpCode): number {
    if (instruction < opcodes.PUSH1 || instruction > opcodes.PUSH32) return 0;
    return instruction - opcodes.PUSH1 + 1;
}

export function isPush(instruction: OpCode): boolean {
    return !(instruction < opcodes.PUSH1 || instruction > opcodes.PUSH32);
}

export function isLog(instruction: OpCode): boolean {
    return instruction >= opcodes.LOG1 && instruction <= opcodes.LOG4;
}

// BytecodeIter takes EVM bytecode and handles iterating over it with correct
// step widths, while tracking N buffer of previous offsets for indexed access.
// This is useful for checking against sequences of variable width
// instructions.
export class BytecodeIter {
    bytecode: Uint8Array;

    nextStep: number; // Instruction count
    nextPos: number; // Byte-wise instruction position (takes variable width into account)

    // TODO: Could improve the buffer by making it sparse tracking of only
    // variable-width (PUSH) instruction indices, this would allow relatively
    // efficient seeking to arbitrary positions after a full iter. Then again,
    // roughly 1/4 of instructions are PUSH, so maybe it doesn't help enough?

    posBuffer: number[]; // Buffer of positions
    posBufferSize: number;

    constructor(bytecode: string, config?: { bufferSize?:number }) {
        this.nextStep = 0;
        this.nextPos = 0;
        if (config === undefined) config = {};

        this.posBufferSize = config.bufferSize || 1;
        this.posBuffer = [];

        this.bytecode = ethers.utils.arrayify(bytecode, { allowMissingPrefix: true });
    }

    hasMore(): boolean {
        return (this.bytecode.length > this.nextPos);
    }

    next(): OpCode {
        if (this.bytecode.length <= this.nextPos) return opcodes.STOP;

        const instruction = this.bytecode[this.nextPos];
        const width = pushWidth(instruction);

        if (this.posBuffer.length >= this.posBufferSize) this.posBuffer.shift();
        this.posBuffer.push(this.nextPos);

        this.nextStep += 1;
        this.nextPos += 1 + width;

        return instruction;
    }

    // step is the current instruction position that we've iterated over. If
    // iteration has not begun, then it's -1.
    step(): number {
        return this.nextStep - 1;
    }

    // pos is the byte offset of the current instruction we've iterated over.
    // If iteration has not begun then it's -1.
    pos(): number {
        return this.nextPos - 1;
    }

    // at returns instruction at an absolute byte position or relative negative
    // buffered step offset. Buffered step offsets must be negative and start
    // at -1 (current step).
    at(posOrRelativeStep: number): OpCode {
        let pos = posOrRelativeStep;
        if (pos < 0) {
            pos = this.posBuffer[this.posBuffer.length + pos];
        }
        return this.bytecode[pos];
    }

    // value of last next-returned OpCode (should be a PUSHN intruction)
    value(): Uint8Array {
        return this.valueAt(-1);
    }

    // valueAt returns the variable width value for PUSH-like instructions (or empty value otherwise), at pos
    // pos can be a relative negative count for relative buffered offset.
    valueAt(posOrRelativeStep: number): Uint8Array {
        let pos = posOrRelativeStep;
        if (pos < 0) {
            pos = this.posBuffer[this.posBuffer.length + pos];
        }
        const instruction = this.bytecode[pos];
        const width = pushWidth(instruction);
        return this.bytecode.slice(pos+1, pos+1+width);
    }
}

export function abiFromBytecode(bytecode: string): ABI {
    const abi: ABI = [];

    // JUMPDEST lookup
    const jumps: { [key: string]: number } = {}; // function hash -> instruction offset
    const dests: { [key: number]: number } = {}; // instruction offset -> bytes offset
    const notPayable: { [key: number]: number } = {}; // instruction offset -> bytes offset
    let lastPush32: Uint8Array = new Uint8Array();  // Track last push32 to find log topics

    const code = new BytecodeIter(bytecode, { bufferSize: 4 });

    // TODO: Optimization: Could optimize finding jumps by loading JUMPI first
    // (until the jump table window is reached), then sorting them and seeking
    // to each JUMPDEST.

    while (code.hasMore()) {
        const inst = code.next();
        const pos = code.pos();
        const step = code.step();

        // Track last PUSH32 to find LOG topics
        // This is probably not bullet proof but seems like a good starting point
        if (inst === opcodes.PUSH32) {
            lastPush32 = code.value();
            continue
        } else if (isLog(inst) && lastPush32.length > 0) {
            abi.push({
                type: "event",
                hash: ethers.utils.hexlify(lastPush32),
            } as ABIEvent)
            continue
        }

        // Find JUMPDEST labels
        if (inst === opcodes.JUMPDEST) {
            // Index jump destinations so we can check against them later
            dests[pos] = step;

            // Note whether a JUMPDEST is has non-payable guards
            //
            // We look for a sequence of instructions that look like:
            // JUMPDEST CALLVALUE DUP1 ISZERO
            //
            // We can do direct positive indexing because we know that there
            // are no variable-width instructions in our sequence.
            if (
                code.at(pos+1) === opcodes.CALLVALUE &&
                code.at(pos+2) === opcodes.DUP1 &&
                code.at(pos+3) === opcodes.ISZERO
            ) {
                notPayable[pos] = step;
                // TODO: Optimization: Could seek ahead 3 pos/count safely
            }
            continue
        }

        // Find callable function selectors:
        //
        // https://github.com/ethereum/solidity/blob/242096695fd3e08cc3ca3f0a7d2e06d09b5277bf/libsolidity/codegen/ContractCompiler.cpp#L333
        //
        // We're looking for a sequence of opcodes that looks like:
        //
        //    DUP1 PUSH4 0x2E64CEC1 EQ PUSH1 0x37    JUMPI
        //    DUP1 PUSH4 <BYTE4>    EQ PUSHN <BYTEN> JUMPI
        //    80   63    ^          14 60-7f ^       57
        //               Selector            Dest
        //
        // FIXME: We can probably stop checking after we find some instruction set? Maybe 2nd CALLDATASIZE?
        if (
            code.at(-1) === opcodes.JUMPI && 
            isPush(code.at(-2)) &&
            code.at(-3) === opcodes.EQ &&
            isPush(code.at(-4))
        ) {
            // Found a function selector sequence, save it to check against JUMPDEST table later
            const value = ethers.utils.zeroPad(code.valueAt(-4), 4); // 0-prefixed comparisons get optimized to a smaller width than PUSH4
            const selector:string = ethers.utils.hexlify(value);
            const offsetDest:number = parseInt(ethers.utils.hexlify(code.valueAt(-2)), 16);
            jumps[selector] = offsetDest;

            continue;
        }
    }

    for (let selector of Object.keys(jumps)) {
        // TODO: Check jumpdests?
        abi.push({
            type: "function",
            selector: selector,
            payable: !notPayable[jumps[selector]],
        } as ABIFunction)
    }

    return abi;
}
