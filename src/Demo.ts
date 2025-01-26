import App from './App';
import Instruction from './Instruction';

interface DemoFormatHeader {
    version: string;
}

export type DemoFormatInstructionArgument = null | string | number | boolean;

export type DemoFormatInstruction = string | (string | DemoFormatInstructionArgument)[];

export interface DemoFormat {
    magic: string;
    header: DemoFormatHeader;
    instructions: DemoFormatInstruction[];
}

interface GistFileInfo {
    filename: string,
    language: string,
    content: string,
    raw_url: string,
    truncated: boolean,
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
            throw new Error('Invalid RetroWriter demo file data');
        }

        const header = data.header;
        if (typeof header === 'undefined') {
            throw new Error('Header missing');
        }

        this.#version = header?.version;

        this.#instructions = data.instructions?.map((instruction: DemoFormatInstruction): Instruction => Instruction.fromData(instruction)) ?? [];
    }

    static async loadDemoFromFileObject(file: File): Promise<DemoFormat> {
        if (file.type !== 'application/json') {
            throw new Error(`Expected file of type 'application/json', got '${file.type}'`);
        }

        const content = await file.text();
        return JSON.parse(content);
    }

    static async loadDemoFromUrl(url: string): Promise<DemoFormat> {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch demo from URL: ${response.statusText}`);
        }

        return await response.json();
    }

    static async loadDemoFromGist(gistId: string): Promise<DemoFormat> {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch gist: ${response.statusText}`);
        }

        const data = await response.json();

        const filename = Object.keys(data.files)[0]; // Assume first file
        const fileInfo: GistFileInfo = data.files[filename];

        if (fileInfo.language !== 'JSON') {
            throw new Error(`Expected gist content to be JSON`);
        }

        if (!fileInfo.truncated) {
            return JSON.parse(fileInfo.content);
        } else {
            return Demo.loadDemoFromUrl(fileInfo.raw_url);
        }
    }
}

export default Demo;
