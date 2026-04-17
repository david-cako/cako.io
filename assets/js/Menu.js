export default class Menu {
    static shown = false;

    static menu = document.getElementById("cako-menu");
    static menuIcon = document.getElementById("menu-icon");
    static menuInner = document.getElementById("cako-menu-inner");
    static menuItems = document.getElementsByClassName("cako-menu-item");
    static menuLights = document.getElementById("cako-menu-lights");
    static menuFeatures = document.getElementById("cako-menu-features");
    static menuFeaturesLink = document.getElementById("cako-menu-features-link");

    static newFeatureDate = 1633046530235;

    static menuStateCallbacks = [];

    static get menuIndicator() {
        return document.getElementById("cako-menu-indicator");
    }

    static get menuIndicatorCleared() {
        return localStorage.getItem("menuIndicatorCleared");
    }

    static set menuIndicatorCleared(value) {
        localStorage.setItem("menuIndicatorCleared", String(value));
    }

    static init() {
        Menu.menuIcon.addEventListener("click", Menu.toggle);

        Menu.menuLights.addEventListener("click", window.Lights.toggle);
    }

    static toggle() {
        if (Menu.menuInner) {
            if (Menu.menuInner.style.display === "block") {
                Menu.close();
            } else {
                Menu.open();
            }
        }
    }

    static open() {
        Menu.menuInner.style.display = "block";
        Menu.clearMenuIndicator();

        if (window.Search !== undefined) {
            // autofocus unless on iOS, prevents scroll jump
            !([
                'iPad Simulator',
                'iPhone Simulator',
                'iPod Simulator',
                'iPad',
                'iPhone',
                'iPod'
            ].includes(navigator.platform)
                || (navigator.userAgent.includes("Mac") && "ontouchend" in document)) &&
                window.Search.focus();
        }

        window.Lights.prefetchDarkCss();

        Menu.shown = true;

        Menu.callStateChangeCallbacks(true);
    }

    static close() {
        Menu.menuInner.style.display = "none";

        if (document.activeElement) {
            document.activeElement.blur();
        }

        Menu.shown = false;

        Menu.callStateChangeCallbacks(false);
    }

    static showMenuIndicator() {
        const i = document.createElement("div");
        i.id = "cako-menu-indicator";

        menu.appendChild(i);
    }

    static clearMenuIndicator() {
        if (Menu.menuIndicator) {
            Menu.menuIndicator.remove();

            Menu.menuIndicatorCleared = String(Date.now());
        }
    }

    static maybeShowMenuIndicator() {
        const indicatorCleared = Menu.menuIndicatorCleared;

        if (!indicatorCleared || (Number(indicatorCleared) < Menu.newFeatureDate)) {
            Menu.showMenuIndicator();
        }
    }

    static onStateChange(fn) {
        Menu.menuStateCallbacks.push(fn);
    }

    static offStateChange(fn) {
        Menu.menuStateCallbacks = Menu.menuStateCallbacks.filter(fn !== fn);
    }

    static callStateChangeCallbacks(shown) {
        for (const fn of Menu.menuStateCallbacks) {
            fn(shown);
        }
    }
}