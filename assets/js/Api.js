import AsyncGenerator from "./AsyncGenerator.js";

const WEBSOCKETS_URL = "wss://" + document.location.host + "/ws";

const ApiTopicIndex = "Index";
const ApiTopicPosts = "Posts";
const ApiTopicAllPosts = "AllPosts";
const ApiTopicNew = "New";

export default class Api {
    /** WebSocket connection. */
    static conn;
    /** Promise that will resolve on open. */
    static openPromise = AsyncGenerator.promiseWithResolvers();

    /** Listeners for WebSocket open. */
    static openListeners = [];

    /** Retries for initial connection. */
    static retry = 0;
    /** Max retries for initial connection. */
    static maxRetries = 5;

    /** IndexedDB. */
    static db;
    /** Open request for db. */
    static dbOpenRequest;
    static dbIsInitialized;

    /** Set true while getting index. */
    static gettingIndex = false;
    /** True after index been successfully retrieved. **/
    static hasFinishedGettingIndex = false;

    /** Total post count. */
    static totalPosts;

    /** Path to features page. */
    static featuresPath = "/features/"
    /** promiseWithResolvers that will contain features page after API retrieval. */
    static features;
    /** True while getting features. */
    static gettingFeatures = false;
    /** True after features have been retrieved. */
    static hasFinishedGettingFeatures = false;

    /** True while getting all posts. */
    static gettingAllPosts = false;
    /** True after all posts have been retrieved. */
    static hasFinishedGettingAllPosts = false;

    /** Array of AsyncGenerators for Api.index. */
    static #indexGenerators = [];
    /** Array of AsyncGenerators for multiple posts. */
    static #postGenerators = [];
    /** Array of AsyncGenerators for all posts. */
    static #allPostGenerators = [];
    /** Array of AsyncGenerators for new posts. */
    static #newPostGenerators = [];

