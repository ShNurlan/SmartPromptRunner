chrome.runtime.onMessage.addListener(async (message) => {
    if (message.action !== "sendPrompt") {
        return;
    }

    const editor = document.querySelector(
        'div.ProseMirror[contenteditable="true"]'
    );

    if (!editor) {
        console.error("SmartPromptRunner: ChatGPT editor not found.");
        return;
    }

    editor.focus();

    const prompt = message.prompt;

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
});

const STOP_BUTTON_SELECTOR =
    'button[data-testid*="stop" i], button[aria-label*="stop" i]';

let generationState = "idle";
let finishReported = false;
function detectGenerationState() {
    const stopButton = document.querySelector(STOP_BUTTON_SELECTOR);

    if (stopButton) {
        return "generating";
    }

    if (generationState === "generating") {
        return "finished";
    }

    return generationState;
}

function updateGenerationState() {
    const nextState = detectGenerationState();

    if (nextState === generationState) {
        return;
    }

    generationState = nextState;

    console.log(`SmartPromptRunner state: ${generationState}`);

    if (generationState === "generating") {

        finishReported = false;

        chrome.runtime.sendMessage({
            action: "generationState",
            state: "generating"
        });

        return;
    }

    if (generationState === "finished" && !finishReported) {

        finishReported = true;

        chrome.runtime.sendMessage({
            action: "generationState",
            state: "finished"
        });
    }
}

async function waitForSendButton(timeout = 2000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
        const button = document.querySelector(
            'button[data-testid="send-button"], ' +
            'button[aria-label*="send" i], ' +
            'button[type="submit"]'
        );

        if (button) {
            return button;
        }

        await new Promise(resolve => setTimeout(resolve, 25));
    }

    return null;
}

const generationObserver = new MutationObserver(() => {
    updateGenerationState();
});

generationObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["aria-label", "data-testid"]
});