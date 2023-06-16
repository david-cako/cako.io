import { Api } from "./api.js";
import { generatePostLinkHTML } from "./html.js";

/** Service for managing and restoring scroll position on cako.io index */
export default class InfiniteScroll {
    /** Current index scroll position managed by InfiniteScroll. */
    contentScrollPosition = 0;

    /** Increments on every scroll event after InfiniteScroll initialization. */
    scrollEvents = 0;

    /** JS interval ID for new posts fetcher */
    newPostsInterval;
    /** Fetcher interval.  New posts are fetched every 30 seconds. */
    newPostsIntervalTime = 1000 * 30;

    /** Ghost API pagination object, populated with each request for posts */
    pagination;

    /** True while getAndAppendPosts or getAndAppendNewPosts is called. */
    isUpdatingPosts = false;

    /** Posts per page in each call to getAndAppendPosts. */
    postsPerRequest = 100;
    /** Retry count for fetchPosts. */
    maxRetries = 10;

    /** Unix timestamp of last save of contentScrollPosition to localStorage. */
    lastScrollPositionTime;
    /** Throttle for saving contentScrollPosition to localStorage. */
    scrollPositionThrottle = 100;

    /** Getter for saved contentScrollPosition from localStorage. */
    get savedScrollPosition() {
        let pos = localStorage.getItem("contentScrollPosition")

        if (pos !== null && Number(pos) !== NaN) {
            return Number(pos);
        } else {
            return null;
        }
    }

    /** Getter for saved contentScrollPositionTime from localStorage. */
    get savedScrollPositionTime() {
        let time = localStorage.getItem("contentScrollPositionTime")

        if (time !== null && Number(time) !== NaN) {
            return Number(time);
        } else {
            return null;
        }
    }

    /** TTL for saved contentScrollPosition in localStorage. */
    restoreScrollPosTTL = 1000 * 60 * 30;

    /** Returns true if saved contentScrollPosition in localStorage is
     * fresher than restoreScrollPosTTL. */
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

    /** Starts event handlers and may restore scroll position. */
    initialize = async () => {
        history.scrollRestoration = "manual";

        document.addEventListener("scroll", this.maybeSaveScrollPosition);
        document.addEventListener("click", this.maybeSaveScrollPosition);

        let savedPos = this.savedScrollPosition;

        let shouldRestoreScrollPosition = savedPos !== null &&
            this.savedScrollPosIsFresh && !window.searchIsShown;

        // restore scroll position on persisted back navigation
        window.addEventListener("pageshow", (e) => {
            if (e.persisted && shouldRestoreScrollPosition) {
                this.restoreScrollPosition();
            }
        });

        // restore scroll position after sufficient posts are fetched
        while (this.shouldGetPosts()) {
            const userHasScrolled = this.scrollEvents > 1;

            if (shouldRestoreScrollPosition && !userHasScrolled &&
                savedPos <= document.body.clientHeight - window.innerHeight) {
                this.restoreScrollPosition();
                shouldRestoreScrollPosition = false;
            }

            await this.getAndAppendPosts();
        }

        this.newPostsInterval = setInterval(this.getAndAppendNewPosts,
            this.newPostsIntervalTime);
    }

    /** Main post fetcher with retry logic. */
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

    /** Fetch next page given current pagination and InfiniteScroll.postsPerRequest */
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

    /** Append posts to index using HTML helpers from html.js */
    appendPostsToFeed(posts, position = "beforeend") {
        const postHtml = posts.map(p => generatePostLinkHTML(p));

        this.postFeed.insertAdjacentHTML(position, postHtml.join("\n"));
    }

    /** Fetch and insert post HTML for next page. */
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

    /** Fetch and insert new posts if available. */
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

    /** Returns true if more posts are available from Ghost pagination and
     * we are not currently updating posts. */
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

    /** Saves both contentScrollPosition and contentScrolPositionTime in localStorage. */
    saveScrollPosition() {
        localStorage.setItem("contentScrollPosition", this.contentScrollPosition);

        this.lastScrollPositionTime = Date.now();
        localStorage.setItem("contentScrollPositionTime", this.lastScrollPositionTime);
    }

    /** Sets page scroll position from saved value in localStorage. */
    restoreScrollPosition() {
        const pos = this.savedScrollPosition;

        if (pos !== null && Number(pos) !== NaN) {
            window.scroll(0, Number(pos));
        }
    }

    /** Saves scroll position to localStorage when user scrolls, search is not shown,
     * and InfiniteScroll.scrollPositionThrottle has elapsed since last save. */
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

    /** Jumps to bottom of post index.  This was too many buttons. */
    scrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

(() => {
    window.InfiniteScroll = new InfiniteScroll();
})();
