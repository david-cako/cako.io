// Global class for lights.
// This loads immediately for smooth layout.

class Lights {
    static onCallbacks = [];
    static offCallbacks = [];

    static themeColor = document.getElementById("theme-color");

    static get status() {
        const lights = localStorage.getItem("lights");

        if (lights === "off") {
            return "off"
        } else {
            return "on";
        }
    }

    static get darkModeCssLink() {
        return document.getElementById("dark-mode");
    }

    static init() {
        if (Lights.status === "off") {
            Lights.off();
        } else {
            Lights.on();
        }
    }

    static on() {
        Lights.removeDarkCss();

        document.documentElement.classList.remove("dark");

        Lights.setThemeColor("light");
    }

    static off() {
        Lights.insertDarkCss();

        document.documentElement.classList.add("dark");

        Lights.setThemeColor("dark");
    }

    static toggle() {
        if (Lights.status === "off") {
            Lights.on();
            localStorage.setItem("lights", "on");
        } else {
            Lights.off();
            localStorage.setItem("lights", "off");
        }
    }

    static prefetchDarkCss() {
        return fetch(DARK_CSS_PATH);
    }

    static insertDarkCss() {
        if (Lights.darkModeCssLink) {
            return;
        }

        const link = document.createElement("link");
        link.id = "dark-mode";
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = DARK_CSS_PATH;

        document.head.appendChild(link);
    }

    static removeDarkCss() {
        if (Lights.darkModeCssLink) {
            Lights.darkModeCssLink.remove();
        }
    }

    static setThemeColor(color) {
        if (color === "light") {
            Lights.themeColor.content = "#fff";
        } else if (color === "dark") {
            Lights.themeColor.content = "#000";
        } else {
            throw new Error("Invalid color passed to setThemeColor")
        }
    }

    static addLightsOnCallback(callback) {
        Lights.onCallbacks.push(callback);
    }

    static addLightsOffCallback(callback) {
        Lights.offCallbacks.push(callback)
    }

    static removeLightsOnCallback(callback) {
        Lights.onCallbacks = Lights.onCallbacks.filter(
            c => c !== callback
        );
    }

    static removeLightsOffCallback(callback) {
        Lights.offCallbacks = Lights.offCallbacks.filter(
            c => c !== callback
        );
    }
}

(() => {
    window.Lights = Lights;

    Lights.init();
    window.addEventListener("focus", Lights.init);
})();
