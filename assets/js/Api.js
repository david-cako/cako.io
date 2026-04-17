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
    /** Array of objects containing a post slug and a promise to resolve with post. */
    static #postAwaiters = [];
    /** Array of objects containing a page number and a promise to resolve with posts. */
    static #pageAwaiters = [];
    /** Array of objects containing a promise to resolve with all posts. */
    static #allPostsAwaiters = [];

    /** Path to features page. */
    static featuresPath = "/features/"
    /** Promise that will contain features page after API retrieval. */
    static features;
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
            window.Api = this;
        }
    }

    async getPage(n) {
        if (Api.hasPage(n)) {
            return Api.#postsForPage(n);
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

    async getPost(slug) {
        const post = Api.#postForSlug(slug);

        if (post) {
            return post;
        } else {
            const post = Api.#getPost(slug);
        }
    }

    /** Returns promise that will resolve to post when post is
     * loaded and pagination is available for post. */
    async onPost(slug) {
        const post = Api.#postForSlug(slug);
        if (post && Api.postHasPagination(post)) {
            return post;
        } else {
            if (Api.hasFinishedGettingPosts) {
                return null;
            }

            let p = new Promise((resolve, reject) => {
                Api.#postAwaiters.push({ slug: slug, promise: { resolve, reject } })
            });

            return await p;
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

    async hasApi() {
        return await this.getPage(1);
    }

    static hasPage(n) {
        return Api.posts.length > (n - 1) * Api.#postsPerPage
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

                await Api.#resolveAwaiters();
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

    static async #getPost(slug, { includeBody } = {}) {
        let retries = 0;

        while (retries < Api.#maxRetries) {
            retries++;

            try {
                const post = await GHOST_API.posts.read({
                    slug: slug,
                    formats: includeBody ? ['html'] : undefined
                });

                await Api.#setPostPagination(post);

                return post
            } catch (e) {
                console.log(`Error fetching posts, attempt ${retries}`, e);
                if (retries >= Api.#maxRetries) {
                    throw e;
                }
            }
        }
    }

    static async #getPrevPost(slug, { includeBody } = {}) {
        const posts = await GHOST_API.posts.browse({
            order: "published_at" + "desc",
            limit: 1,
            filter: "slug:-" + slug + "+published_at" + "<=" + `'${post.published_at}'`,
            formats: includeBody ? ['html'] : undefined
        });

        return posts[0];
    }

    static async #postForSlug(slug) {
        let post = Api.posts.find(p => p.slug == slug);
        if (!post) {
            return null;
        }

        post = Object.assign({}, post);

        await Api.#setPostPagination(post);

        return post;
    }

    static #postsForPage(n) {
        if (!Api.hasPage(n)) {
            throw new Error("Page number out of bounds!")
        }
        const start = (n - 1) * Api.#postsPerPage;
        const end = n * Api.#postsPerPage;

        return Api.posts.slice(start, end)
    }

    /** Sets previous and next post for post. If post is the first or last post,
     * previous or next will be null, respectively.  */
    static async #setPostPagination(post) {
        const postIdx = Api.posts.findIndex(p => p.slug == post.slug);
        if (postIdx == -1) {
            return null;
        }

        if (postIdx + 1 < Api.posts.length) {
            post.prev = Object.assign({}, Api.posts[postIdx + 1]);
        } else {
            post.prev = await Api.#getPrevPost(post.slug);
        }

        if (postIdx > 0) {
            post.next = Object.assign({}, Api.posts[postIdx - 1]);
        } else {
            post.next = null;
        }
    }

    static async #prefetchFeatures() {
        Api.fetchingFeatures = true;

        Api.features = (async () => {
            let retries = 0;

            while (retries < Api.#maxRetries) {
                retries++;

                try {
                    const f = await GHOST_API.pages.read({
                        slug: "features",
                        formats: ['html']
                    });

                    Api.fetchingFeatures = false;
                    Api.hasFetchedFeatures = true;

                    return f
                } catch (e) {
                    console.log(`Error fetching features, attempt ${retries}`, e);
                    if (retries >= Api.#maxRetries) {
                        throw e;
                    }
                }
            }
        })();
    }

    static async #resolveAwaiters() {
        for (const a of Api.#postAwaiters) {
            const post = await Api.#postForSlug(a.slug);
            if (post) {
                a.promise.resolve(post);
            }
        }

        for (const a of Api.#pageAwaiters) {
            if (Api.hasPage(a.pageNumber)) {
                const p = Api.#postsForPage(a.pageNumber);
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
        for (const a of Api.#postAwaiters) {
            a.promise.resolve(null);
        }

        Api.#postAwaiters = [];

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
