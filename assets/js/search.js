const GHOST_API = new GhostContentAPI({
    url: "https://cako.io",
    key: "723c108685f2d6fba50c68a511",
    version: "v3"
});

let GHOST_POSTS;

function tokenizeQuery(query) {
    // replace special characters with spaces
    const newQuery = query.replace(/[`&()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, ' ');

    // split newQuery into words and add to tokens
    const tokens = newQuery.split(" ").filter(t => t.length > 0);

    return tokens;
}

function getMonthNames() {
    return ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
}

/** Match for title, content, and date on posts */
async function cakoSearch(query) {
    const posts = await getOrFetchPosts();

    const q = query.toLowerCase();
    const tokens = tokenizeQuery(q);

    const results = [];

    const monthNames = getMonthNames();

    for (const p of posts) {
        const publishDate = new Date(p.published_at);
        const publishDateStr = p.published_at.split("T")[0];

        let matches = 0;

        for (const t of tokens) {
            const monthIdx = monthNames.findIndex(m => m.toLowerCase().indexOf(t) !== -1);
            const monthStr = String(monthIdx + 1).padStart(2, "0");

            if (p.title.toLowerCase().indexOf(t) !== -1) {
                matches += 1;
            } else if (publishDate.getFullYear() === parseInt(t)) {
                // check for hard date ranges before using month string matches
                matches += 1;
            } else if (monthIdx !== -1 && publishDateStr.indexOf(`-${monthStr}-`) !== -1) {
                // if the stirng matches a month, check the publish date
                // with the formatted string for the month number
                matches += 1;
            } else if (publishDate.getDate() === parseInt(t)) {
                matches += 1;
            } else if (isNaN(t) && p.html.toLowerCase().indexOf(t) !== -1) {
                // exclude numbers from html content matches
                // this makes it easier to search for numbers in dates/titles
                matches += 1;
            }
        }

        if (matches >= tokens.length) {
            results.push(p);
        }
    }

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
                <a class="cako-post-link" href="/${r.slug}/" onclick="onPostClicked(event)">
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

async function onSearchChange(value) {
    const clearIcon = document.getElementById("cako-search-clear");

    if (value.length < 1) {
        hideResults();
        clearIcon.style.display = "none";
        return;
    }

    clearIcon.style.display = "block";

    const results = await cakoSearch(value);

    showResults(results);
}

function clearSearch() {
    const searchElement = document.getElementById("cako-search");
    searchElement.value = "";

    hideResults();

    const clearIcon = document.getElementById("cako-search-clear");
    clearIcon.style.display = "none";

    focusSearch();
}

function focusSearch() {
    const searchElement = document.getElementById("cako-search");

    searchElement.focus();
}

async function getOrFetchPosts() {
    // remove ls from previous version
    localStorage.removeItem("posts");
    localStorage.removeItem("postsDate");

    if (!GHOST_POSTS) {
        GHOST_POSTS = await GHOST_API.posts.browse({ limit: "all", fields: "title,html,published_at,slug" });
    }

    return GHOST_POSTS;
}

function onKeyDown(e) {
    const searchResults = document.getElementById("cako-search-results");
    const firstResult = searchResults.querySelector(".cako-post-link");
    const searchFeed = document.getElementById("cako-search-feed");

    // if search shown and up or down pressed, prevent scrolling
    if (searchFeed.style.display === "block" &&
        (e.key == "ArrowUp" || e.key == "ArrowDown")) {
        e.preventDefault();
    }

    // if enter, attempt to navigate to first result
    if (e.key == "Enter") {
        if (firstResult) {
            firstResult.click();
            return;
        }
    }

    // ctrl + cmd + f to open search
    if (e.key.toLowerCase() == "f" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();

        if (toggleMenu) {
            toggleMenu();
        }

        focusSearch();

        return;
    }

    // escape closes menu
    if (e.key == "Escape") {
        if (closeMenu) {
            closeMenu();
        }

        return;
    }

    if (document.activeElement &&
        document.activeElement.classList.contains("cako-post-link")) {
        // already focused on a result
        const current = document.activeElement;

        if (e.key == "ArrowUp") {
            if (current && current.parentElement
                && current.parentElement.previousElementSibling) {
                const prev = current.parentElement.previousElementSibling;

                if (prev.children[0]) {
                    prev.children[0].focus();
                }
            } else {
                // currently at the top, focus back to search
                focusSearch();
            }
        } else if (e.key == "ArrowDown") {
            if (current && current.parentElement &&
                current.parentElement.nextElementSibling) {
                const next = current.parentElement.nextElementSibling;

                if (next.children[0]) {
                    next.children[0].focus();
                }
            }
        }
    } else if (e.key == "ArrowDown") {
        // down pressed, no result focused yet
        if (firstResult) {
            firstResult.focus();
        }
    }
}

(async () => {
    const searchElement = document.getElementById("cako-search");

    searchElement.addEventListener("focus", async () => {
        let prev = "";

        searchElement.addEventListener("input", (e) => {
            if (e.target.value !== prev) {
                prev = e.target.value;
                onSearchChange(e.target.value);
            }
        });
    });

    searchElement.addEventListener("keydown", (e) => {
        // prevents arrow left/right post navigation while
        // search is focused
        e.stopPropagation();
        onKeyDown(e);
    });
    document.addEventListener("keydown", onKeyDown);

    const searchClear = document.getElementById("cako-search-clear");
    searchClear.addEventListener("click", clearSearch);
})();