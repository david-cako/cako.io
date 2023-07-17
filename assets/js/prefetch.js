function insertArticlePrefetchLinks(count = 10) {
    const articles = document.getElementsByClassName("cako-post-link");

    const prefetchLinks = [...articles].slice(0, count).map(article => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = article.href;

        return link;
    });

    document.head.append(...prefetchLinks);
}

function insertFeaturesPrefetchLink() {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = "/features/";

    document.head.append(link);    
}

(() => {
    insertArticlePrefetchLinks();
    insertFeaturesPrefetchLink();
})();