document.getElementById("start").addEventListener("click", async () => {
    try {
        const response = await chrome.runtime.sendMessage({
            action: "start"
        });

        if (!response.ok) {
            console.error(response.error);
        }
    } catch (error) {
        console.error(error);
    }
});
