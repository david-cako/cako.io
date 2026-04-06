class Header {
    static opacity = 1;

    static header = document.getElementById('cako-header-text');
    static headerLink = document.getElementById('cako-site-nav-link');
    static maxScroll = 35;

    static lastOpacity;

    static get browserSupportsCssScrollAnimations() {
        return window.CSS.supports("animation-timeline", "scroll()") &&
            window.CSS.supports("animation-range", "0px 35px");
    }

    static init() {
        if (!Header.browserSupportsCssScrollAnimations) {
            Header.updateHeaderOpacity();

            window.addEventListener('scroll', Header.updateHeaderOpacity);

            // header navigation saved to top of home page for InfiniteScroll's state restore
            Header.headerLink.addEventListener('click', () => {
                localStorage.setItem("contentScrollPosition", 0);
            });
        }
    }

    static updateHeaderOpacity() {
        requestAnimationFrame(() => {
            if (window.scrollY > Header.maxScroll && Header.lastOpacity === 0) {
                return;
            }

            const newOpacity = window.scrollY > Header.maxScroll
                ? 0
                : 1 - (window.scrollY / Header.maxScroll);

            Header.header.style.opacity = newOpacity;
            Header.lastOpacity = newOpacity;
        })
    }

    /** ??? Fixes opacity stuck after navigating to new page when scrolled just 100px. */
    static resetAnimation() {
        Header.header.style.animation = "none";

        setTimeout(() => {
            Header.header.style.animation = "";
        }, 10);
    }
}

/** Setup scroll handler for CAKO logo. */
(() => {
    Header.init();
    window.Header = Header;
})();