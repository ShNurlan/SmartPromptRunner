let runActive = false;
let runTabId = null;

let promptQueue = [];

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

async function sendCurrentPrompt(tabId) {

    console.log("BACKGROUND SEND:", currentIndex);

    try {

        await chrome.tabs.sendMessage(tabId, {
            action: "sendPrompt",
            prompt: promptQueue[currentIndex]
        });

    } catch (error) {

        console.error("SEND MESSAGE FAILED:", error);

    }
}

async function handleGenerationFinished(senderTabId) {

    console.log("Generation finished");

    if (senderTabId !== runTabId) {
        return;
    }

    currentIndex++;

    await chrome.storage.session.set({
        progressCurrent: currentIndex + 1,
        progressTotal: promptQueue.length
    });

    if (currentIndex < promptQueue.length) {

        console.log(
            `Next prompt: ${promptQueue[currentIndex]}`
        );

        await new Promise(resolve => setTimeout(resolve, 5000));

        await sendCurrentPrompt(runTabId);
        return;
    }
 
    console.log("Queue completed.");

    await chrome.storage.session.set({
        progressCurrent: promptQueue.length,
        progressTotal: promptQueue.length
    });

    await setRunState(false);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("BACKGROUND:", message);
    if (message.action === "generationState") {
        (async () => {
            await runStateReady;

            if (message.state === "generating") {
                console.log("Generation started");
            } else if (message.state === "finished") {
                await handleGenerationFinished(sender.tab?.id);
            }

            sendResponse({ ok: true });
        })();

        return true;
    }


    if (message.action === "loadPrompts") {

    promptQueue = [...message.prompts];

    currentIndex = 0;
    
    chrome.storage.session.set({
        progressCurrent: 0,
        progressTotal: promptQueue.length
    });
    console.log(`Loaded ${promptQueue.length} prompts.`);

    sendResponse({ ok: true });

    return;
}
    
    if (message.action !== "start") {
        return;
    }

    (async () => {
        try {
            await runStateReady;

            console.log("After runStateReady");
            console.log("runActive =", runActive);

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
            
            console.log("STEP 1");

            currentIndex = 0;

            await chrome.storage.session.set({
                progressCurrent: 1,
                progressTotal: promptQueue.length
            });

            console.log("STEP 2");

            await setRunState(true, tab.id);

            console.log("STEP 3");

            await sendCurrentPrompt(tab.id);

            console.log("STEP 4");

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
