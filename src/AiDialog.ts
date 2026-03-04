import { DemoFormat } from './Demo';
import AiGenerator from './AiGenerator';

export default class AiDialog {
    #overlay: HTMLDivElement;
    #onSuccess: (data: DemoFormat) => void;

    constructor(onSuccess: (data: DemoFormat) => void) {
        this.#onSuccess = onSuccess;
        this.#overlay = document.createElement('div');
        this.#overlay.className = 'ai-dialog-overlay';
        document.body.appendChild(this.#overlay);
    }

    get isOpen(): boolean {
        return this.#overlay.style.display === 'flex';
    }

    open() {
        if (AiGenerator.getApiKey()) {
            this.#renderPromptView();
        } else {
            this.#renderKeyView();
        }
        this.#overlay.style.display = 'flex';
    }

    close() {
        this.#overlay.style.display = 'none';
        this.#overlay.innerHTML = '';
    }

    #renderKeyView() {
        this.#overlay.innerHTML = '';

        const dialog = document.createElement('div');
        dialog.className = 'ai-dialog';
        dialog.innerHTML = `
            <h2>🔑 OpenAI API Key</h2>
            <input type="password" class="js-key-input" placeholder="sk-..." autocomplete="off" />
            <div class="ai-dialog-actions">
                <button class="js-save-btn">Save Key</button>
                <button class="js-cancel-btn ai-dialog-link">Cancel</button>
            </div>
            <small>Your key is stored only in this browser's localStorage.</small>
            <div class="ai-dialog-status js-status"></div>
        `;
        this.#overlay.appendChild(dialog);

        const keyInput = dialog.querySelector<HTMLInputElement>('.js-key-input')!;
        const saveBtn = dialog.querySelector<HTMLButtonElement>('.js-save-btn')!;
        const cancelBtn = dialog.querySelector<HTMLButtonElement>('.js-cancel-btn')!;

        keyInput.focus();

        saveBtn.addEventListener('click', () => {
            const key = keyInput.value.trim();
            if (!key) return;
            AiGenerator.saveApiKey(key);
            this.#renderPromptView();
        });

        cancelBtn.addEventListener('click', () => this.close());

        keyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveBtn.click();
            if (e.key === 'Escape') this.close();
        });
    }

    #renderPromptView() {
        this.#overlay.innerHTML = '';

        const dialog = document.createElement('div');
        dialog.className = 'ai-dialog';
        dialog.innerHTML = `
            <h2>✨ AI Generate Demo</h2>
            <textarea class="js-prompt-input" placeholder="Describe your demo… e.g. &quot;A birthday message with colorful pulsing effects&quot;"></textarea>
            <div class="ai-dialog-actions">
                <button class="js-generate-btn" disabled>Generate</button>
                <button class="js-change-key-btn ai-dialog-link">⚙ Change key</button>
                <button class="js-cancel-btn ai-dialog-link">Cancel</button>
            </div>
            <div class="ai-dialog-status js-status"></div>
        `;
        this.#overlay.appendChild(dialog);

        const promptInput = dialog.querySelector<HTMLTextAreaElement>('.js-prompt-input')!;
        const generateBtn = dialog.querySelector<HTMLButtonElement>('.js-generate-btn')!;
        const changeKeyBtn = dialog.querySelector<HTMLButtonElement>('.js-change-key-btn')!;
        const cancelBtn = dialog.querySelector<HTMLButtonElement>('.js-cancel-btn')!;
        const status = dialog.querySelector<HTMLDivElement>('.js-status')!;

        promptInput.focus();

        promptInput.addEventListener('input', () => {
            generateBtn.disabled = promptInput.value.trim().length === 0;
        });

        changeKeyBtn.addEventListener('click', () => this.#renderKeyView());
        cancelBtn.addEventListener('click', () => this.close());

        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        generateBtn.addEventListener('click', async () => {
            const prompt = promptInput.value.trim();
            if (!prompt) return;

            generateBtn.disabled = true;
            cancelBtn.disabled = true;
            status.className = 'ai-dialog-status info';
            status.textContent = 'Generating…';

            try {
                const demo = await AiGenerator.generate(prompt);
                this.close();
                this.#onSuccess(demo);
            } catch (e) {
                status.className = 'ai-dialog-status error';
                status.textContent = e instanceof Error ? e.message : 'Unknown error';
                generateBtn.disabled = false;
                cancelBtn.disabled = false;
            }
        });
    }
}
