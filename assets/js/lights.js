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
