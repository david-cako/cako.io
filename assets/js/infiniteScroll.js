import { Api } from "./api.js";
import { generatePostLinkHTML } from "./html.js";

export default class InfiniteScroll {
    // Ghost API pagination, populated with each request for posts
    pagination;
    newPostsInterval;
    newPostsIntervalTime = 1000 * 30;
    isUpdatingPosts = false;

    postsPerRequest = 100;
    maxRetries = 10;

    contentScrollPosition = 0;
    lastScrollPositionTime;
    scrollPositionThrottle = 100;
    scrollEvents = 0;

    get savedScrollPosition() {
        let pos = localStorage.getItem("contentScrollPosition")

        if (pos !== null && Number(pos) !== NaN) {
            return Number(pos);
        } else {
            return null;
        }
    }

    get savedScrollPositionTime() {
        let time = localStorage.getItem("contentScrollPositionTime")

        if (time !== null && Number(time) !== NaN) {
            return Number(time);
        } else {
            return null;
        }
    }

    restoreScrollPosTTL = 1000 * 60 * 30;

    get savedScrollPosIsFresh() {
        let savedPosTime = this.savedScrollPositionTime;

        if (savedPosTime === null) {
            return false;
        }

        return Date.now() - savedPosTime <= this.restoreScrollPosTTL;
    }

    postFeed = document.getElementById("cako-post-feed");
    postFeedOuter = document.getElementById("cako-post-feed-outer");
    loadingPostsElem = document.getElementById("loading-posts");

    constructor() {
        this.initialize();
    }

    initialize = async () => {
        history.scrollRestoration = "manual";

        document.addEventListener("scroll", this.maybeSaveScrollPosition);
        document.addEventListener("click", this.maybeSaveScrollPosition);

        let savedPos = this.savedScrollPosition;
        let shouldRestoreScrollPosition = savedPos !== null && !window.searchIsShown;

        // restore scroll position on iOS back navigation
        window.addEventListener("pageshow", (e) => {
            if (e.persisted &&
                this.savedScrollPosIsFresh && shouldRestoreScrollPosition) {
                this.restoreScrollPosition();
            }
        });

        while (this.shouldGetPosts()) {
            if (shouldRestoreScrollPosition &&
                this.scrollEvents <= 1 &&
                this.savedScrollPosIsFresh &&
                savedPos <= document.body.clientHeight - window.innerHeight) {
                this.restoreScrollPosition();
                shouldRestoreScrollPosition = false;
            }

            await this.getAndAppendPosts();
        }

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

    saveScrollPosition() {
        localStorage.setItem("contentScrollPosition", this.contentScrollPosition);

        this.lastScrollPositionTime = Date.now();
        localStorage.setItem("contentScrollPositionTime", this.lastScrollPositionTime);
    }

    restoreScrollPosition() {
        const pos = this.savedScrollPosition;

        if (pos !== null && Number(pos) !== NaN) {
            window.scroll(0, Number(pos));
        }
    }

    maybeSaveScrollPosition = () => {
        this.scrollEvents++;

        if (this.scrollEvents <= 1) {
            return;
        }

        if (!window.searchIsShown) {
            this.contentScrollPosition = window.scrollY;

            let time = Date.now();
            if (this.contentScrollPosition === 0 ||
                !this.lastScrollPositionTime ||
                time - this.lastScrollPositionTime >= this.scrollPositionThrottle) {
                this.saveScrollPosition();
            }
        }
    }

    scrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

(() => {
    window.InfiniteScroll = new InfiniteScroll();
})();
