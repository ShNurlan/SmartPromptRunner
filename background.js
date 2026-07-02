let runActive = false;
let runTabId = null;

const promptQueue = [
    "Prompt A",
    "Prompt B",
    "Prompt C"
];

let currentIndex = 0;

const runStateReady = chrome.storage.session
    .get(["runActive", "runTabId"])
    .then((state) => {
        runActive = state.runActive === true;
        runTabId = state.runTabId ?? null;
    });

async function setRunState(active, tabId = null) {
    runActive = active;
    runTabId = tabId;

    await chrome.storage.session.set({
        runActive,
        runTabId
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "generationState") {
        (async () => {
            await runStateReady;

            if (message.state === "generating") {
                console.log("Generation started");
            } else if (message.state === "finished") {
    console.log("Generation finished");

    if (sender.tab?.id === runTabId) {

        currentIndex++;

        if (currentIndex < promptQueue.length) {
            console.log(
                `Next prompt: ${promptQueue[currentIndex]}`
            );
        } else {
            console.log("Queue completed.");
        }

        await setRunState(false);
    }
}

            sendResponse({ ok: true });
        })();

        return true;
    }

    if (message.action !== "start") {
        return;
    }

    (async () => {
        try {
            await runStateReady;

            if (runActive) {
                sendResponse({
                    ok: true,
                    ignored: true
                });
                return;
            }

            if (promptQueue.length === 0) {
                throw new Error("SmartPromptRunner: Prompt queue is empty.");
            }

            if (
                !Number.isInteger(currentIndex) ||
                currentIndex < 0 ||
                currentIndex >= promptQueue.length
            ) {
                throw new Error(
                    "SmartPromptRunner: Current prompt index is out of range."
                );
            }

            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            if (!tab?.id) {
                throw new Error("SmartPromptRunner: Active tab not found.");
            }

            await setRunState(true, tab.id);

            await chrome.tabs.sendMessage(tab.id, {
                action: "sendPrompt",
                prompt: promptQueue[currentIndex]
            });

            sendResponse({ ok: true });
        } catch (error) {
            await setRunState(false);

            sendResponse({
                ok: false,
                error: error.message
            });
        }
    })();

    return true;
});
