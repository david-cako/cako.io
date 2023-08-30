// Global functions for lights.
// This loads immediately for smooth layout.

const LIGHTS_ON_CALLBACKS = [];
const LIGHTS_OFF_CALLBACKS = [];

function lightsOn() {
    removeDarkCss();

    document.documentElement.classList.remove("dark");

    setThemeColor("light");
}

function lightsOff() {
    insertDarkCss();

    document.documentElement.classList.add("dark");

    setThemeColor("dark");
}

function lightsStatus() {
    const lights = localStorage.getItem("lights");

    if (lights === "off") {
        return "off"
    } else {
        return "on";
    }
}

function toggleLights() {
    const lights = lightsStatus();

    if (lights === "off") {
        lightsOn();
        localStorage.setItem("lights", "on");
    } else {
        lightsOff();
        localStorage.setItem("lights", "off");
    }
}

function initLights() {
    const lights = lightsStatus();

    if (lights === "off") {
        lightsOff();
    } else {
        lightsOn();
    }
}

function prefetchDarkCss() {
    return fetch(DARK_CSS_PATH);
}

function insertDarkCss() {
    const existing = document.getElementById("dark-mode");
    if (existing) {
        return;
    }

    const link = document.createElement("link");
    link.id = "dark-mode";
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = DARK_CSS_PATH;

    document.head.appendChild(link);
}

function removeDarkCss() {
    const link = document.getElementById("dark-mode");

    if (link) {
        link.remove();
    }
}

function setThemeColor(color) {
    const themeColor = document.getElementById("theme-color");

    if (color === "light") {
        themeColor.content = "#fff";
    } else if (color === "dark") {
        themeColor.content = "#000";
    } else {
        throw new Error("Invalid color passed to setThemeColor")
    }
}

function addLightsOnCallback(callback) {
    LIGHTS_ON_CALLBACKS.push(callback);
}

function addLightsOffCallback(callback) {
    LIGHTS_OFF_CALLBACKS.push(callback)
}

function removeLightsOnCallback(callback) {
    LIGHTS_ON_CALLBACKS = LIGHTS_ON_CALLBACKS.filter(
        c => c !== callback
    );
}

function removeLightsOffCallback(callback) {
    LIGHTS_OFF_CALLBACKS = LIGHTS_OFF_CALLBACKS.filter(
        c => c !== callback
    );
}

(() => {
    initLights();
    window.addEventListener("focus", initLights);
})();
