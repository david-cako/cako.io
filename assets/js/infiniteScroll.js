import { Api } from "./api.js";
import { generatePostLinkHTML } from "./html.js";


export default class InfiniteScroll {
    // Ghost API pagination, populated with each request for posts
    pagination;
    newPostsInterval;
    newPostsIntervalTime = 30000;
    isUpdatingPosts = false;

    postsPerRequest = 100;
    maxRetries = 10;
    shouldLoadAllPosts = false;

    postFeed = document.getElementById("cako-post-feed");
    postFeedOuter = document.getElementById("cako-post-feed-outer");
    loadingPostsElem = document.getElementById("loading-posts");

    get loadPostsOffset() { return window.innerHeight * 3; }
    get postElems() { return document.querySelectorAll("#cako-post-feed .cako-post"); }

    constructor() {
        document.addEventListener("scroll", this.onScroll);
        this.newPostsInterval = setInterval(this.getAndAppendNewPosts,
            this.newPostsIntervalTime);
    }

    async fetchPosts() {
        let posts;
        let retries = 0;

        let page;
        if (this.pagination) { // next page populated by previous request
            page = this.pagination.next;
        } else { // otherwise, continue from server-rendered posts
            page = 2;
        }

        while (posts === undefined && retries < this.maxRetries) {
            retries++;

            try {
                posts = await Api.getPosts(this.postsPerRequest, page);
            } catch (e) {
                console.log(`Error fetching posts, attempt ${retries + 1}`, e);
                if (retries + 1 >= this.maxRetries) {
                    throw e;
                }
            }
        }

        return posts;
    }

    appendPostsToFeed(posts, position = "beforeend") {
        const postHtml = posts.map(p => generatePostLinkHTML(p));

        this.postFeed.insertAdjacentHTML(position, postHtml.join("\n"));
    }


    async getAndAppendPosts() {
        this.isUpdatingPosts = true;

        try {
            const posts = await this.fetchPosts();
            this.pagination = posts.meta.pagination;

            this.appendPostsToFeed(posts);
        } catch (e) {
            this.isUpdatingPosts = false;
            throw e;
        }

        this.isUpdatingPosts = false;
    }


    getAndAppendNewPosts = async () => {
        this.isUpdatingPosts = true;

        let posts;

        try {
            posts = await Api.getPosts(10, 0);
        } catch (e) {
            this.isUpdatingPosts = false;
            throw e;
        }

        const newPosts = [];

        for (const p of posts) {
            if (!this.postFeed.querySelector(`[href="/${p.slug}/"]`)) {
                newPosts.push(p);
            }
        }

        this.appendPostsToFeed(newPosts, "afterbegin");

        this.isUpdatingPosts = false;
    }

    shouldGetPosts() {
        if (this.postFeedOuter.style.display === "none") {
            // search is currently active
            return false;
        }
        if (this.isUpdatingPosts) {
            return false;
        }
        if (this.pagination && this.pagination.next === null) {
            // we've already requested posts and no more are available
            return false;
        }
        if (this.shouldLoadAllPosts) {
            return true;
        }

        // check scroll position
        const postElems = this.postElems;
        if (postElems.length < 1) {
            return true;
        }

        const lastPost = postElems[postElems.length - 1];

        return lastPost?.getBoundingClientRect().top < this.loadPostsOffset;
    }

    loadAllPosts = async () => {
        this.shouldLoadAllPosts = true;
        
        while (this.shouldGetPosts()) {
            await this.getAndAppendPosts();
            this.scrollToBottom();
        }
    }

    scrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }

    onScroll = async () => {
        while (this.shouldGetPosts()) {
            this.getAndAppendPosts();
        }
    }

    removeListener() {
        document.removeEventListener("scroll", this.onScroll);
    }
}

(() => {
    window.InfiniteScroll = new InfiniteScroll();
})();
