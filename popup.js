const startButton = document.getElementById("start");
const promptFile = document.getElementById("promptFile");
const fileInfo = document.getElementById("fileInfo");
const loadedCount = document.getElementById("loadedCount");
const progress = document.getElementById("progress");

let prompts = [];

promptFile.addEventListener("change", async () => {

    if (promptFile.files.length === 0) {
        prompts = [];
        fileInfo.textContent = "No file selected";
        loadedCount.textContent = "0";
        progress.textContent = "0 / 0";
        return;
    }

    const file = promptFile.files[0];

    fileInfo.textContent = file.name;

    const text = await file.text();

    prompts = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    loadedCount.textContent = prompts.length;
    progress.textContent = `0 / ${prompts.length}`;
});

startButton.addEventListener("click", async () => {

    try {

        const response = await chrome.runtime.sendMessage({
            action: "loadPrompts",
            prompts
        });

        if (!response.ok) {
            console.error(response.error);
            return;
        }

        progress.textContent = `1 / ${prompts.length}`;

        await chrome.runtime.sendMessage({
            action: "start"
        });

    } catch (error) {
        console.error(error);
    }

});