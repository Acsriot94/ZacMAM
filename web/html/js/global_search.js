document.addEventListener("DOMContentLoaded", () =>
{
    const searchBtn = document.getElementById('search-submit');
    const searchBox = document.getElementById('search-box');

    let lastSearch = '';

    searchBtn.addEventListener('click', e => {
        performSearch(searchBox.value);
    });

    searchBox.addEventListener('keyup', e => {
        if (e.key === 'Enter') {
            performSearch(searchBox.value);
        }
    });

    scroller = new InfiniteScroller($(".search-results"), 20, 20, true, function (index) {
        populateResults(lastSearch, index);
    });

    function performSearch(searchTerm) {
        lastSearch = searchTerm;
        scroller.setStart(20);

        const resultsContainer = document.querySelector('.global-search-results-container');
        resultsContainer.style.display = 'block';

        const results = document.querySelector('.search-results');
        results.innerHTML = '<div class="spinner"></div>';

        populateResults(searchTerm, 0);
    }

    async function populateResults(searchTerm, start = 0) {
        try {
            let url = `/ajax/global_search.php?search=` + encodeURIComponent(searchTerm) + `&start=${start}`;

            const results_container = document.querySelector('.search-results');

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const json = await response.json();

            const spinner = document.querySelector('.spinner');
            if (spinner) spinner.remove();

            if (json.error) {
                alert(sanitize_string(json["error"]));
            } else if (json.results) {
                const results = json.results;

                if (start === 0 && results.length === 0) {
                    results_container.innerHTML = 'No results returned';
                }

                if (results.length === 21) {
                    scroller.setMoreAvailable(true);
                    results.pop(); // Remove last item
                } else {
                    scroller.setMoreAvailable(false);
                }

                let template = document.getElementById('global-search-file-template').innerHTML;
                template = template.replace("u.truncate", "truncate");
                const twig = Twig.twig({ data: template });

                for (let i = 0; i < results.length; i++) {
                    results_container.insertAdjacentHTML('beforeend', twig.render(results[i]));
                }

                reloadTooltips();
            } else {
                alert("Unknown error");
            }

        } catch (error) {
            alert(error.message);
        }
    }
});