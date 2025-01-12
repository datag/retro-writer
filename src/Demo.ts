import App from './App';
import Instruction from './Instruction';

interface DemoFormatHeader {
    /**
     * @deprecated 0.1.0 BC for previous structure; remove before 1.0.0
     */
    magic?: string;

    version: string;
}

export type DemoFormatInstructionArgument = null | string | number | boolean;

export type DemoFormatInstruction = string | (string | DemoFormatInstructionArgument)[];

export interface DemoFormat {
    magic: string;
    header: DemoFormatHeader;
    instructions: DemoFormatInstruction[];
}

export class Demo {
    /** Identifier used in file format */
    static magic: string = 'RTRWRTR';

    /** App version this demo was created with */
    #version: string = App.appVersion;

    /** Sequential instructions */
    #instructions: Instruction[] = [];

    /** Current instruction index (null means invalid) */
    #instructionIndex: number | null = null;

    /**
     * Records a new instruction.
     *
     * @param instruction
     */
    addInstruction(instruction: Instruction) {
        this.#instructions.push(instruction);
    }

    /**
     * Resets the instruction index to start.
     */
    resetInstructionIndex() {
        this.#instructionIndex = 0;
    }

    /**
     * Fetches the next instruction and advances the instruction index.
     *
     * @returns The next instruction. If there are no instructions or the instruction index is invalid, null is returned.
     */
    nextInstruction(): Instruction | null {
        const count = this.#instructions.length;

        if (count == 0 || this.#instructionIndex === null) {
            return null;
        }

        const index = this.#instructionIndex;

        const instruction = this.#instructions[index];

        if (index < count - 1) {
            this.#instructionIndex++;
        } else {
            this.#instructionIndex = null;
        }

        return instruction;
    }

    export(): DemoFormat {
        return {
            magic: Demo.magic,
            header: {
                version: this.#version,
                // TODO: name, cols, rows, settings, ...
            },
            instructions: this.#instructions.map((instruction: Instruction): DemoFormatInstruction => instruction.toData())
        };
    }

    import(data: DemoFormat) {
        if (data.magic !== Demo.magic) {
            /**
             * @deprecated 0.1.0 BC for previous structure; remove before 1.0.0
             */
            if (data.header?.magic !== Demo.magic) {
                throw new Error('Invalid RetroWriter demo file data');
            }
        }

        const header = data.header;
        if (typeof header === 'undefined') {
            throw new Error('Header missing');
        }

        this.#version = header?.version;

        this.#instructions = data.instructions?.map((instruction: DemoFormatInstruction): Instruction => Instruction.fromData(instruction)) ?? [];
    }
}

export default Demo;
