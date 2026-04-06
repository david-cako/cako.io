import Menu from "./Menu.js";
import Search from "./Search.js";
import InfiniteScroll from "./InfiniteScroll.js";
import Api from "./Api.js";
import Html from "./Html.js";

export default class CakoApp {
    menu;
    search;
    infiniteScroll;
    api;

    state;
    /** Background state saved to return to after hiding search. */
    searchBackgroundState;

    indexScrollPos;
    featuresScrollPos;

    isLiveSite;

    static siteNavLink = document.getElementById("cako-site-nav-link");
    static indexInner = document.getElementById("index-inner");
    static postInner = document.getElementById("post-inner");
    static searchInner = document.getElementById("search-inner");
    static postArticle = document.getElementById("post-article");
    static postNavInner = document.getElementById("post-nav-inner");
    static siteFooterContent = document.querySelector(".site-footer-content");
    static emailAddress = document.getElementById("email-address");

    static get navLinkLeft() {
        return document.querySelector(".post-nav-link.left");
    }
    static get navLinkRight() {
        return document.querySelector(".post-nav-link.right");
    }

    constructor() {
        this.menu = new Menu();
        this.search = new Search(Menu);
        this.api = new Api();

        let page
        if (location.pathname == "/") {
            page = "/"
        } else {
            page = location.pathname.replaceAll("/", "");
        }

        this.state = { page: page };

        if (this.state.page == "all") {
            this.infiniteScroll = new InfiniteScroll({ noFetch: true });
        } else {
            this.infiniteScroll = new InfiniteScroll();
        }

        this.setupEventHandlers();
    }

    async navigateToIndex() {
        this.state = { page: "/" };

        this.saveScrollPosition();

        document.body.classList = "home-template";

        CakoApp.postInner.style.display = "none";
        CakoApp.postArticle.innerHTML = "";

        CakoApp.searchInner.style.display = "none";
        this.search.hideSearch();

        CakoApp.indexInner.style.display = "block";

        document.title = "cako.io";

        this.restoreScrollPosition();
    }

    async navigateToPost(id) {
        if (!id) {
            throw new Error("Missing id in call to navigateToPost(id)");
        }

        this.state = { page: id };

        this.saveScrollPosition();

        const post = await this.api.getPost(id);
        const generated = Html.generatePost(post);

        document.body.classList = "post-template";

        CakoApp.postArticle.innerHTML = "";
        CakoApp.postArticle.append(generated);

        CakoApp.postNavInner.innerHTML = "";
        if (post.prev) {
            CakoApp.postNavInner.append(Html.generatePostLink(post.prev, { navLink: "left" }));
        } else {
            CakoApp.postNavInner.append(document.createElement("div"));
        }
        if (post.next) {
            CakoApp.postNavInner.append(Html.generatePostLink(post.next, { navLink: "right" }));
        }

        CakoApp.indexInner.style.display = "none";

        CakoApp.searchInner.style.display = "none";
        this.search.hideSearch();
        Menu.close();

        CakoApp.emailAddress.style.display = "inline-block";
        CakoApp.postNavInner.style.display = "flex";

        CakoApp.postInner.style.display = "block";

        document.title = post.title;

        window.scrollTo({ top: 0 });
        window.Header.resetAnimation();
    }

    async navigateToFeatures() {
        this.state = { page: "features" };

        const features = await this.api.getFeaturesContent();

        this.saveScrollPosition();

        document.body.classList = "page-template";

        CakoApp.postArticle.innerHTML = features.innerHTML;

        CakoApp.indexInner.style.display = "none";
        CakoApp.searchInner.style.display = "none";

        CakoApp.emailAddress.style.display = "none";
        CakoApp.postNavInner.style.display = "none";

        CakoApp.postInner.style.display = "block";

        document.title = "Features";

        this.restoreScrollPosition();
    }

    async navigateToSearch() {
        this.state = { page: "search" };

        this.saveScrollPosition();

        CakoApp.indexInner.style.display = "none";
        CakoApp.postInner.style.display = "none";
        CakoApp.postArticle.innerHTML = "";

        CakoApp.emailAddress.style.display = "none";
        CakoApp.postNavInner.style.display = "none";

        CakoApp.searchInner.style.display = "block";
    }

