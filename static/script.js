document.addEventListener('DOMContentLoaded', () => {
    // Setup theme toggle and refresh button listeners
    setupThemeToggle();
    setupRefreshButton();

    // Keep the original form submit listener
    document.getElementById("predictForm").addEventListener("submit", handleFormSubmit);
});

let activeIntervals = [];

async function handleFormSubmit(e) {
    e.preventDefault();

    const data = {
        dow: parseInt(document.getElementById("dow").value),
        month: parseInt(document.getElementById("month").value),
        is_weekend: parseInt(document.getElementById("is_weekend").value),
        is_holiday: parseInt(document.getElementById("is_holiday").value),
        special_event: parseInt(document.getElementById("special_event").value),
        temp: parseFloat(document.getElementById("temp").value)
    };

    try {
        const apiBase = window.location.origin;
        const res = await fetch(`${apiBase}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            throw new Error(`Server responded with status: ${res.status}`);
        }

        const result = await res.json();

        if (result.status === "success") {
            let resultsHTML = '';

            if (result.alerts.length > 0) {
                resultsHTML += `<div id="alert-container"><h3><i class="fa-solid fa-triangle-exclamation"></i> System Alerts</h3>`;
                result.alerts.forEach(alertText => {
                    resultsHTML += `<div class="alert-box">${alertText}</div>`;
                });
                resultsHTML += `</div>`;
            }

            resultsHTML += `<h3><i class="fa-solid fa-clipboard-list"></i> Daily Rake Requirement</h3>`;
            let statsHTML = '<div class="stats-container">';
            for (const line of Object.keys(result.predictions)) {
                const pred = result.predictions[line];
                const avail = result.available_rakes[line];
                const isExceeded = pred > avail;
                statsHTML += `
                    <div class="stat-card ${isExceeded ? 'warning' : ''}">
                        <div class="stat-header">${line}</div>
                        <div class="stat-body">
                            <div class="stat-item">
                                <span class="stat-label">Predicted</span>
                                <span class="stat-value">${pred}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Available</span>
                                <span class="stat-value">${avail}</span>
                            </div>
                        </div>
                    </div>`;
            }
            statsHTML += '</div>';
            resultsHTML += statsHTML;

            if (result.hourly_schedule) {
                let scheduleHTML = `<div class="hourly-schedule"><table>
                                    <thead><tr><th>Hour</th><th>Line 1</th><th>Line 2</th><th>Line 3</th></tr></thead>
                                    <tbody>`;
                for (const [hour, lines] of Object.entries(result.hourly_schedule)) {
                    scheduleHTML += `<tr><td>${hour}</td>`;
                    for (const line of ["Line1", "Line2", "Line3"]) {
                        const pred = lines[line];
                        const avail = result.available_rakes[line];
                        let heatClass = 'demand-low';
                        if (pred > avail) heatClass = 'demand-exceeded-cell';
                        else if (pred >= 5) heatClass = 'demand-high';
                        else if (pred >= 3) heatClass = 'demand-medium';
                        scheduleHTML += `<td class="${heatClass}">${pred}</td>`;
                    }
                    scheduleHTML += `</tr>`;
                }
                scheduleHTML += `</tbody></table></div>`;
                resultsHTML += scheduleHTML;
            }

            document.getElementById("results").innerHTML = resultsHTML;
            animateRakes(result.predictions);

        } else {
            document.getElementById("results").innerHTML = `<p class="placeholder" style="color:red;">Error: ${result.error || 'Unknown error'}</p>`;
        }

    } catch (err) {
        document.getElementById("results").innerHTML = `<p class="placeholder" style="color:red;">Request failed: ${err}</p>`;
    }
}

function animateRakes(predictions) {
    activeIntervals.forEach(clearInterval);
    activeIntervals = [];

    const trackInfo = {
        Line1: { top: 50, color: '#3498db' },
        Line2: { top: 110, color: '#2ecc71' },
        Line3: { top: 170, color: '#e67e22' }
    };

    const map = document.getElementById("metro-map");
    map.querySelectorAll(".train-container").forEach(el => el.remove());

    for (const [line, count] of Object.entries(predictions)) {
        if (count === 0) continue;

        const trainContainer = document.createElement("div");
        trainContainer.classList.add("train-container");
        trainContainer.style.top = (trackInfo[line].top - 12) + "px";

        for (let i = 0; i < count; i++) {
            const car = document.createElement("div");
            car.classList.add("train-car");
            car.textContent = i + 1; // <-- THIS LINE ADDS THE NUMBER
            if (i === 0) car.classList.add("train-engine");
            car.style.backgroundColor = trackInfo[line].color;
            trainContainer.appendChild(car);
        }

        map.appendChild(trainContainer);

        const trainWidth = (40 + 4) * count;
        const mapWidth = map.offsetWidth;
        let pos = -trainWidth;
        trainContainer.style.left = pos + "px";

        const intervalId = setInterval(() => {
            pos += 2;
            if (pos > mapWidth) pos = -trainWidth;
            trainContainer.style.left = pos + "px";
        }, 20);

        activeIntervals.push(intervalId);
    }
}

// --- NEW: Theme Toggle and Refresh Functions ---
function setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        toggle.checked = true;
    }

    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });
}

function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', () => {
        location.reload();
    });
}