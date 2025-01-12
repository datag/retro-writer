import { DemoFormatInstruction, DemoFormatInstructionArgument } from './Demo';

export default class Instruction {
    static cursorUp    = 'CUP';
    static cursorDown  = 'CDW';
    static cursorLeft  = 'CLF';
    static cursorRight = 'CRT';
    static scroll      = 'SCR';
    static advance     = 'ADV';
    static retract     = 'RCT';
    static character   = 'CHR';
    static clearCell   = 'CLR';

    static cursorForegroundColor = 'CFC';
    static cursorBackgroundColor = 'CBC';
    static cursorBorderColor     = 'CDC';
    static cursorForegroundPulse = 'CFP';
    static cursorBackgroundPulse = 'CBP';
    static cursorBorderPulse     = 'CDP';

    static globalForegroundColor = 'GFC';
    static globalBackgroundColor = 'GBC';
    static globalBorderColor     = 'GDC';
    static globalForegroundPulse = 'GFP';
    static globalBackgroundPulse = 'GBP';
    static globalBorderPulse     = 'GDP';

    mnemonic: string;
    argument1: DemoFormatInstructionArgument;
    argument2: DemoFormatInstructionArgument;

    /**
     * @param mnemonic Instruction mnemonic
     * @param argument1 First argument (depending on instruction)
     * @param argument2 Second argument (depending on instruction)
     */
    constructor(mnemonic: string, argument1: DemoFormatInstructionArgument = null, argument2: DemoFormatInstructionArgument = null) {
        this.mnemonic = mnemonic;
        this.argument1 = argument1;
        this.argument2 = argument2;
    }

    toData(): DemoFormatInstruction {
        if (this.argument1 === null && this.argument2 === null) {
            return this.mnemonic;
        } else {
            const data: DemoFormatInstructionArgument[] = [this.mnemonic];
            if (this.argument2 !== null) {
                data.push(this.argument1, this.argument2);
            } else {
                data.push(this.argument1);
            }
            return data;
        }
    }

    static fromData(data: DemoFormatInstruction) {
        if (typeof data === 'string') {
            return new Instruction(data);
        } else if (Array.isArray(data) && data.length > 0) {
            if (typeof data[0] !== 'string') {
                throw new Error(`Invalid instruction data: Expected string as mnemonic, got ${typeof data[0]}`);
            }
            const [mnemonic, argument1 = null, argument2 = null] = data;
            return new Instruction(mnemonic, argument1, argument2);
        } else {
            throw new Error(`Invalid instruction data: Expected string or array with at least one item as instruction data, got ${typeof data}`);
        }
    }
}
