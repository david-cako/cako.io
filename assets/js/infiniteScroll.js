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

    postFeed = document.getElementById("cako-post-feed");
    postFeedOuter = document.getElementById("cako-post-feed-outer");
    loadingPostsElem = document.getElementById("loading-posts");

    constructor() {
        this.loadAllPosts();
        this.newPostsInterval = setInterval(this.getAndAppendNewPosts,
            this.newPostsIntervalTime);
    }

    async fetchPosts(count, page) {
        let retries = 0;

        while (retries < this.maxRetries) {
            retries++;

            try {
                let posts = await Api.getPosts(count, page);
                return posts;
            } catch (e) {
                console.log(`Error fetching posts, attempt ${retries}`, e);
                if (retries >= this.maxRetries) {
                    throw e;
                }
            }
        }
    }

    async fetchNextPage() {
        let page;

        if (this.pagination) { // next page populated by previous request
            page = this.pagination.next;
        } else { // otherwise, continue from server-rendered posts
            page = 2;
        }

        let posts = await this.fetchPosts(this.postsPerRequest, page);

        return posts
    }

    appendPostsToFeed(posts, position = "beforeend") {
        const postHtml = posts.map(p => generatePostLinkHTML(p));

        this.postFeed.insertAdjacentHTML(position, postHtml.join("\n"));
    }


    async getAndAppendPosts() {
        this.isUpdatingPosts = true;

        try {
            const posts = await this.fetchNextPage();
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

        const newPosts = [];

        let page = 1;
        let shouldFetchPosts = true;

        // fetch posts until we reach newest shown post on page
        while (shouldFetchPosts) {
            let posts;

            try {
                posts = await this.fetchPosts(10, page);
                page++;
            } catch (e) {
                this.isUpdatingPosts = false;
                throw e;
            }

            for (const p of posts) {
                if (!this.postFeed.querySelector(`[href="/${p.slug}/"]`)) {
                    newPosts.push(p);
                } else {
                    shouldFetchPosts = false;
                    break;
                }
            }
        }

        this.appendPostsToFeed(newPosts, "afterbegin");

        this.isUpdatingPosts = false;
    }

    shouldGetPosts() {
        if (this.isUpdatingPosts) {
            return false;
        }
        if (this.pagination && this.pagination.next === null) {
            // we've already requested posts and no more are available
            return false;
        }

        return true;
    }

    loadAllPosts = async () => {
        while (this.shouldGetPosts()) {
            await this.getAndAppendPosts();
        }
    }

    scrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

(() => {
    window.InfiniteScroll = new InfiniteScroll();
})();
