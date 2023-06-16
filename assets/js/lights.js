// Global functions for lights.
// This loads immediately for smooth layout.

const LIGHTS_ON_CALLBACKS = [];
const LIGHTS_OFF_CALLBACKS = [];

function lightsOn() {
    const link = document.getElementById("dark-mode");

    if (link) {
        link.remove();
    }

    document.documentElement.classList.remove("dark");

    const tc = document.getElementById("theme-color");
    if (tc) {
        tc.remove();
    }

    const themeColor = document.createElement("meta");
    themeColor.id = "theme-color";
    themeColor.name = "theme-color";
    themeColor.content = "#fff";

    document.head.appendChild(themeColor);
}

function lightsOff() {
    const link = document.createElement("link");
    link.id = "dark-mode";
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = DARK_CSS_PATH;

    document.head.appendChild(link);

    document.documentElement.classList.add("dark");

    const tc = document.getElementById("theme-color");
    if (tc) {
        tc.remove();
    }

    const themeColor = document.createElement("meta");
    themeColor.id = "theme-color";
    themeColor.name = "theme-color";
    themeColor.content = "#000";

    document.head.appendChild(themeColor);
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

function prefetchDarkCss() {
    return fetch(DARK_CSS_PATH);
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
    const lights = lightsStatus();

    if (lights === "off") {
        lightsOff();
    }
})();
