import App from './App';
import Instruction from './Instruction';

export default class Demo {
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

    export() {
        return {
            header: {
                version: this.#version,
                // TODO: name, settings, ...
            },
            instructions: this.#instructions.map((instruction) => instruction.toData())
        };
    }
}
