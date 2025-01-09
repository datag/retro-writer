import Writer from './Writer';
import Instruction from './Instruction';

export default class Demo {
    constructor() {
        this.version = Writer.AppVersion;

        /** @type {Instruction[]} */
        this.instructions = [];

        /** @type {?number} */
        this.instructionIndex = null;
    }

    addInstruction(instruction) {
        this.instructions.push(instruction);
    }

    resetInstructionIndex() {
        this.instructionIndex = 0;
    }

    nextInstruction() {
        const count = this.instructions.length;
        const index = this.instructionIndex;

        if (count == 0 || index === null) {
            return null;
        }

        const instruction = this.instructions[index];

        if (index < count - 1) {
            this.instructionIndex++;
        } else {
            this.instructionIndex = null;
        }

        return instruction;
    }
}
