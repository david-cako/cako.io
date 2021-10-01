function getMonthNames() {
    return ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
}

async function cakoSearch(query, posts) {
    const results = [];
    const monthNames = getMonthNames();

    const q = query.toLowerCase();

    let monthMatch = monthNames.findIndex(m => m.toLowerCase().indexOf(q) !== -1);

    if (monthMatch !== -1) {
        monthMatch++;

        monthMatch = String(monthMatch).padStart(2, "0");
    }

    for (const p of posts) {
        const publishDate = p.published_at.split("T")[0];
        if (p.title.toLowerCase().indexOf(q) !== -1 ||
            publishDate.indexOf(q) !== -1) {

            results.push(p);
        } else if ((q.length > 2 || isNaN(q)) &&
            p.html.toLowerCase().indexOf(q) !== -1) {
            // this separate case makes it easier to search
            // for numbers in dates/titles
            results.push(p);
        } else if (monthMatch !== -1 && publishDate.indexOf(`-${monthMatch}-`) !== -1) {
            // finally, if the stirng matches a month, check the publish date
            // with the formatted string for the month number
            results.push(p);
        }
    }

    console.log(results);

    return results;
}

function showResults(results) {
    const monthNames = getMonthNames();

    const searchResults = document.getElementById("cako-search-results");
    searchResults.innerHTML = "";

    const searchFeed = document.getElementById("cako-search-feed");
    searchFeed.style.display = "block";

    const postFeed = document.getElementById("cako-post-feed-outer");
    if (postFeed) {
        postFeed.style.display = "none";
    }

    const postFull = document.querySelector(".post-full");
    if (postFull) {
        postFull.style.display = "none";
    }

    for (const r of results) {
        const d = new Date(r.published_at);

        const date = d.getDate();
        const month = d.getMonth();
        const monthName = monthNames[month];
        const year = d.getFullYear();

        searchResults.insertAdjacentHTML("beforeend",
            `<div class="cako-post">
                <a class="cako-post-link" href="/${r.slug}/">
                    <div class="cako-post-title">${r.title}</div>
                    <div class="cako-post-date-outer">
                        <time class="cako-post-date">${date} ${monthName} ${year}</time>
                    </div>
                </a>
            </div>`
        )
    }
}

function hideResults() {
    const searchFeed = document.getElementById("cako-search-feed");
    searchFeed.style.display = "none";

    const postFeed = document.getElementById("cako-post-feed-outer");
    if (postFeed) {
        postFeed.style.display = 'block';
    }

    const postFull = document.querySelector(".post-full");
    if (postFull) {
        postFull.style.display = "block";
    }
}

async function onSearchChange(value, posts) {
    const clearIcon = document.getElementById("cako-search-clear");

    if (value.length < 1) {
        hideResults();
        clearIcon.style.display = "none";
        return;
    }

    clearIcon.style.display = "block";

    const results = await cakoSearch(value, posts);

    showResults(results);
}

function clearSearch() {
    const searchElement = document.getElementById("cako-search");
    searchElement.value = "";

    hideResults();

    const clearIcon = document.getElementById("cako-search-clear");
    clearIcon.style.display = "none";
}

function focusSearch() {
    const searchElement = document.getElementById("cako-search");

    searchElement.focus();
}

async function fetchPosts() {
    const api = new GhostContentAPI({
        url: "https://cako.io",
        key: "723c108685f2d6fba50c68a511",
        version: "v3"
    });

    return api.posts.browse({ limit: "all", fields: "title,html,published_at,slug" });
}

// attempts to hit localStorage before fetching and caching posts
async function getOrFetchPosts() {
    let posts;
    const lsPosts = localStorage.getItem("posts");
    const lsPostsDate = localStorage.getItem("postsDate");

    const hour = 60 * 60 * 1000;

    // accept local cache for up to an hour
    if (lsPosts && lsPostsDate && (Number(lsPostsDate) > Date.now() - hour)) {
        posts = JSON.parse(lsPosts);
    } else {
        posts = await fetchPosts();
        localStorage.setItem("posts", JSON.stringify(posts));
        localStorage.setItem("postsDate", String(Date.now()));
    }

    return posts;
}

(async () => {
    const searchElement = document.getElementById("cako-search");

    searchElement.addEventListener("focus", async () => {
        const posts = await getOrFetchPosts();

        let prev = "";

        searchElement.addEventListener("input", (e) => {
            if (e.target.value !== prev) {
                prev = e.target.value;
                onSearchChange(e.target.value, posts);
            }
        });

        searchElement.addEventListener("keydown", (e) => {
            e.stopPropagation();
        })
    });

    const searchClear = document.getElementById("cako-search-clear");
    searchClear.addEventListener("click", clearSearch);
})();