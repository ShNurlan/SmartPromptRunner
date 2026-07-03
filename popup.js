const startButton = document.getElementById("start");
const promptFile = document.getElementById("promptFile");
const fileInfo = document.getElementById("fileInfo");

let prompts = [];

promptFile.addEventListener("change", async () => {

    if (promptFile.files.length === 0) {
        prompts = [];
        fileInfo.textContent = "No file selected";
        return;
    }

    const file = promptFile.files[0];

    fileInfo.textContent = file.name;

    const text = await file.text();

    prompts = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    fileInfo.textContent =
        `${file.name} (${prompts.length} prompts)`;
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

        await chrome.runtime.sendMessage({
            action: "start"
        });

    } catch (error) {
        console.error(error);
    }

});