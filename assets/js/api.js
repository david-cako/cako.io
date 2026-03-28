const GHOST_API = new GhostContentAPI({
    url: "https://cako.io",
    key: "cd0baa38f66654ecac76e61d72",
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