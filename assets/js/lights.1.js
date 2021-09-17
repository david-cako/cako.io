function lightsOn() {
    const link = document.getElementById("dark-mode");

    if (link) {
        link.remove();
    }
}

function lightsOff() {
    const link = document.createElement("link");
    link.id = "dark-mode";
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = "/assets/css/dark.2.css";

    document.head.appendChild(link);
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
