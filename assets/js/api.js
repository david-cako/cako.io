const GHOST_API = new GhostContentAPI({
    url: "https://cako.io",
    key: "cd0baa38f66654ecac76e61d72",
    version: "v3"
});

export class Api {
    /** Current page for API instance. */
    page = 0;

    /** Static variable caching all fetched posts. */
    static #posts
    /** Ghost API pagination object, populated with each request for posts */
    static #pagination;

    /** Set true while getting all posts. */
    static #gettingPosts = false
    /** Promise that will resolve when all posts are retrieved, or reject
     * if an error occurs on retreival. */
    static #hasFinishedGettingPosts;

    /** Posts per page in each call to getNextPage. */
    static #postsPerPage = 25;
    /** Retry count for getPosts. */
    static #maxRetries = 10;

    /** Array of objects containing a page number and a promise to resolve with posts. */
    static #pageAwaiters = [];
    /** Array of objects containing a post ID and a promise to resolve with desired post. */
    static #postAwaiters = [];

    constructor() {
        if (!Api.#gettingPosts) {
            Api.#getAllPosts();
        }
    }

    async getPage(n) {
        if (Api.hasPage(n)) {
            return Api.postsForPage(n);
        } else {
            let p = new Promise()
            Api.#pageAwaiters.append({ pageNumber: n, promise: p })

            return await p;
        }
    }

    async getNextPage() {
        const p = await this.getPage(this.page);
        this.page++;

        return p;
    }

    static async getPost(id) {
        const post = Api.postForId(id);
        if (post) {
            return post;
        } else {
            let p = new Promise();
            Api.#postAwaiters.append({ id: id, promise: p });

            return await p;
        }
    }

    static hasPage(n) {
        return Api.#posts.length >= n * Api.#postsPerPage
    }

    static postForId(id) {
        return Api.#posts.find(p => p.id == id);
    }

    static postsForPage(n) {
        if (!Api.hasPage(n)) {
            throw new Error("Page number out of bounds!")
        }
        const start = n * Api.#postsPerPage;
        const end = (n + 1) * Api.#postsPerPage;

        return Api.#posts.slice(start, end)
    }

    static async #getPosts(limit, page, { includeBody } = {}) {
        let retries = 0;

        while (retries < Api.#maxRetries) {
            retries++;

            try {
                await GHOST_API.posts.browse({
                    limit: limit || "all",
                    fields: `title,published_at,slug${includeBody ? ',html' : ''}`,
                    include: "tags",
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

    /** Fetch next page given current pagination and Api.postsPerRequest */
    static async #getNextPage() {
        let page;

        if (Api.#pagination) { // next page populated by previous request
            page = Api.#pagination.next;
        } else { // otherwise, continue from server-rendered posts
            page = 2;
        }

        let posts = await Api.getPosts(Api.#postsPerPage, page);

        Api.#pagination = posts.meta.pagination;

        return posts
    }

    static async #getAllPosts() {
        Api.#posts = [];
        Api.#hasFinishedGettingPosts = new Promise();

        try {
            while (!Api.#pagination || Api.#pagination.next !== null) {
                const p = await Api.#getNextPage();

                Api.#posts = Api.#posts.concat(p)

                Api.#resolveAwaiters();
            }
        } catch (e) {
            Api.#gettingPosts = false;
            Api.#hasFinishedGettingPosts.reject(false);
            Api.#rejectAwaiters(e)
            throw e;
        }

        Api.#hasFinishedGettingPosts.resolve(true);
        Api.#finalizeAwaiters()
    }

    static #resolveAwaiters() {
        for (a of Api.#postAwaiters) {
            const p = Api.postForId(a.id);

            if (p) {
                a.promise.resolve(p);

                const i = Api.#postAwaiters.indexOf(a);
                Api.#postAwaiters.slice(i, 1);
            }
        }

        for (a of Api.#pageAwaiters) {
            if (Api.hasPage(a.pageNumber)) {
                const p = Api.postsForPage(a.pageNumber);
                a.promise.resolve(p);

                const i = Api.#postAwaiters.indexOf(a);
                Api.#postAwaiters.slice(i, 1);
            }
        }
    }

    static #rejectAwaiters(error) {
        for (a of Api.#postAwaiters) {
            a.reject(error);
        }

        Api.#postAwaiters = [];

        for (a of Api.#pageAwaiters) {
            a.reject(error);
        }

        Api.#pageAwaiters = []
    }

    static #finalizeAwaiters() {
        for (a of Api.#postAwaiters) {
            a.reject(new Error("Post not found."));
        }

        Api.#postAwaiters = [];

        for (a of Api.#pageAwaiters) {
            a.resolve(null);
        }

        Api.#pageAwaiters = [];
    }
}