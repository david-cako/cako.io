/** Setup scroll handler for CAKO logo. */
(() => {
    const cakoHeader = document.getElementById('cako-header-text');
    const cakoHeaderLink = document.getElementById('cako-site-nav-link');
    const cakoHeaderMaxScroll = 35;

    let lastOpacity = 1;

    const updateHeaderOpacity = () => {
        if (window.scrollY > cakoHeaderMaxScroll && lastOpacity === 0) {
            return;
        }

        const newOpacity = window.scrollY > cakoHeaderMaxScroll
            ? 0
            : 1 - (window.scrollY / cakoHeaderMaxScroll);

        cakoHeader.style.opacity = newOpacity;
        lastOpacity = newOpacity;
    }

    updateHeaderOpacity();

    window.addEventListener('scroll', () => {
        updateHeaderOpacity();
    });

    // header navigation goes to top of home page
    cakoHeaderLink.addEventListener('click', () => {
        localStorage.setItem("contentScrollPosition", 0);
    });
})();