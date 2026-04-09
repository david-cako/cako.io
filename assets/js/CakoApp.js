import Menu from "./Menu.js";
import Search from "./Search.js";
import InfiniteScroll from "./InfiniteScroll.js";
import Api from "./Api.js";
import Html from "./Html.js";

export default class CakoApp {
    search;
    infiniteScroll;
    api;

    /** Current application state. */
    state;
    /** Background state saved to return to after hiding search. */
    searchBackgroundState;
    /** True when accessing hosted site with API available.
     * Otherwise, we are accessing a static archive and should not override events. */
    isLiveSite;

    static siteNavLink = document.getElementById("cako-site-nav-link");
    static indexInner = document.getElementById("index-inner");
    static postInner = document.getElementById("post-inner");
    static searchInner = document.getElementById("search-inner");
    static emailAddress = document.getElementById("email-address");

    static get navLinkLeft() {
        return document.querySelector(".post-nav-link.left");
    }
    static get navLinkRight() {
        return document.querySelector(".post-nav-link.right");
    }

    constructor() {
        window.CakoApp = this;

        Menu.init();
        Menu.onStateChange(this.onMenuStateChange);

        this.search = new Search();
        this.api = new Api();

        let page
        if (location.pathname == "/") {
            page = "/"
        } else {
            page = location.pathname.replaceAll("/", "");
        }

        this.state = { page: page };
        history.replaceState(this.state, "");

        if (this.state.page == "all") {
            this.infiniteScroll = new InfiniteScroll({ noFetch: true });
        } else {
            this.infiniteScroll = new InfiniteScroll();
        }

        this.setupEventHandlers();
    }

    async navigateToState(state) {
        if (state.page) {
            // Save scroll position before changing state.
            this.infiniteScroll.saveNavigationScrollPosition(this.state.page);

            switch (state.page) {
                case "/":
                    await this.#navigateToIndex();
                    break;
                case "features":
                    await this.#navigateToFeatures();
                    break;
                case "search":
                    await this.#navigateToSearch();
                    break;
                default:
                    await this.#navigateToPost(state.page);
                    break;
            }

            if (state.page !== "search") {
                this.hideSearch();
            }

            this.state = state;

            this.infiniteScroll.restoreNavigationScrollPosition(this.state.page);
        }
    }

    async navigateToPostLink(postLink) {
        postLink.focus({ preventScroll: true });

        if (this.isLiveSite) {
            const id = Html.getIdForPostLink(postLink);
            await this.navigateToState({ page: id });
            history.pushState(this.state, "", `/${id}/`);
        } else {
            postLink.click();
        }
    }

    hideSearch() {
        this.searchBackgroundState = undefined;

        if (Menu.shown) {
            Menu.close();
        }
        if (Search.shown) {
            this.search.hideSearch();
        }

        document.body.classList.remove("search-shown");
    }

    popSearchBackgroundState() {
        if (this.searchBackgroundState) {
            this.navigateToState(this.searchBackgroundState);
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

            await this.navigateToState({ page: "/" });

            history.pushState(this.state, "", "/");
            return;
        }

        const postLinkElem = e.target.closest(".cako-post-link");
        if (postLinkElem) {
            e.preventDefault();

            await this.navigateToPostLink(postLinkElem);
            return;
        }

        const featuresLinkElem = e.target.closest("#cako-menu-features-link");
        if (featuresLinkElem) {
            e.preventDefault();

            await this.navigateToState({ page: "features" });

            history.pushState(this.state, "", "/features/");
            return;
        }
    }

    onKeyDown = async (e) => {
        const modifier = e.altKey || e.ctrlKey ||
            e.metaKey || e.shiftKey;

        // cmd/ctrl + shift + f to open search
        if (e.key.toLowerCase() == "f" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
            e.preventDefault();

            Menu.toggle();

            if (Menu.shown) {
                Search.focus();
            }

            return;
        }

        // escape closes menu
        if (e.key == "Escape") {
            this.popSearchBackgroundState();

            return;
        }

        // arrow keys navigate between posts when search is not active
        if (!Search.shown && !modifier) {
            if (e.key == "ArrowLeft") {
                if (CakoApp.navLinkLeft) {
                    await this.navigateToPostLink(CakoApp.navLinkLeft);
                }
            } else if (e.key == "ArrowRight") {
                if (CakoApp.navLinkRight) {
                    await this.navigateToPostLink(CakoApp.navLinkRight)
                }
            }

            return;
        }
    }

    onPopState = async (e) => {
        if (e.state) {
            await this.navigateToState(e.state);
        }
    }

    onSearchShown = () => {
        this.searchBackgroundState = Object.assign({}, this.state);
        this.navigateToState({ page: "search" });
    }

    onMenuStateChange = (shown) => {
        if (this.state.page == "search" && shown == false) {
            this.popSearchBackgroundState();
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

            this.search.onSearchShown(this.onSearchShown);
        } catch {
            this.isLiveSite = false;
            console.log("Static site initialized.");
        }
    }

    async #navigateToIndex() {
        document.body.classList = "home-template";

        Html.setPostContent();
        Html.setCopyrightDate();

        document.title = "cako.io";
    }

    async #navigateToPost(id) {
        if (!id) {
            throw new Error("Missing id in call to #navigateToPost(id)");
        }

        const post = await this.api.getPost(id);

        document.body.classList = "post-template";

        Html.setPostContent(post);
        Html.setCopyrightDate(post);
        Html.setPostNav(post);

        document.title = post.title;

        window.scrollTo({ top: 0 });
        window.Header.resetAnimation();
    }

    async #navigateToFeatures() {
        const features = await Api.features;

        document.body.classList = "page-template";

        Html.setPostContent(features);
        Html.setCopyrightDate(features);

        document.title = "Features";
    }

    async #navigateToSearch() {
        document.body.classList.add("search-shown");
    }
}

(() => {
    new CakoApp();
})();
