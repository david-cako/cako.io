import Menu from "./Menu";
import InfiniteScroll from "./InfiniteScroll";
import PostLoadingSpinner from "./PostLoadingSpinner";
import Api from "./Api";
import Html from "./html";

export default class CakoApp {
    menu;
    search;
    infiniteScroll;
    postLoadingSpinner
    api;

    static indexInner = document.getElementById("index-inner");
    static postInner = document.getElementById("post-inner");

    constructor() {
        this.menu = new Menu();
        this.search = new Search(Menu);
        this.infiniteScroll = new InfiniteScroll();
        this.postLoadingSpinner = new PostLoadingSpinner();
        this.api = new Api();

        document.addEventListener("click", this.onClick);
    }

    onClick = async (e) => {
        const headerElem = e.closest("#cako-site-nav-link");
        if (headerElem) {
            this.navigateToIndex();
        }

        const postLinkElem = e.closest(".cako-post");
        if (postLinkElem) {
            const id = postLinkElem.dataset.postId;

            await this.navigateToPost(id);
        }

        const featuresLinkElem = e.closest("#cako-menu-features-link");
        if (postLinkElem) {
            await this.navigateToFeatures();
        }
    }

    async navigateToIndex() {
        CakoApp.indexInner.style.display = "block";
        CakoApp.postInner.style.display = "none";
        CakoApp.postInner.innerHTML = "";
    }

    async navigateToPost(id) {
        const post = await this.api.getPost(id);

        CakoApp.postInner.innerHTML = Html.generatePostHtml(post);
        CakoApp.indexInner.style.display = "none";
        CakoApp.postInner.style.display = "block";
    }

    async navigateToFeatures() {
        const features = await this.api.getFeaturesContent();

        CakoApp.postInner.innerHTML = features;
        CakoApp.indexInner.style.display = "none";
        CakoApp.postInner.style.display = "block";
    }
}

(() => {
    window.CakoApp = new CakoApp();
});