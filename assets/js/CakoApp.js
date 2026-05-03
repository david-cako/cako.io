import Menu from "./Menu.js";
import Search from "./Search.js";
import InfiniteScroll from "./InfiniteScroll.js";
import Api from "./Api.js";
import Html from "./Html.js";

const HomePage = "/";
const FeaturesPage = "features";
const SearchPage = "search";
const AllPage = "all";

export default class CakoApp {
    search;
    infiniteScroll;
    /** Current application state. */
    state;
    /** Background state saved to return to after hiding search. */
    searchBackgroundState;
    /** True when accessing hosted site with API available.
     * Otherwise, we are accessing a static archive and should not override events. */
    isLiveSite;
    /** Distance from viewport to load a post when scrolling. */
    loadPostOffset = 500;

    static siteNavLink = document.getElementById("cako-site-nav-link");
    static indexInner = document.getElementById("index-inner");
    static postInner = document.getElementById("post-inner");
    static emailAddress = document.getElementById("email-address");

    get pageIsPost() {
        return this.state.page != HomePage
            && this.state.page != FeaturesPage
            && this.state.page != SearchPage
    }

    static get navLinkLeft() {
        return document.querySelector(".post-nav-link.left");
    }
    static get navLinkRight() {
        return document.querySelector(".post-nav-link.right");
    }

    constructor() {
        window.CakoApp = this;

        Api.initialize();

        Menu.init();
        Menu.onStateChange(this.onMenuStateChange);

        this.search = new Search();

        let page
        if (location.pathname == "/") {
            page = HomePage;
        } else {
            page = location.pathname.replaceAll("/", "");
        }

        this.state = { page: page };
        history.replaceState(this.state, "");

        if (this.state.page == AllPage) {
            this.infiniteScroll = new InfiniteScroll({ noFetch: true });
        } else {
            this.infiniteScroll = new InfiniteScroll();
        }

        console.log(Html.posts);

        this.initialize();
    }

    /** Only capture events on live site, not on static sites from cako cli. */
    async initialize() {
        window.addEventListener("unhandledrejection", this.onUnhandledPromiseRejection);
        document.addEventListener("keydown", this.onKeyDown);

        try {
            await Api.isOpen();
            this.isLiveSite = true;
            console.log("Live site initialized.");

            document.addEventListener("click", this.onClick);
            document.addEventListener("scroll", this.onScroll)
            window.addEventListener("popstate", this.onPopState);

            this.search.onSearchShown(this.onSearchShown);

            if (this.state.page == HomePage) {
                this.getVisiblePosts();
            } else if (this.pageIsPost) {
                this.getPreviousAndNext();
            }
        } catch (e) {
            this.isLiveSite = false;
            console.log("Static site initialized.");
        }
    }

    async navigateToState(state, { push } = { push: false }) {
        if (state.page) {
            // Save scroll position before changing state.
            this.infiniteScroll.saveNavigationScrollPosition(this.state.page);

            switch (state.page) {
                case HomePage:
                    await this.#navigateToIndex();
                    break;
                case FeaturesPage:
                    await this.#navigateToFeatures();
                    break;
                case SearchPage:
                    await this.#navigateToSearch();
                    break;
                default:
                    await this.#navigateToPost(state.page);
                    break;
            }

            if (state.page !== SearchPage) {
                this.hideSearch();
            }

            this.state = state;

            this.infiniteScroll.restoreNavigationScrollPosition(this.state.page);

            if (push) {
                let url;
                if (state.page == HomePage) {
                    url = "/"
                } else {
                    url = `/${state.page}/`
                }
                history.pushState(state, "", url);
            }
        }
    }

    async navigateToPostLink(postLink) {
        postLink.focus({ preventScroll: true });

        if (this.isLiveSite) {
            const slug = Html.getSlugForPostLink(postLink);
            await this.navigateToState({ page: slug }, { push: true });
        } else {
            postLink.click();
        }
    }

    hideSearch() {
        this.searchBackgroundState = undefined;

        if (Search.shown) {
            this.search.hideSearch();
        }

        if (Menu.shown) {
            Menu.close();
        }

        document.body.classList.remove("search-shown");
    }

    async popSearchBackgroundState() {
        if (this.searchBackgroundState) {
            return this.navigateToState(this.searchBackgroundState);
        }
    }

    getVisiblePosts() {
        for (const p of Html.posts) {
            if (Html.elementIsVisible(p, { offset: this.loadPostOffset })) {
                const slug = Html.getSlugForPostLink(p);
                Api.getPost(slug);
            }
        }
    }

    getPreviousAndNext() {
        if (!this.pageIsPost) {
            throw new Error("getPreviousAndNext() called with no post shown.");
        }

        Api.getPrevious(this.state.page, 10);
        Api.getNext(this.state.page, 10);
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

            await this.navigateToState({ page: HomePage }, { push: true });
            return;
        }

        const postLinkElem = e.target.closest(".cako-post-link");
        if (postLinkElem) {
            e.preventDefault();

            await this.navigateToPostLink(postLinkElem);
            return;
        }

        const menuLightsElem = e.target.closest("#cako-menu-lights");
        if (menuLightsElem) {
            e.preventDefault();
            window.Lights.toggle();
            Menu.close();
        }

        const featuresLinkElem = e.target.closest("#cako-menu-features-link");
        if (featuresLinkElem) {
            e.preventDefault();

            await this.navigateToState({ page: FeaturesPage }, { push: true });
            return;
        }

        if (Menu.shown) {
            if (e.target !== Menu.menuIcon &&
                e.target !== Menu.menuInner &&
                (!Search.searchInner.contains(e.target)) &&
                !Menu.menuInner.contains(e.target)) {
                Menu.close();
            }
        }
    }

    onScroll = (e) => {
        this.getVisiblePosts();
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

        // escape closes search and menu
        if (e.key == "Escape") {
            if (this.searchBackgroundState) {
                e.preventDefault();
                await this.popSearchBackgroundState();
            }
            if (Menu.shown) {
                e.preventDefault();
                Menu.close()
            }

            return;
        }

        // arrow keys navigate between posts when search is not active
        if (!Search.shown && !modifier) {
            if (e.key == "ArrowLeft") {
                e.preventDefault();
                if (CakoApp.navLinkLeft) {
                    await this.navigateToPostLink(CakoApp.navLinkLeft);
                }
            } else if (e.key == "ArrowRight") {
                e.preventDefault();
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
        this.navigateToState({ page: SearchPage });
    }

    onMenuStateChange = (shown) => {
        if (this.state.page == SearchPage && shown == false) {
            this.popSearchBackgroundState();
        }
    }

    onUnhandledPromiseRejection = (e) => {
        console.error("Unhandled Promise Rejection: " + e.reason.stack);
    }

    async #navigateToIndex() {
        document.body.classList = "home-template";

        Html.setPostContent();
        Html.setCopyrightDate();

        document.title = "cako.io";

        this.getVisiblePosts();
    }

    async #navigateToPost(slug) {
        if (!slug) {
            throw new Error("Missing slug in call to #navigateToPost(slug)");
        }

        const post = await Api.getPost(slug);

        document.body.classList = "post-template";

        Html.setPostContent(post);
        Html.setCopyrightDate(post);
        Html.setPostNav(post);

        document.title = post.title;

        window.scrollTo({ top: 0 });
        window.Header.resetAnimation();

        this.getPreviousAndNext();
    }

    async #navigateToFeatures() {
        const features = await Api.features.promise;

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
