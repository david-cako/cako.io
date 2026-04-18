import { expect, Locator } from "@playwright/test";

export async function expectNoDuplicatePosts(posts: Locator[]) {
    let postIds = []
    for (const p of posts) {
        postIds.push(await p.getAttribute("data-post-id"));
    }
    for (const p of postIds) {
        const matchingPosts = postIds.filter(id => id == p);
        if (matchingPosts.length > 1) {
            console.log(postIds);
            console.log("Duplicate posts found: ", matchingPosts);
        }
        await expect(matchingPosts.length).toBe(1);
    }
}