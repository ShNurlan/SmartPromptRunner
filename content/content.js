const STOP_BUTTON_SELECTOR =
    'button[data-testid*="stop" i], button[aria-label*="stop" i]';

const SEND_BUTTON_SELECTOR =
    'button[data-testid="send-button"], ' +
    'button[aria-label*="send" i], ' +
    'button[type="submit"]';

const EDITOR_SELECTOR =
    'div.ProseMirror[contenteditable="true"]';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action !== "sendPrompt") {
        return;
    }

    (async () => {
        const editor = document.querySelector(EDITOR_SELECTOR);

        if (!editor) {
            console.error("SmartPromptRunner: ChatGPT editor not found.");
            return;
        }

        const prompt = message.prompt;

        editor.focus();

        const paragraph = document.createElement("p");
        paragraph.textContent = prompt;
        editor.replaceChildren(paragraph);

        editor.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: prompt
        }));

        const sendButton = await waitForSendButton();

        if (!sendButton) {
            console.error("SmartPromptRunner: Send button timeout.");
            return;
        }

        sendButton.click();

        chrome.runtime.sendMessage({
            action: "generationState",
            state: "generating"
        });

        waitForGenerationToFinish();
    })();
});

async function waitForSendButton(timeout = 2000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
        const button = document.querySelector(SEND_BUTTON_SELECTOR);

        if (button && !button.disabled) {
            return button;
        }

        await sleep(25);
    }

    return null;
}

async function waitForGenerationToFinish() {
    const initialImages = document.querySelectorAll("img").length;

    while (true) {
        const stopButton = document.querySelector(STOP_BUTTON_SELECTOR);

        if (stopButton) {
            break;
        }

        await sleep(100);
    }

    while (true) {
        const stopButton = document.querySelector(STOP_BUTTON_SELECTOR);

        if (!stopButton) {
            while (true) {
                const currentImages = document.querySelectorAll("img").length;

                if (currentImages > initialImages) {
                    chrome.runtime.sendMessage({
                        action: "generationState",
                        state: "finished"
                    });

                    return;
                }

                await sleep(500);
            }
        }

        await sleep(100);
    }
}
