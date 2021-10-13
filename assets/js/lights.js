function lightsOn() {
    const link = document.getElementById("dark-mode");

    if (link) {
        link.remove();
    }

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

function toggleLights() {
    const lights = localStorage.getItem("lights");

    if (lights === "off") {
        lightsOn();

        localStorage.setItem("lights", "on");
    } else {
        lightsOff();

        localStorage.setItem("lights", "off");
    }
}

(() => {
    const lights = localStorage.getItem("lights");

    if (lights === "off") {
        lightsOff();
    }
})();
