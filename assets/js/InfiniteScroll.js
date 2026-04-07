import Api from "./Api.js";
import Html from "./Html.js";

/** Service for managing and restoring scroll position on cako.io index */
export default class InfiniteScroll {
    api = new Api({ page: 2 });

    /** Current index scroll position managed by InfiniteScroll. */
    contentScrollPosition = 0;
    /** Increments on every scroll event after InfiniteScroll initialization.
     * Resets on pageShow event. */
    scrollEvents = 0;
    /** JS interval ID for new posts fetcher */
    newPostsInterval;
    /** Fetcher interval.  New posts are fetched every 30 seconds. */
    newPostsIntervalTime = 1000 * 30;
    /** True while getAndAppendPosts or getAndAppendNewPosts is called. */
    isUpdatingPosts = false;
    /** True until no more posts are returned from API. */
    hasMorePosts;
    /** When initialized with noFetch, no posts will be dynamically loaded. */
    noFetch;

    /** Promise that resolves once posts have loaded up to saved position. */
    savedPosHasLoaded;
    /** Unix timestamp of last save of contentScrollPosition to localStorage. */
    lastScrollPositionTime;
    /** Throttle for saving contentScrollPosition to localStorage. */
    scrollPositionThrottle = 100;
    /** TTL for saved contentScrollPosition in localStorage. */
    restoreScrollPosTTL = 1000 * 60 * 30;

    loadingPostsElem = document.getElementById("loading-posts");

    /** Getter for saved initialScrollPosition from localStorage. */
    get initialScrollPosition() {
        let pos = InfiniteScroll.initialScrollPosition;

        if (pos !== null && Number(pos) !== NaN) {
            return Number(pos);
        } else {
            return null;
        }
    }

    /** Getter for saved initialScrollPositionTime from localStorage. */
    get initialScrollPositionTime() {
        let time = InfiniteScroll.initialScrollPositionTime;

        if (time !== null && Number(time) !== NaN) {
            return Number(time);
        } else {
            return null;
        }
    }

    /** Returns true if saved initialScrollPosition in localStorage is
     * fresher than restoreScrollPosTTL. */
    get initialScrollPosIsFresh() {
        let savedPosTime = this.initialScrollPositionTime;

        if (savedPosTime === null) {
            return false;
        }

        return Date.now() - savedPosTime <= this.restoreScrollPosTTL;
    }

    static get initialScrollPosition() {
        return localStorage.getItem("initialScrollPosition");
    }

    static set initialScrollPosition(value) {
        return localStorage.setItem("initialScrollPosition", value);
    }

    static get initialScrollPositionTime() {
        return localStorage.getItem("initialScrollPositionTime")
    }

    static set initialScrollPositionTime(value) {
        return localStorage.setItem("initialScrollPositionTime", value)
    }

    constructor({ noFetch } = {}) {
        this.noFetch = noFetch;
        this.initialize();
    }

    /** Starts event handlers and may restore scroll position. */
    initialize = async () => {
        history.scrollRestoration = "manual";

        document.addEventListener("scroll", this.maybeSaveInitialScrollPosition);
        document.addEventListener("click", this.maybeSaveInitialScrollPosition);
        window.addEventListener("pageshow", this.loadScrollPosition);

        if (!this.noFetch) {
            this.savedPosHasLoaded = this.getAndAppendPosts({ resolveAt: this.initialScrollPosition });

            this.newPostsInterval = setInterval(this.getAndAppendNewPosts,
                this.newPostsIntervalTime);
        }
    }



    /** Fetch and insert all posts, resolving on completion or 
     * when optional resolveAt position has loaded. */
    getAndAppendPosts({ resolveAt }) {
        let isResolved = false;

        return new Promise(async (resolve, reject) => {
            this.isUpdatingPosts = true;
            this.hasMorePosts = true;
            this.loadingPostsElem.style.display = "block";

            while (this.hasMorePosts) {
                try {
                    const posts = await this.api.getNextPage();
                    if (posts) {
                        Html.appendPostsToFeed(posts);
                    } else {
                        this.hasMorePosts = false;
                    }
                } catch (e) {
                    this.isUpdatingPosts = false;
                    this.hasMorePosts = undefined;
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
        });
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
                posts = await this.api.getPage(page);
                page++;
            } catch (e) {
                this.isUpdatingPosts = false;
                throw e;
            }

            for (const p of posts) {
                if (!Html.postsFeedContains(p)) {
                    newPosts.push(p);
                } else {
                    shouldGetNewPosts = false;
                    break;
                }
            }
        }

        Html.appendPostsToBeginningOfFeed(newPosts);

        this.isUpdatingPosts = false;
    }

    /** Saves both contentScrollPosition and contentScrollPositionTime in localStorage. */
    saveInitialScrollPosition() {
        InfiniteScroll.initialScrollPosition = this.contentScrollPosition;

        this.lastScrollPositionTime = Date.now();
        InfiniteScroll.initialScrollPositionTime = this.lastScrollPositionTime;
    }

    /** Sets page scroll position from saved value in localStorage. */
    restoreScrollPosition() {
        const pos = this.initialScrollPosition;

        if (pos !== null) {
            window.scroll(0, pos);
        }
    }

    /** Saves scroll position to localStorage when user scrolls, search is not shown,
     * and InfiniteScroll.scrollPositionThrottle has elapsed since last save. */
    maybeSaveInitialScrollPosition = () => {
        this.scrollEvents++;

        if (this.scrollEvents <= 1) {
            return;
        }

        if (window.Search == undefined || !window.Search.searchIsShown) {
            this.contentScrollPosition = window.scrollY;
            let time = Date.now();

            if (this.contentScrollPosition === 0 ||
                !this.lastScrollPositionTime ||
                time - this.lastScrollPositionTime >= this.scrollPositionThrottle) {
                this.saveInitialScrollPosition();
            }
        }
    }

    maybeRestoreInitialScrollPosition() {
        const userHasScrolled = this.scrollEvents > 1;

        const shouldRestoreScrollPosition =
            this.initialScrollPosition !== null && this.initialScrollPosIsFresh &&
            window.CakoApp && window.CakoApp.state.page == "/" && !userHasScrolled;

        if (shouldRestoreScrollPosition) {
            this.restoreScrollPosition();
        }
    }

    loadScrollPosition = async () => {
        this.scrollEvents = 0;

        await this.savedPosHasLoaded;

        this.maybeRestoreInitialScrollPosition();
    }

    /** Jumps to bottom of post index.  This was too many buttons. */
    scrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}