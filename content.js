chrome.runtime.onMessage.addListener((message) => {
    if (message.action !== "sendHardcodedPrompt") {
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

    setTimeout(() => {
        const composer = editor.closest("form") || document;
        const sendButton = composer.querySelector(
            'button[data-testid="send-button"], ' +
            'button[aria-label*="send" i], ' +
            'button[type="submit"]'
        );

        if (!sendButton) {
            console.error("SmartPromptRunner: Send button not found.");
            return;
        }

        sendButton.click();
    }, 100);
});

const STOP_BUTTON_SELECTOR =
    'button[data-testid*="stop" i], button[aria-label*="stop" i]';

let generationState = "idle";

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

    if (
        generationState === "generating" ||
        generationState === "finished"
    ) {
        chrome.runtime.sendMessage({
            action: "generationState",
            state: generationState
        });
    }
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
