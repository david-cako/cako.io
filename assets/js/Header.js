class Header {
    static opacity = 1;

    static header = document.getElementById('cako-header-text');
    static headerLink = document.getElementById('cako-site-nav-link');
    static maxScroll = 35;

    static get browserSupportsCssScrollAnimations() {
        return window.CSS.supports("animation-timeline", "scroll()") &&
            window.CSS.supports("animation-range", "0px 35px");
    }

    static init() {
        if (!Header.browserSupportsCssScrollAnimations) {
            updateHeaderOpacity();

            window.addEventListener('scroll', Header.updateHeaderOpacity);

            // header navigation saved to top of home page for InfiniteScroll's state restore
            Header.headerLink.addEventListener('click', () => {
                localStorage.setItem("contentScrollPosition", 0);
            });
        }
    }

    static updateHeaderOpacity() {
        requestAnimationFrame(() => {
            if (window.scrollY > maxScroll && lastOpacity === 0) {
                return;
            }

            const newOpacity = window.scrollY > maxScroll
                ? 0
                : 1 - (window.scrollY / maxScroll);

            cakoHeader.style.opacity = newOpacity;
            lastOpacity = newOpacity;
        })
    }

}

/** Setup scroll handler for CAKO logo. */
(() => {
    Header.init();
})();