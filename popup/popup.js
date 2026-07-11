const startButton = document.getElementById("start");
const promptFile = document.getElementById("promptFile");
const fileInfo = document.getElementById("fileInfo");
const loadedCount = document.getElementById("loadedCount");
const progress = document.getElementById("progress");

let prompts = [];
chrome.storage.session
    .get([
        "progressCurrent",
        "progressTotal"
    ])
    .then(state => {

        progress.textContent =
            `${state.progressCurrent ?? 0} / ${state.progressTotal ?? 0}`;

    });
    
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

    if (/\r?\n\s*\r?\n/.test(text)) {

    // Новый формат:
    // один промпт = блок текста,
    // разделенный пустой строкой

    prompts = text
        .split(/\r?\n\s*\r?\n/)
        .map(prompt => prompt.trim())
        .filter(prompt => prompt.length > 0);

} else {

    // Старый формат:
    // одна строка = один промпт

    prompts = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

    console.log("Loaded prompts:", prompts.length);
    console.log(prompts);

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

chrome.storage.onChanged.addListener((changes, area) => {

    if (area !== "session") {
        return;
    }

    if (
        changes.progressCurrent ||
        changes.progressTotal
    ) {

        chrome.storage.session
            .get([
                "progressCurrent",
                "progressTotal"
            ])
            .then(state => {

                progress.textContent =
                    `${state.progressCurrent ?? 0} / ${state.progressTotal ?? 0}`;

            });
    }
});