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
        this.infiniteScroll = new InfiniteScroll();
        this.api = new Api();

        this.state = { page: location.pathname };

        document.addEventListener("click", this.onClick);
        document.addEventListener("keydown", this.onKeyDown);

        window.addEventListener("popstate", this.onPopState);

        this.search.onSearchState(this.onSearchState);
    }

    async navigateToIndex() {
        CakoApp.postInner.style.display = "none";
        CakoApp.postArticle.innerHTML = "";
        CakoApp.indexInner.style.display = "block";
    }

    async navigateToPost(id) {
        if (!id) {
            throw new Error("Missing id in call to navigateToPost(id)");
        }

        const post = await this.api.getPost(id);
        const generated = Html.generatePost(post);

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
        CakoApp.emailAddress.style.display = "inline-block";
        CakoApp.postNavInner.style.display = "flex";
        CakoApp.postInner.style.display = "block";
    }

    async navigateToFeatures() {
        const features = await this.api.getFeaturesContent();

        CakoApp.postArticle.innerHTML = "";
        CakoApp.postArticle.append(features);

        CakoApp.indexInner.style.display = "none";
        CakoApp.emailAddress.style.display = "none";
        CakoApp.postNavInner.style.display = "none";
        CakoApp.postInner.style.display = "block";
    }

    async navigateToSearch() {
        CakoApp.indexInner.style.display = "none";
        CakoApp.emailAddress.style.display = "none";
        CakoApp.postNavInner.style.display = "none";
        CakoApp.postInner.style.display = "none";
        CakoApp.searchInner.style.display = "block";
    }

    onClick = async (e) => {
        const headerElem = e.target.closest("#cako-site-nav-link");
        if (headerElem) {
            e.preventDefault();
            await this.navigateToIndex();

            this.state = { page: "/" };
            history.pushState(this.state, "", "/");
        }

        const postLinkElem = e.target.closest(".cako-post-link");
        if (postLinkElem) {
            e.preventDefault();

            const postElem = postLinkElem.parentElement;
            const id = postElem.dataset.postId;

            await this.navigateToPost(id);

            this.state = { page: `/${id}/` };
            history.pushState(this.state, "", `/${id}/`);
        }

        const featuresLinkElem = e.target.closest("#cako-menu-features-link");
        if (featuresLinkElem) {
            e.preventDefault();

            await this.navigateToFeatures();
            this.state = { page: "/features/" };
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
                }

                this.navigateToPost(CakoApp.navLinkLeft.dataset.postId);;
            }

            if (e.key == "ArrowRight") {
                if (CakoApp.navLinkRight) {
                    CakoApp.navLinkRight.focus({ preventScroll: true });
                }

                this.navigateToPost(CakoApp.navLinkRight.dataset.postId);;
            }
        }
    }

    async navigateToState(state) {
        switch (state.page) {
            case "/":
                await this.navigateToIndex();
                break;
            case "/features/":
                await this.navigateToFeatures();
                break;
            default:
                await this.navigateToPost(state.page);
                break;
        }
    }

    onPopState = async (e) => {
        this.navigateToState(e.state)
    }

    onSearchState = (shown) => {
        if (shown) {
            this.navigateToSearch();
            this.searchBackgroundState = this.state;
            this.state = { page: "search" };
        } else {
            this.navigateToState(this.searchBackgroundState);
            this.state = this.searchBackgroundState;
            this.searchBackgroundState = undefined;
        }
    }
}

(() => {
    window.CakoApp = new CakoApp();
})();