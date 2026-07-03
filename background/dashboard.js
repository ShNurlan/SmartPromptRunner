const projectName = document.getElementById("projectName");
const loadedCount = document.getElementById("loadedCount");
const progress = document.getElementById("progress");
const status = document.getElementById("status");
const currentPrompt = document.getElementById("currentPrompt");
const log = document.getElementById("log");

const startButton = document.getElementById("start");
const pauseButton = document.getElementById("pause");
const stopButton = document.getElementById("stop");

startButton.disabled = true;
pauseButton.disabled = true;
stopButton.disabled = true;

log.textContent = "Dashboard initialized.";