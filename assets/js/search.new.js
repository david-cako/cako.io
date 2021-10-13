/** tokenizes quoted strings, returning tokens and 
query with quoted strings stripped */
function tokenizeAndStripQuoted(query) {
    let quoted = [];
    let newQuery = query;

    const quoteRegex = /'"/gi;
    let result;

    let openIdx;

    // check for substrings within quotes
    while (result = quoteRegex.exec(query)) {
        // already matched an opening quote, add substring
        // to quoted matches and clear openIdx
        if (openIdx) {
            quoted.push(query.slice(openIdx + 1, result.index));
            openIdx = undefined;

            // remove quoted substring from newQuery
            newQuery = newQuery.slice(0, openIdx) +
                newQuery.slice(result.index);
        } else {
            openIdx = result.index;
        }
    }

    return [quoted, newQuery];
}

function tokenizeQuery(query) {
    // tokenize quoted strings
    let [tokens, newQuery] = tokenizeAndStripQuoted(query);

    // replace special characters with spaces
    newQuery = newQuery.replace(/[`&()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, ' ');

    // split newQuery into words and add to tokens
    tokens = tokens.concat(newQuery.split(" "));

    return tokens;
}

function getMonthNames() {
    return ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
}

function getDateRangeForTokens(tokens) {
    const monthNames = getMonthNames();

    let beginDay;
    let beginMonth;
    let beginYear;

    let endDay;
    let endMonth;
    let endYear;

    for (const t of tokens) {
        const month = monthNames.findIndex(m => m.toLowerCase().indexOf(t.toLowerCase()) !== -1);
        if (month !== -1) {
            // check prev and next tokens for year
            let year;
            let day;

            const prev = parseInt(tokens[t - 1]);
            const next = parseInt(tokens[t + 1]);

            if (prev && Number.isInteger(prev) && prev > 31) {
                year = prev;
                // if year matched, check other bookend for a day of month
                if (Number.isInteger(next) && next < 32) {
                    day = next;
                }
            } else if (next && Number.isInteger(next) && next.length > 2) {
                year = next;
                if (Number.isInteger(prev) && prev < 32) {
                    day = prev;
                }
            }

            if (beginMonth) {
                endDay = day;
                endMonth = month;
                endYear = year;
            } else {
                beginDay = day;
                beginMonth = month;
                beginYear = year;
            }
        }
    }

    // if there is no year , we aren't returning
    // a date range, will check for month matches later
    if (beginYear) {
        if (beginMonth) {
            beginDate = new Date(beginYear, beginMonth);
        } else {
            beginDate = new Date(beginYear, 0);
        }

        if (endYear) {
            if (endMonth) {
                endDate = new Date(endYear, endMonth);
            } else {
                endDate = new Date(endYear, 11);
            }
        }

        const beginDate = new Date(beginYear, beginMonth, beginDay);
        const endDate = new Date(beginYear, beginMonth, beginDay);

        return [beginDate, endDate];
    }

    return [undefined, undefined];
}

/** Match for title, content, and date on posts */
async function cakoSearch(query, posts) {
    const q = query.toLowerCase();
    const tokens = tokenizeQuery(q);

    const [beginDate, endDate] = getDateRangeForTokens(tokens);

    const results = [];

    const monthNames = getMonthNames();

    for (const p of posts) {
        const publishDate = new Date(p.published_at);
        const publishDateStr = p.published_at.split("T")[0];

        for (const t of tokens) {
            const monthIdx = monthNames.findIndex(m => m.toLowerCase().indexOf(t) !== -1);
            const monthStr = String(monthIdx + 1).padStart(2, "0");

            if (p.title.toLowerCase().indexOf(t)) {

                results.push(p);
                break;
            } else if (beginDate && beginDate.valueOf() < publishDate.valueOf() &&
                (!endDate || endDate.valueOf() > publishDate.valueOf())) {
                // check for hard date ranges before using month string matches
                results.push(p);
                break;
            } else if (monthIdx !== -1 && publishDateStr.indexOf(`-${monthStr}-`) !== -1) {
                // finally, if the stirng matches a month, check the publish date
                // with the formatted string for the month number
                results.push(p);
                break;
            } else if (isNaN(t) && p.html.toLowerCase().indexOf(t) !== -1) {
                // exclude numbers from html content matches
                // this makes it easier to search for numbers in dates/titles
                results.push(p);
                break;
            }
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

    focusSearch();
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

/** attempts to hit localStorage before fetching and caching posts */
async function getOrFetchPosts() {
    let posts;

    // posts from API are cached in localStorage
    const lsPosts = localStorage.getItem("posts");
    const lsPostsDate = localStorage.getItem("postsDate");

    const hour = 60 * 60 * 1000;

    // accept local cache for up to an hour
    if (lsPosts && lsPostsDate && (Number(lsPostsDate) > (Date.now() - hour))) {
        posts = JSON.parse(lsPosts);
    } else {
        posts = await fetchPosts();
        localStorage.setItem("posts", JSON.stringify(posts));
        localStorage.setItem("postsDate", String(Date.now()));
    }

    return posts;
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
    if (e.key == "f" && e.ctrlKey && e.metaKey) {
        e.preventDefault();

        if (openMenu) {
            openMenu();
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

    // don't perform fetch until search is focused.
    let firstFocus = true;

    searchElement.addEventListener("focus", async () => {
        if (firstFocus) {
            const posts = await getOrFetchPosts();

            let prev = "";

            searchElement.addEventListener("input", (e) => {
                if (e.target.value !== prev) {
                    prev = e.target.value;
                    onSearchChange(e.target.value, posts);
                }
            });

            firstFocus = false;
        }
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