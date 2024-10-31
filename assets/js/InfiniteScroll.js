import { Api } from "./api.js";
import { generatePostLinkHTML } from "./html.js";

/** Service for managing and restoring scroll position on cako.io index */
export default class InfiniteScroll {
    /** Current index scroll position managed by InfiniteScroll. */
    contentScrollPosition = 0;

    /** Increments on every scroll event after InfiniteScroll initialization.
     * Resets on pageShow event. */
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

    /** TTL for saved contentScrollPosition in localStorage. */
    restoreScrollPosTTL = 1000 * 60 * 30;

    postFeed = document.getElementById("cako-post-feed");
    postFeedOuter = document.getElementById("cako-post-feed-outer");
    loadingPostsElem = document.getElementById("loading-posts");

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

    /** Returns true if saved contentScrollPosition in localStorage is
     * fresher than restoreScrollPosTTL. */
    get savedScrollPosIsFresh() {
        let savedPosTime = this.savedScrollPositionTime;

        if (savedPosTime === null) {
            return false;
        }

        return Date.now() - savedPosTime <= this.restoreScrollPosTTL;
    }

    constructor() {
        this.initialize();
    }

    /** Starts event handlers and may restore scroll position. */
    initialize = async () => {
        history.scrollRestoration = "manual";

        document.addEventListener("scroll", this.maybeSaveScrollPosition);
        document.addEventListener("click", this.maybeSaveScrollPosition);

        let savedPos = this.savedScrollPosition;
        const savedPosHasLoaded = this.getAndAppendPosts({ resolveAt: savedPos });

        window.addEventListener("pageshow", async () => {
            this.scrollEvents = 0;

            await savedPosHasLoaded;

            const userHasScrolled = this.scrollEvents > 1;

            const shouldRestoreScrollPosition =
                savedPos !== null && this.savedScrollPosIsFresh &&
                !window.searchIsShown && !userHasScrolled;

            if (shouldRestoreScrollPosition) {
                this.restoreScrollPosition();
            }
        });

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

    /** Fetch and insert all posts, resolving on completion or 
     * when optional resolveAt position has loaded. */
    getAndAppendPosts({ resolveAt }) {
        let isResolved = false;

        return new Promise(async (resolve, reject) => {
            this.isUpdatingPosts = true;
            this.loadingPostsElem.style.display = "block";

            while (!this.pagination || this.pagination.next !== null) {
                try {
                    const posts = await this.fetchNextPage();
                    this.pagination = posts.meta.pagination;

                    this.appendPostsToFeed(posts);
                } catch (e) {
                    this.isUpdatingPosts = false;
                    this.loadingPostsElem.innerText = "Could not finish loading posts.  Try refreshing cako.io.";
                    this.loadingPostsElem.className = "error";

                    reject(e);
                    return;
                }

                if (!isResolved && resolveAt !== undefined &&
                    resolveAt <= document.body.clientHeight - window.innerHeight) {
                    // resolves and continues execution to finish loading posts.
                    resolve();
                    isResolved = true;
                }
            }

            this.loadingPostsElem.style.display = "none";
            this.isUpdatingPosts = false;

            resolve();
            isResolved = true;
            return;
        })
    }

    /** Fetch and insert new posts if available. */
    getAndAppendNewPosts = async () => {
        this.isUpdatingPosts = true;

        const newPosts = [];

        let page = 1;
        let shouldGetNewPosts = true;

        // fetch posts until we reach newest shown post on page
        while (shouldGetNewPosts) {
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
                    shouldGetNewPosts = false;
                    break;
                }
            }
        }

        this.appendPostsToFeed(newPosts, "afterbegin");

        this.isUpdatingPosts = false;
    }

    /** Saves both contentScrollPosition and contentScrollPositionTime in localStorage. */
    saveScrollPosition() {
        localStorage.setItem("contentScrollPosition", this.contentScrollPosition);

        this.lastScrollPositionTime = Date.now();
        localStorage.setItem("contentScrollPositionTime", this.lastScrollPositionTime);
    }

    /** Sets page scroll position from saved value in localStorage. */
    restoreScrollPosition() {
        const pos = this.savedScrollPosition;

        if (pos !== null) {
            window.scroll(0, pos);
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
