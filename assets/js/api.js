const GHOST_API = new GhostContentAPI({
    url: "https://cako.io",
    key: "723c108685f2d6fba50c68a511",
    version: "v3"
});

export class Api {
    static getPosts(limit, page, { includeBody } = {}) {
        return GHOST_API.posts.browse({
            limit: limit || "all",
            fields: `title,published_at,slug${includeBody ? ',html' : ''}`,
            include: "tags",
            page
        });
    }

    static getPost(id) {

    }

    static getTag(id) {
        return GHOST_API.tags.read({ slug: id })
    }
}