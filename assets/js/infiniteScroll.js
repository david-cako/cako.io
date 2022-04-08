import { Api } from "./api.js";
import { generatePostLinkHTML } from "./html.js";


export default class InfiniteScroll {
    // Ghost API pagination, populated with each request for posts
    pagination;
    isUpdatingPosts = false;

    postsPerRequest = 100;
    maxRetries = 10;
    loadAllPosts = localStorage.getItem("loadAllPosts") === true;

    postFeed = document.getElementById("cako-post-feed");
    loadingPostsElem = document.getElementById("loading-posts");

    get loadPostsOffset() { return window.innerHeight * 1.2; }
    get postElems() { return document.querySelectorAll("#cako-post-feed .cako-post"); }

    constructor() {
        document.addEventListener("scroll", this.onScroll);
    }

    shouldGetPosts() {
        if (this.isUpdatingPosts) {
            return false;
        }

        if (this.pagination && this.pagination.next === null) {
            // we've already requested posts and no more are available
            return false;
        }
        if (this.loadAllPosts && this.pagination) {
            // continue loading all posts
            return true;
        }

        // check scroll position
        const postElems = this.postElems;
        const lastPost = postElems[postElems.length - 1];

        if (!lastPost) {
            return true;
        }

        return lastPost?.getBoundingClientRect().top < this.loadPostsOffset;
    }

    async getPosts() {
        let posts;
        let retries = 0;

        let page;
        if (this.pagination) { // next page populated by previous request
            page = this.pagination.next;
        } else { // otherwise, continue from server-rendered posts
            page = 2;
        }

        while (posts === undefined && retries < this.maxRetries) {
            try {
                posts = await Api.getPosts(this.postsPerRequest, page);
            } catch (e) {
                console.log(`Error fetching posts, attempt ${retries + 1}`, e);
                if (retries >= this.maxRetries) {
                    throw e;
                }
            }

            retries++;
        }

        return posts;
    }

    appendPostsToFeed(posts) {
        const postHtml = posts.map(p => generatePostLinkHTML(p));

        this.postFeed.insertAdjacentHTML("beforeend", postHtml.join("\n"));
    }

    showLoadingIndicator() {
        this.loadingPostsElem.style.display = "block";
    }

    hideLoadingIndicator() {
        this.loadingPostsElem.style.display = "none";
    }

    onScroll = async () => {
        while (this.shouldGetPosts()) {
            this.isUpdatingPosts = true;
            this.showLoadingIndicator();

            try {
                const posts = await this.getPosts();
                this.pagination = posts.meta.pagination;

                this.appendPostsToFeed(posts);
            } catch (e) {
                this.hideLoadingIndicator();
                this.isUpdatingPosts = false;
                throw e;
            }

            this.hideLoadingIndicator();
            this.isUpdatingPosts = false;
        }
    }

    toggleLoadAllPosts = () => {
        if (this.loadAllPosts) {
            this.loadAllPosts = false;
        } else {
            this.loadAllPosts = true;
        }

        localStorage.setItem("loadAllPosts", this.loadAllPosts);

        return this.loadAllPosts;
    }

    removeListener() {
        document.removeEventListener("scroll", this.onScroll);
    }
}

(() => {
    new InfiniteScroll();
})();
