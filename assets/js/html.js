export function generatePostLinkHTML(post, { isCurrentPost, includeBody }) {
    const d = new Date(post.published_at);
    const year = d.getFullYear();
    const month = d.getMonth();
    const date = d.getDate();
    const monthName = monthNames[month];
    const monthStr = String(month + 1).padStart(2, "0");

    const datetime = `${year}-${monthStr}-${String(date).padStart(2, "0")}`;

    postsHtml += `<div class="cako-post${isCurrentPost ? " current" : ""}">
    ${isCurrentPost ? '<div class="current-post-marker">◆</div>' : ""}
    <a href="/${post.slug}/" class="cako-post-link">
        <div class="cako-post-title">${post.title}</div>
        <div class="cako-post-date-outer">
            <time class="cako-post-date" datetime="${datetime}">${date} ${monthName} ${year}</time>
        </div>
        ${includeBody ? `<section class="post-full-content">
            ${post.html}
        </section>` : ""}
    </a>
</div>`;
}

export function generateFeatureHTML(feature, { includeDescription, closed }) {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    let postsHtml = features.posts.map(p => {
        const isCurrentPost = post.slug === window.location.pathname.replaceAll("/", "");

        generatePostLinkHTML(p, { isCurrentPost })
    });

    if (includeDescription) {
        const featureMetadata = JSON.parse(feature.tag.description);

        let featureDate;
        let featureMonth;
        let featureYear;

        if (featureMetadata?.date) {
            const d = new Date(featureMetadata?.date);
            featureDate = d.getDate();
            featureMonth = monthNames[d.getMonth()];
            featureYear = d.getFullYear();
        }

        return `<div class="cako-featured${closed ? " closed" : ""}">
        <div class="arrow${closed ? " closed" : ""}">▸</div>
        <div class="cako-featured-header">${feature.tag.name}
            <div class="cako-featured-description">${featureMetadata.description}</div>
            <div class="cako-featured-date">${featureDate} ${featureMonth} ${featureYear}</div>
        </div>
        ${postsHtml}
        </div>`
    } else {
        return `<div class="cako-featured">
        <div class="cako-featured-header">${feature.tag.name}
        </div>
        ${postsHtml}
        </div>`
    }
}