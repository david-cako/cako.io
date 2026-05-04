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

    /** Ordered index of posts. */
    static index = [];
    /** Set true while getting index. */
    static gettingIndex = false;
    /** True after index been successfully retrieved. **/
    static hasFinishedGettingIndex = false;

    /** Object containing full post values for slug keys. */
    static posts = {};
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
    }

    /** Returns generator yielding existing index posts immediately and
     * further index posts on receipt. */
    static getIndex() {
        const g = new AsyncGenerator([...Api.index]);

        if (Api.hasFinishedGettingIndex) {
            g.resolve(null)
        } else {
            Api.#indexGenerators.push({ generator: g });
        }

        return g;
    }

    static async getPost(slug) {
        let id = crypto.randomUUID();


        if (slug in Api.posts) {
            return Api.posts[slug];
        } else {
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
        const id = crypto.randomUUID();

        let existing = [];
        let requestSlugs = [];

        for (const slug of slugs) {
            if (slug in Api.posts) {
                existing.push(Api.posts[slug]);
            } else {
                requestSlugs.push(slug);
            }
        }

        const g = new AsyncGenerator(existing);

        if (requestSlugs.length > 0) {
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
        let existing = [];

        const existingKeys = Object.keys(Api.posts);
        for (const k in existingKeys) {
            existing.push(k);
        }

        const g = new AsyncGenerator(existing);

        if (!this.gettingAllPosts && !this.hasFinishedGettingAllPosts) {
            Api.conn.send(JSON.stringify({
                topic: ApiTopicAllPosts,
                exclude: existing
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
        const idx = Api.index.findIndex(s => s.slug === slug);
        if (idx === -1) {
            throw new Error("Slug not found in index.")
        }

        if (next) {
            if ((idx - 1) < 0) {
                return null
            }

            return Api.index[idx - 1];
        } else {
            if ((idx + 1) >= Api.index.length) {
                return null
            }

            return Api.index[idx + 1];
        }
    }

    static getPrevNext(slug, count, { next } = { next: false }) {
        const idx = Api.index.findIndex(s => s.slug === slug);
        if (idx === -1) {
            throw new Error("Slug not found in index.")
        }

        const start = next
            ? idx
            : (idx - count) >= 0
                ? (idx - count)
                : 0;

        const end = next
            ? (idx + count) <= Api.index.length
                ? (idx + count)
                : Api.index.length
            : idx;

        const posts = Api.index.slice(start, end)
            .map(p => p.slug);

        return Api.getPosts(posts)
    }

    static async isOpen() {
        return await Api.openPromise.promise;
    }

    static #getIndex() {
        Api.index = [];
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
            Api.index.push(data.post);
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
            if (!(data.post.slug in Api.posts)) {
                Api.posts[data.post.slug] = data.post;
            }
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
            if (!(data.post.slug in Api.posts)) {
                Api.posts[data.post.slug] = data.post;
            }
        } else {
            this.isGettingAllPosts = false;
            this.hasFinishedGettingAllPosts = true;
            Api.#allPostGenerators = [];
        }
    }

    static #onNewPost(data) {
        const len = Api.index.unshift(data.post);
        Api.totalPosts = len;

        Api.posts[p.slug] = data.post;

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