    async navigateToState(state) {
        if (state.page) {
            switch (state.page) {
                case "/":
                    await this.navigateToIndex();
                    break;
                case "features":
                    await this.navigateToFeatures();
                    break;
                default:
                    await this.navigateToPost(state.page);
                    break;
            }
        }
    }

    saveScrollPosition() {
        if (this.state.page == "/") {
            this.indexScrollPos = window.scrollY;
        } else if (this.state.page == "features") {
            this.featuresScrollPos = window.scrollY;
        }
    }

    restoreScrollPosition() {
        if (this.state.page == "/") {
            const pos = this.indexScrollPos;

            if (pos !== null) {
                window.scroll(0, pos);
            }
        } else if (this.state.page == "features") {
            const pos = this.featuresScrollPos;

            if (pos !== null) {
                window.scroll(0, pos);
            }
        }
    }

    onClick = async (e) => {
        const headerElem = e.target.closest("#cako-site-nav-link");
        if (headerElem) {
            e.preventDefault();

            // Shows touch feedback on mobile.
            CakoApp.siteNavLink.focus({ focusVisible: false });
            setTimeout(() => {
                CakoApp.siteNavLink.blur()
            }, 200);

            await this.navigateToIndex();

            history.pushState(this.state, "", "/");
        }

        const postLinkElem = e.target.closest(".cako-post-link");
        if (postLinkElem) {
            e.preventDefault();

            const id = Html.getIdForPostLink(postLinkElem);

            await this.navigateToPost(id);

            history.pushState(this.state, "", `/${id}/`);
        }

        const featuresLinkElem = e.target.closest("#cako-menu-features-link");
        if (featuresLinkElem) {
            e.preventDefault();

            await this.navigateToFeatures();

            history.pushState(this.state, "", "/features/");
        }
    }

    onKeyDown = async (e) => {
        const modifier = e.altKey || e.ctrlKey ||
            e.metaKey || e.shiftKey;

        if (!Search.searchIsShown && !modifier) {
            if (e.key == "ArrowLeft") {
                if (CakoApp.navLinkLeft) {
                    CakoApp.navLinkLeft.focus({ preventScroll: true });

                    if (this.isLiveSite) {
                        const id = Html.getIdForPostLink(CakoApp.navLinkLeft);
                        await this.navigateToPost(id);
                        history.pushState(this.state, "", `/${id}/`);
                    } else {
                        CakoApp.navLinkLeft.click();
                    }
                }
            }

            if (e.key == "ArrowRight") {
                if (CakoApp.navLinkRight) {
                    CakoApp.navLinkRight.focus({ preventScroll: true });

                    if (this.isLiveSite) {
                        const id = Html.getIdForPostLink(CakoApp.navLinkRight);
                        await this.navigateToPost(id);
                        history.pushState(this.state, "", `/${id}/`);
                    } else {
                        CakoApp.navLinkRight.click();
                    }
                }
            }
        }
    }

    onPopState = async (e) => {
        if (e.state) {
            await this.navigateToState(e.state);
        }
    }

    onSearchState = (shown) => {
        if (shown) {
            this.searchBackgroundState = Object.assign({}, this.state);
            this.navigateToSearch();
        } else {
            if (this.searchBackgroundState) {
                this.navigateToState(this.searchBackgroundState);
                this.state = this.searchBackgroundState;
                this.searchBackgroundState = undefined;
            }
        }
    }

    /** Only capture events on live site, not on static sites from cako cli. */
    async setupEventHandlers() {
        document.addEventListener("keydown", this.onKeyDown);

        try {
            await this.api.hasApi();
            this.isLiveSite = true;
            console.log("Live site initialized.");

            document.addEventListener("click", this.onClick);
            window.addEventListener("popstate", this.onPopState);

            this.search.onSearchState(this.onSearchState);
        } catch {
            this.isLiveSite = false;
            console.log("Static site initialized.");
        }
    }
}

(() => {
    window.CakoApp = new CakoApp();
})();
