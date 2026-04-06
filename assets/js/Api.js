const GHOST_API = new GhostContentAPI({
    url: location.origin,
    key: CONTENT_API_KEY,
    version: "v3"
});

export default class Api {
    /** Current page for API instance. */
    page;

    /** Static variable caching all fetched posts. */
    static posts
    /** Set true while getting all posts. */
    static gettingPosts = false
    /** True after all posts have been successfully retrieved. **/
    static hasFinishedGettingPosts = false;

    /** Private page index for requesting all pages. */
    static #page = 1;
    /** Ghost API pagination object, populated with each request for posts */
    static #pagination;
    /** Posts per page in each call to getNextPage. */
    static #postsPerPage = 25;
    /** Retry count for getPosts. */
    static #maxRetries = 10;
    /** Array of objects containing a page number and a promise to resolve with posts. */
    static #pageAwaiters = [];
    /** Array of objects containing a promise to resolve with all posts. */
    static #allPostsAwaiters = [];

    /** Path to features page. */
    static featuresPath = "/features/"
    /** Promise that will contain full document element for features page after retrieval. */
    static featuresDocument;
    /** True while fetching features. */
    static fetchingFeatures = false;
    /** True after features have been retrieved. */
    static hasFetchedFeatures = false;

    static get #hasMorePosts() {
        return !Api.#pagination || Api.#pagination.next !== null
    }

    constructor(options = { page: 1 }) {
        this.page = options.page;

        if (!Api.gettingPosts && !Api.hasFinishedGettingPosts) {
            this.#getAllPosts();
        }

        if (!Api.fetchingFeatures && !Api.hasFetchedFeatures) {
            Api.#prefetchFeatures();
        }

        if (!window.Api) {
            window.Api = Api;
        }
    }

    async getPage(n) {
        if (Api.hasPage(n)) {
            return Api.postsForPage(n);
        } else {
            if (Api.hasFinishedGettingPosts) {
                return null;
            }

            let p = new Promise((resolve, reject) => {
                Api.#pageAwaiters.push({ pageNumber: n, promise: { resolve, reject } })
            });

            return await p;
        }
    }

    async getNextPage() {
        const p = await this.getPage(this.page);
        this.page++;

        return p;
    }

    async getPost(id) {
        const post = Api.postForId(id);
        if (post) {
            return post;
        } else {
            return Api.#getPost(id);
        }
    }

    async getAllPosts() {
        if (Api.hasFinishedGettingPosts) {
            return Api.posts;
        }

        let p = new Promise((resolve, reject) => {
            Api.#allPostsAwaiters.push({ promise: { resolve, reject } })
        });

        return await p;
    }

    async getFeaturesContent() {
        const d = await Api.featuresDocument;

        const article = d.querySelector("article");
        if (!article) {
            throw new Error("Could not get features article from response.")
        }

        return article;
    }

    async hasApi() {
        return await this.getPage(1);
    }

    static hasPage(n) {
        return Api.posts.length > (n - 1) * Api.#postsPerPage
    }

    static postForId(id) {
        const postIdx = Api.posts.findIndex(p => p.slug == id);
        if (postIdx == -1) {
            return null;
        }

        const post = Object.assign({}, Api.posts[postIdx]);

        if (postIdx + 1 < Api.posts.length) {
            post.prev = Object.assign({}, Api.posts[postIdx + 1]);
        }
        if (postIdx > 0) {
            post.next = Object.assign({}, Api.posts[postIdx - 1]);
        }

        return post;
    }

    static postsForPage(n) {
        if (!Api.hasPage(n)) {
            throw new Error("Page number out of bounds!")
        }
        const start = (n - 1) * Api.#postsPerPage;
        const end = n * Api.#postsPerPage;

        return Api.posts.slice(start, end)
    }

    /** Fetch next page given current pagination and Api.postsPerRequest */
    async #getNextPage() {
        let posts = await Api.#getPosts(Api.#postsPerPage, Api.#page, { includeBody: true });
        Api.#page++

        Api.#pagination = posts.meta.pagination;

        return posts
    }

    async #getAllPosts() {
        Api.posts = [];
        Api.gettingPosts = true;

        try {
            while (Api.#hasMorePosts) {
                const p = await this.#getNextPage();
                Api.posts = Api.posts.concat(p)

                Api.#resolveAwaiters();
            }
        } catch (e) {
            Api.gettingPosts = false;
            Api.#rejectAwaiters(e)
            throw e;
        }

        Api.hasFinishedGettingPosts = true;

        Api.#finalizeAwaiters()
    }

    static async #getPosts(limit, page, { includeBody } = {}) {
        let retries = 0;

        while (retries < Api.#maxRetries) {
            retries++;

            try {
                return await GHOST_API.posts.browse({
                    limit: limit || "all",
                    fields: `title,published_at,slug${includeBody ? ',html' : ''}`,
                    page
                });
            } catch (e) {
                console.log(`Error fetching posts, attempt ${retries}`, e);
                if (retries >= Api.#maxRetries) {
                    throw e;
                }
            }
        }
    }

    static async #getPost(id, { includeBody } = {}) {
        let retries = 0;

        while (retries < Api.#maxRetries) {
            retries++;

            try {
                return await GHOST_API.posts.read({
                    slug: id,
                    formats: includeBody ? ['html'] : []
                });
            } catch (e) {
                console.log(`Error fetching posts, attempt ${retries}`, e);
                if (retries >= Api.#maxRetries) {
                    throw e;
                }
            }
        }
    }

    static async #prefetchFeatures() {
        Api.fetchingFeatures = true;

        Api.featuresDocument = (async () => {
            try {
                const r = await fetch(Api.featuresPath);
                if (!r.ok) {
                    throw new Error(`Response status: ${r.status}`);
                }

                const html = await r.text();
                const parser = new DOMParser()
                const d = parser.parseFromString(html, "text/html")

                Api.fetchingFeatures = false;
                Api.hasFetchedFeatures = true;

                return d;
            } catch (e) {
                Api.fetchingFeatures = false;
                throw e;
            }
        })();
    }

    static #resolveAwaiters() {
        for (const a of Api.#pageAwaiters) {
            if (Api.hasPage(a.pageNumber)) {
                const p = Api.postsForPage(a.pageNumber);
                a.promise.resolve(p);

                const i = Api.#pageAwaiters.indexOf(a);
                Api.#pageAwaiters.slice(i, 1);
            }
        }
    }

    static #rejectAwaiters(error) {
        for (const a of Api.#pageAwaiters) {
            a.promise.reject(error);
        }

        Api.#pageAwaiters = []
    }

    static #finalizeAwaiters() {
        for (const a of Api.#pageAwaiters) {
            a.promise.resolve(null);
        }

        Api.#pageAwaiters = [];

        for (const a of Api.#allPostsAwaiters) {
            a.promise.resolve(Api.posts);
        }

        Api.#allPostsAwaiters = [];
    }
}
