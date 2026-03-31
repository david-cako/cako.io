export default class Menu {
    static menu = document.getElementById("cako-menu");
    static menuIcon = document.getElementById("menu-icon");
    static menuInner = document.getElementById("cako-menu-inner");
    static menuItems = document.getElementsByClassName("cako-menu-item");
    static menuLights = document.getElementById("cako-menu-lights");
    static menuFeatures = document.getElementById("cako-menu-features");
    static menuFeaturesLink = document.getElementById("cako-menu-features-link");

    static newFeatureDate = 1633046530235;

    static get menuIndicator() {
        return document.getElementById("cako-menu-indicator");
    }

    static get menuIndicatorCleared() {
        return localStorage.getItem("menuIndicatorCleared");
    }

    static set menuIndicatorCleared(value) {
        localStorage.setItem("menuIndicatorCleared", String(value));
    }

    constructor() {
        Menu.setupListeners()
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
    }

    static close() {
        Menu.menuInner.style.display = "none";

        if (document.activeElement) {
            document.activeElement.blur();
        }
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

    static maybeClose(e) {
        if (Menu.menuInner.style.display === "block") {
            if (e.target !== Menu.menuIcon &&
                e.target !== Menu.menuInner &&
                !window.Search.searchFeed.contains(e.target) &&
                !Menu.menuInner.contains(e.target)) {
                Menu.close();
            }
        }
    }

    static maybeShowMenuIndicator() {
        const indicatorCleared = Menu.menuIndicatorCleared;

        if (!indicatorCleared || (Number(indicatorCleared) < Menu.newFeatureDate)) {
            Menu.showMenuIndicator();
        }
    }

    static setupListeners() {
        Menu.menuIcon.addEventListener("click", Menu.toggle);

        for (const i of Menu.menuItems) {
            i.addEventListener("click", Menu.toggle);
        }

        Menu.menuLights.addEventListener("click", window.Lights.toggle);

        document.addEventListener("click", Menu.maybeClose);
    }
}