const MonthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default class Html {
    static postFeed = document.getElementById("cako-post-feed");
    static postTemplate = document.querySelector("#cako-post-template");
    static postLinkTemplate = document.querySelector("#cako-post-link-template");
    static indexCopyright = document.querySelector("#index-inner .copyright-date");

    static generateSearchPreview(result) {
        if (result.strong === undefined || result.strong.in !== "html") {
            return ``
        }

        const words = result.strong.preview.split(" ");

        for (let i = 0; i < words.length; i++) {
            const w = words[i];

            for (let m of result.strong.matches) {
                let matchIdx = w.indexOf(m.word);

                if (matchIdx !== -1) {
                    let before, match, after;

                    const tokenIdx = m.word.toLowerCase().indexOf(m.token);

                    if (tokenIdx !== -1) {
                        before = w.slice(0, tokenIdx);
                        match = w.slice(tokenIdx, tokenIdx + m.token.length);
                        after = w.slice(tokenIdx + m.token.length);
                    } else {
                        before = "";
                        match = w;
                        after = "";
                    }

                    words[i] = `${before}<span class="match">${match}</span>${after}`;
                }
            }
        }

        const preview = document.createElement("div");
        preview.classList = "cako-post-preview";

        preview.innerHTML = words.join(" ");

        return preview;
    }

    static getPostDateObject(post) {
        const d = new Date(post.published_at);
        const year = d.getFullYear();
        const month = d.getMonth();
        const date = d.toLocaleString(undefined, {
            day: "numeric"
        });
        const monthStr = d.toLocaleString(undefined, {
            month: "numeric"
        });
        const time = d.toLocaleTimeString(undefined, {
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
        });

        return {
            d: d,
            year: year,
            month: month,
            date: date,
            monthName: MonthNames[month],
            monthStr: monthStr,
            datetime: `${year}-${monthStr}-${date}`,
            time: time
        }
    }

    static generatePostLink(post, { navLink, searchResult } = {}) {
        const {
            d,
            year,
            month,
            date,
            monthName,
            monthStr,
            datetime,
            time
        } = Html.getPostDateObject(post);

        const postLinkElem = document.importNode(Html.postLinkTemplate.content, true);

        postLinkElem.firstElementChild.dataset.postId = post.slug;

        let aElem = postLinkElem.querySelector("a");
        aElem.href = `/${post.slug}/`

        if (navLink) {
            aElem.classList.add("post-nav-link");

            if (navLink == "left") {
                postLinkElem.firstElementChild.classList.add("left");
                aElem.classList.add("left");
            } else if (navLink == "right") {
                postLinkElem.firstElementChild.classList.add("right");
                aElem.classList.add("right");
            }
        }

        let titleElem = postLinkElem.querySelector(".cako-post-title");
        titleElem.innerText = post.title;

        let dateElem = postLinkElem.querySelector(".cako-post-date");
        dateElem.setAttribute("datetime", datetime);
        dateElem.innerText = `${date} ${monthName} ${year}`;

        if (searchResult !== undefined) {
            if (searchResult.strong !== undefined &&
                searchResult.strong.in === "html") {
                const body = Html.generateSearchPreview(searchResult);

                postLinkElem.firstElementChild.append(body);
            }
        }

        return postLinkElem;
    }

    static generatePost(post) {
        const {
            d,
            year,
            month,
            date,
            monthName,
            monthStr,
            datetime,
            time
        } = Html.getPostDateObject(post);

        const postContent = document.importNode(Html.postTemplate.content, true);

        let titleElem = postContent.querySelector(".post-full-title");
        titleElem.innerText = post.title;

        let dateElem = postContent.querySelector(".post-full-meta-date");
        dateElem.setAttribute("datetime", datetime);
        dateElem.innerText = `${date} ${monthName} ${year}`;

        let contentElem = postContent.querySelector(".post-full-content");

        if (post.html) {
            contentElem.innerHTML = Html.replaceSpaces(post.html);
        }

        return postContent;
    }

    static appendPostsToFeed(posts) {
        const postLinks = posts.map(p => Html.generatePostLink(p));

        for (const p of postLinks) {
            Html.postFeed.append(p);
        }
    }

    static appendPostsToBeginningOfFeed(posts) {
        const postLinks = posts.map(p => Html.generatePostLink(p));

        for (const p of postLinks) {
            Html.postFeed.insertBefore(p, Html.postFeed.firstChild);
        }
    }

    static postsFeedContains(post) {
        return Html.postFeed.querySelector(`[href="/${post.slug}/"]`) !== null;
    }

    /** Replace double spaces with en-space to fix wrapping. */
    static replaceSpaces(htmlText) {
        return htmlText.replace(/ \u00A0/g, "&ensp;");
    }

    static getIdForPostLink(postLink) {
        const post = postLink.closest('.cako-post');
        if (!post) {
            throw new Error("No cako-post element found.")
        }

        let id;
        if (post.dataset.postId) {
            id = post.dataset.postId;
        } else if (postLink.href) {
            // Necessary for Features links!
            const url = URL.parse(postLink.href);
            id = url.pathname.replaceAll("/", "");
        } else {
            throw new Error("Missing post id or href in post link!");
        }

        return id;
    }

    static setCopyrightDate(page) {
        if (!page) {

        }
    }
}
