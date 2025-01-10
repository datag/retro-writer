import App from './App';
import Instruction from './Instruction';

/**
 * @typedef {Object} DemoFormatHeader
 * @property {string} magic       - Magic/identifier
 * @property {string} version     - RetroWriter version demo was created with
 */

/**
 * @typedef {Object} DemoFormat
 * @property {DemoFormatHeader} header       - Header
 * @property {Instruction[]} instructions    - Instructions
 */

export default class Demo {
    /** @type {string} Identifier used in file format */
    static magic = 'RTRWRTR';

    /** @type {string} App version this demo was created with */
    #version = App.appVersion;

    /** @type {Instruction[]} Sequential instructions */
    #instructions = [];

    /** @type {?number} Current instruction index (null means invalid) */
    #instructionIndex = null;

    /**
     * Records a new instruction.
     *
     * @param {Instruction} instruction
     */
    addInstruction(instruction) {
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
     * @returns {?Instruction} The next instruction. If there are no instructions or the instruction index is invalid, null is returned.
     */
    nextInstruction() {
        const count = this.#instructions.length;
        const index = this.#instructionIndex;

        if (count == 0 || index === null) {
            return null;
        }

        const instruction = this.#instructions[index];

        if (index < count - 1) {
            this.#instructionIndex++;
        } else {
            this.#instructionIndex = null;
        }

        return instruction;
    }

    /**
     * @returns {DemoFormat}
     */
    export() {
        return {
            header: {
                magic: Demo.magic,
                version: this.#version,
                // TODO: name, settings, ...
            },
            instructions: this.#instructions.map((instruction) => instruction.toData())
        };
    }

    /**
     * @param {DemoFormat} data
     */
    import(data) {
        if (data?.header.magic !== Demo.magic) {
            throw new Error(`Invalid RetroWriter demo file data`);
        }

        const header = data.header;

        this.#version = header?.version;

        this.#instructions = data.instructions?.map((instruction) => Instruction.fromData(instruction)) ?? [];
    }
}
