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

    static indexInner = document.getElementById("index-inner");
    static postInner = document.getElementById("post-inner");
    static navLinkLeft = document.querySelector(".post-nav-link.left");
    static navLinkRight = document.querySelector(".post-nav-link.right");

    constructor() {
        this.menu = new Menu();
        this.search = new Search(Menu);
        this.infiniteScroll = new InfiniteScroll();
        this.api = new Api();

        document.addEventListener("click", this.onClick);
        document.addEventListener("keydown", this.onKeyDown);

        window.addEventListener("popstate", this.onPopState);
    }

    onClick = async (e) => {
        const headerElem = e.target.closest("#cako-site-nav-link");
        if (headerElem) {
            e.preventDefault();
            await this.navigateToIndex();
            history.pushState({ page: "/" }, "", "/");
        }

        const postLinkElem = e.target.closest(".cako-post-link");
        if (postLinkElem) {
            e.preventDefault();

            const postElem = postLinkElem.parentElement;
            const id = postElem.dataset.postId;

            await this.navigateToPost(id);
            history.pushState({ page: id }, "", `/${id}`);
        }

        const featuresLinkElem = e.target.closest("#cako-menu-features-link");
        if (featuresLinkElem) {
            e.preventDefault();

            await this.navigateToFeatures();
            history.pushState({ page: "features" }, "", "/features");
        }
    }

    onKeyDown = async (e) => {
        const modifier = e.altKey || e.ctrlKey ||
            e.metaKey || e.shiftKey;

        if (!Search.searchIsShown && !modifier) {

        }
        if (e.key == "ArrowLeft") {
            CakoApp.navLinkLeft.focus({preventScroll: true});

            window.location = CakoApp.navLinkLeft.href;
        }

        if (e.key == "ArrowRight") {
            CakoApp.navLinkRight.focus({preventScroll: true});

            window.location = CakoApp.navLinkRight.href;
        }
    }

    onPopState = async (e) => {
        switch (e.state.page) {
            case "/":
                await this.navigateToIndex();
                break;
            case "/features":
                await this.navigateToFeatures();
                break;
            default:
                await this.navigateToPost(e.state.page);
                break;
        }
    }

    async navigateToIndex() {
        CakoApp.postInner.style.display = "none";
        CakoApp.postInner.innerHTML = "";
        CakoApp.indexInner.style.display = "block";
    }

    async navigateToPost(id) {
        if (!id) {
            throw new Error("Missing id in call to navigateToPost(id)");
        }

        const post = await this.api.getPost(id);

        CakoApp.postInner.innerHTML = "";

        CakoApp.postInner.append(Html.generatePost(post));
        CakoApp.indexInner.style.display = "none";
        CakoApp.postInner.style.display = "block";
    }

    async navigateToFeatures() {
        const features = await this.api.getFeaturesContent();

        CakoApp.postInner.innerHTML = "";

        CakoApp.postInner.append(features);
        CakoApp.indexInner.style.display = "none";
        CakoApp.postInner.style.display = "block";
    }
}

(() => {
    window.CakoApp = new CakoApp();
})();