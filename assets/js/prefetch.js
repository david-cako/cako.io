(() => {
    const articles = document.getElementsByClassName("cako-post-link");

    const prefetchLinks = [...articles].slice(0, 10).map(article => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = article.href;

        return link;
    });

    document.head.append(...prefetchLinks);
})();