    static get #indexHasMorePosts() {
        return Api.totalPosts === undefined || Api.totalPosts > Api.index.length
    }

    static async initialize() {
        if (!Api.conn) {
            Api.#open();
        }

        if (!Api.features) {
            Api.features = AsyncGenerator.promiseWithResolvers();
        }

        if (!window.Api) {
            window.Api = this;
        }

        if (!Api.db && !Api.dbOpenRequest) {
            Api.dbOpenRequest = indexedDB.open("cako.io");
            Api.dbOpenRequest.onsuccess = Api.onDbOpenSuccess;
            Api.dbOpenRequest.onerror = Api.onDbOpenError
            Api.dbOpenRequest.onupgradeneeded = Api.onDbUpgradeNeeded;
        }

        document.addEventListener("visibilitychange", Api.onVisibilityChange);
    }

    /** Returns generator yielding existing index posts immediately and
     * further index posts on receipt. */
    static async getIndex() {
        const posts = await Api.getAllPostsFromDb();

        const g = new AsyncGenerator([...posts]);

        if (Api.hasFinishedGettingIndex) {
            g.resolve(null)
        } else {
            Api.#indexGenerators.push({ generator: g });
        }

        return g;
    }

    static async getPost(slug) {
        const post = await Api.getPostFromDb(slug);

        if (post && !Api.shouldGetUpdatedPost(post)) {
            return post;
        } else {
            let id = crypto.randomUUID();

            console.log("remote getpost: ", slug)
            const g = new AsyncGenerator();
            Api.conn.send(JSON.stringify({
                topic: ApiTopicPosts,
                slugs: [slug],
                topicId: id
            }));

            Api.#postGenerators.push({ generator: g, topicId: id });

            return await g.next.promise;
        }
    }

    /** Returns generator yielding available posts for slugs immediately and
     * sends request for rest of posts to be yielded on receipt. */
    static getPosts(slugs) {
        const posts = await Api.getPostsFromDb(slugs);

        let existing = [];
        let requestSlugs = [];

        for (const slug of slugs) {
            const p = posts.find(p => p.slug === slug);
            if (p && !Api.shouldGetUpdatedPost(p)) {
                existing.push(p);
            } else {
                requestSlugs.push(slug);
            }
        }

        const g = new AsyncGenerator(existing);

        if (requestSlugs.length > 0) {
            const id = crypto.randomUUID();

            console.log("remote: ", requestSlugs)
            Api.conn.send(JSON.stringify({
                topic: ApiTopicPosts,
                slugs: requestSlugs,
                topicId: id
            }));

            Api.#postGenerators.push({ generator: g, topicId: id });
        } else {
            g.resolve(null);
        }

        return g;
    }

    /** Returns generator yielding available posts for slugs immediately. 
     * If not yet in flight, sends request for rest of posts, and
     * upon receipt, yields rest of posts. */
    static getAllPosts() {
        let existing = Api.getAllPostsFromDb();

        const existingSlugs = existing.map(p => p.slug)

        const g = new AsyncGenerator(existing);

        if (!this.gettingAllPosts && !this.hasFinishedGettingAllPosts) {
            console.log("remote get all posts")
            Api.conn.send(JSON.stringify({
                topic: ApiTopicAllPosts,
                excludeSlugs: existingSlugs
            }));
        }

        if (this.hasFinishedGettingAllPosts) {
            g.resolve(null);
        } else {
            Api.#allPostGenerators.push({ generator: g });
        }

        return g;
    }

    /** Returns generator that will yield on receipt of new posts. */
    static getNewPosts() {
        const id = crypto.randomUUID();
        const g = new AsyncGenerator();

        Api.#newPostGenerators.push({ generator: g });

        return g;
    }

    static getPrevNextIndex(slug, { next } = { next: false }) {
        const posts = await Api.getAllPostsFromDb();

        const idx = posts.findIndex(s => s.slug === slug);
        if (idx === -1) {
            throw new Error("Slug not found in index.")
        }

        if (next) {
            if ((idx - 1) < 0) {
                return null
            }

            return posts[idx - 1];
        } else {
            if ((idx + 1) >= posts.length) {
                return null
            }

            return posts[idx + 1];
        }
    }

    static getPrevNext(slug, count, { next } = { next: false }) {
        const posts = await Api.getAllPostsFromDb();

        const idx = posts.findIndex(s => s.slug === slug);
        if (idx === -1) {
            throw new Error("Slug not found in index.")
        }

        const start = next
            ? idx
            : (idx - count) >= 0
                ? (idx - count)
                : 0;

        const end = next
            ? (idx + count) <= posts.length
                ? (idx + count)
                : posts.length
            : idx;

        const slugs = posts.slice(start, end)
            .map(p => p.slug);

        return Api.getPosts(slugs)
    }

    static async isOpen() {
        return await Api.openPromise.promise;
    }

    static getPostFromDb(slug) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(["post"]);
            const objectStore = transaction.objectStore("post");
            const request = objectStore.get(slug);

            request.onsuccess = (e) => {
                resolve(e.target.result);
            }
            request.onerror = (e) => {
                reject(e);
            }
        });
    }

    static newDbPostsRequest() {
        const transaction = db.transaction(["post"]);
        const objectStore = transaction.objectStore("post");
        const index = objectStore.index("published_at");
        const request = index.openCursor();

        return request;
    }

    static getPostsFromDb(slugs) {
        return new Promise((resolve, reject) => {
            const request = Api.newDbPostsRequest();

            var posts = [];

            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    if (slugs.indexOf(cursor.slug) !== -1) {
                        posts.push(e.target.result);
                    }
                    cursor.continue();
                } else {
                    resolve(posts);
                }
            }
            request.onerror = (e) => {
                reject("Error opening all posts cursor: ", e);
            }
        });
    }

    static getAllPostsFromDb() {
        return new Promise((resolve, reject) => {
            const request = Api.newDbPostsRequest();

            var posts = [];

            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    posts.push(cursor);
                    cursor.continue();
                } else {
                    resolve(posts);
                }
            }
            request.onerror = (e) => {
                reject("Error opening all posts cursor: ", e);
            }
        });
    }

    static upsertPostInDb(post) {
        return new Promise((resolve, reject) => {
            const objectStore = db
                .transaction(["posts"], "readwrite")
                .objectStore("posts");
            const request = objectStore.get(post.slug);
            request.onsuccess = (e) => {
                const p = e.target.result;

                p.title = post.title;
                p.updated_at = post.updated_at;

                if (post.html) {
                    p.html = post.html;
                    p.local_html_updated_at = post.local_html_updated_at;
                }

                const requestUpdate = objectStore.put(data);
                requestUpdate.onsuccess = (event) => {
                    resolve(post);
                };
                requestUpdate.onerror = (e) => {
                    reject("Error updating post: ", e);
                };
            };
            request.onerror = (event) => {
                reject("Error getting post: ", e);
            };
        });
    }

    static shouldGetUpdatedPost(post) {
        if ((!post.local_html_updated_at || (post.updated_at > post.local_html_updated_at))) {
            return true;
        } else {
            return false;
        }
    }

    static onDbOpenSuccess = (e) => {
        Api.db = e.target.result;
        Api.dbOpenRequest = undefined;
    }

    static onDbOpenError = (e) => {
        console.error("Error opening database.", e);
        Api.db = undefined;
        Api.dbOpenRequest = undefined;
    }

    static onDbUpgradeNeeded = (e) => {
        const db = e.target.result;

        const objectStore = db.createObjectStore("posts", { keyPath: "slug" });
        objectStore.createIndex("title", "title", { unique: false });
        objectStore.createIndex("published_at", "published_at", { unique: false });
        objectStore.createIndex("updated_at", "updated_at", { unique: false });
        objectStore.createIndex("local_html_updated_at", "local_html_updated_at", { unique: false });
        objectStore.createIndex("html", "html", { unique: false });

        Api.dbIsInitialized = true;
    }

    static onVisibilityChange = (e) => {
        if (!document.hidden) {
            if (!Api.conn || Api.conn.readyState == WebSocket.CLOSED) {
                Api.initialize();
            }
        }
    }

    static #getIndex() {
        Api.conn.send(JSON.stringify({
            topic: ApiTopicIndex
        }));
    }

    static #getFeatures() {
        Api.conn.send(JSON.stringify({
            topic: ApiTopicPosts,
            slugs: ["features"],
            topicId: "features"
        }));
    }

    static #open() {
        Api.conn = new WebSocket(WEBSOCKETS_URL);

        Api.conn.onopen = Api.#onOpen;
        Api.conn.onmessage = Api.#onMessage;
        Api.conn.onclose = Api.#onClose;
    }

    static #onOpen() {
        Api.openPromise.resolve();

        if (!Api.gettingIndex && !Api.hasFinishedGettingIndex) {
            Api.#getIndex();
        }

        if (!Api.gettingFeatures && !Api.hasFinishedGettingFeatures) {
            Api.#getFeatures();
        }
    }

    static #onIndex(data) {
        for (const g of Api.#indexGenerators) {
            g.generator.resolve(data.post);
        }

        if (data.post) {
            const transaction = db.transaction(["index"], "readwrite");
            const objectStore = transaction.objectStore("index");
            objectStore.add(data.post);
        } else {
            Api.gettingIndex = false;
            Api.hasFinishedGettingIndex = true;
            Api.#indexGenerators = [];
        }
    }

    static #onPost(data) {
        if (data.topicId === "features") {
            Api.features.resolve(data.post);
            return;
        }

        const g = Api.#postGenerators.find(g => g.topicId === data.topicId);
        if (!g) {
            throw new Error("Post topicId id not found: ", data.topicId);
        }

        g.generator.resolve(data.post);

        if (data.post) {
            Api.upsertPostInDb(data.post);
        } else {
            const idx = Api.#postGenerators.indexOf(s);
            Api.#postGenerators.splice(idx, 1);
        }
    }

    static #onAllPosts(data) {
        for (const g of Api.#allPostGenerators) {
            g.generator.resolve(data.post);
        }

        if (data.post) {
            Api.upsertPostInDb(data.post);
        } else {
            this.isGettingAllPosts = false;
            this.hasFinishedGettingAllPosts = true;
            Api.#allPostGenerators = [];
        }
    }

    static #onNewPost(data) {
        Api.upsertPostInDb(data.post);

        for (const g of Api.#newPostGenerators) {
            g.generator.resolve(data.post);
        }
    }

    static #onMessage(e) {
        const data = JSON.parse(e.data);
        switch (data.topic) {
            case ApiTopicIndex:
                Api.#onIndex(data);
                break;
            case ApiTopicPosts:
                Api.#onPost(data);
                break;
            case ApiTopicAllPosts:
                Api.#onAllPosts(data);
                break;
            case ApiTopicNew:
                Api.#onNewPost(data);
                break;
            default:
                throw new Error("Unknown message topic.", e.topic);
        }
    }

    static async #onClose(e) {
        const error = new Error("WebSocket closed", e);
        for (const g of Api.#indexGenerators) {
            g.generator.reject(error);
            Api.#indexGenerators = [];
        }
        for (const g of Api.#postGenerators) {
            g.generator.reject(error);
            Api.#postGenerators = [];
        }
        for (const g of Api.#allPostGenerators) {
            g.generator.reject(error);
            Api.#allPostGenerators = [];
        }
        for (const g of Api.#newPostGenerators) {
            g.generator.reject(error);
            Api.#newPostGenerators = [];
        }

        Api.conn = undefined;
        Api.gettingIndex = false;
        Api.gettingFeatures = false;

        console.error(error);

        if (Api.retry < Api.maxRetries) {
            Api.retry++;
            Api.initialize();
        } else {
            Api.openPromise.reject(new Error(`Max retries: ${Api.retry}`));
            console.error(`Max retries: ${Api.retry}`);
        }
    }
}
