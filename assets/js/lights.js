function toggleLights() {
    const lights = localStorage.getItem("lights");

    if (lights === "off") {
        const link = document.getElementById("dark-mode");

        if (link) {
            link.remove();
        }

        localStorage.setItem("lights", "on");
    } else {
        const link = document.createElement("link");
        link.id = "dark-mode";
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = "/assets/css/dark.css";

        document.head.appendChild(link);

        localStorage.setItem("lights", "off");
    }
}

(() => {
    const lights = localStorage.getItem("lights");

    if (lights === "off") {
        const link = document.createElement("link");
        link.id = "dark-mode";
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = "/assets/css/dark.css";

        document.head.appendChild(link);
    }
})();
