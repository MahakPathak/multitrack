// This will store active animation loops to clear them later
let activeIntervals = [];
document.getElementById("predictForm").addEventListener("submit", async function(e) {
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
        // ✅ Auto-detect API URL
        const apiBase = window.location.origin;  
        const res = await fetch(`${apiBase}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if(result.status === "success") {
            // -----------------------------
            // Clear previous results and prepare new content
            // -----------------------------
            let resultsHTML = '';

            // -----------------------------
            // Create Alert Boxes (if any)
            // -----------------------------
            if (result.alerts.length > 0) {
                resultsHTML += `<div id="alert-container">
                                 <h3><i class="fa-solid fa-triangle-exclamation"></i> System Alerts</h3>`;
                result.alerts.forEach(alertText => {
                    resultsHTML += `<div class="alert-box">${alertText}</div>`;
                });
                resultsHTML += `</div>`;
            }
            
            // -----------------------------
            // NEW: Create Daily Rake Requirement Stat Cards
            // -----------------------------
            resultsHTML += `<h3><i class="fa-solid fa-clipboard-list"></i> Daily Rake Requirement</h3>`;
            let statsHTML = '<div class="stats-container">';
            for(const line of Object.keys(result.predictions)) {
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


            // -----------------------------
            // Show total demand
            // -----------------------------
            resultsHTML += `<p class="total-demand"><strong>Total Predicted Demand:</strong> ${result.total_demand} Rakes</p>`;

            // -----------------------------
            // NEW: Create Enhanced Hourly Schedule Table
            // -----------------------------
            if(result.hourly_schedule){
                let scheduleHTML = `<h3><i class="fa-solid fa-clock"></i> Hourly Schedule (Heat Map)</h3>
                                    <table class="hourly-schedule">
                                    <thead>
                                        <tr><th>Hour</th><th>Line 1</th><th>Line 2</th><th>Line 3</th></tr>
                                    </thead>
                                    <tbody>`;
                for(const [hour, lines] of Object.entries(result.hourly_schedule)){
                    const hourNum = parseInt(hour.split(':')[0]);
                    const isRushHour = (hourNum >= 7 && hourNum <= 10) || (hourNum >= 17 && hourNum <= 20);
                    
                    scheduleHTML += `<tr class="${isRushHour ? 'rush-hour' : ''}"><td>${hour}</td>`;

                    for(const line of ["Line1","Line2","Line3"]){
                        const pred = lines[line];
                        const avail = result.available_rakes[line];
                        let heatClass = '';
                        if (pred > avail) {
                            heatClass = 'demand-exceeded-cell';
                        } else if (pred >= 5) {
                            heatClass = 'demand-high';
                        } else if (pred >= 3) {
                            heatClass = 'demand-medium';
                        } else {
                            heatClass = 'demand-low';
                        }
                        scheduleHTML += `<td class="${heatClass}">${pred}</td>`;
                    }
                    scheduleHTML += `</tr>`;
                }
                scheduleHTML += `</tbody></table>`;
                resultsHTML += scheduleHTML;
            }

            // -----------------------------
            // Render all new content at once
            // -----------------------------
            document.getElementById("results").innerHTML = resultsHTML;

            // -----------------------------
            // Animate rakes on map
            // -----------------------------
            animateRakes(result.predictions);

        } else {
            document.getElementById("results").innerHTML = `<p style="color:red;">Error: ${result.error}</p>`;
        }

    } catch(err) {
        document.getElementById("results").innerHTML = `<p style="color:red;">Request failed: ${err}</p>`;
    }
});

function animateRakes(predictions) {
    // Clear all previous animation intervals to prevent memory leaks
    activeIntervals.forEach(clearInterval);
    activeIntervals = [];

    const trackInfo = {
        Line1: { top: 40, color: '#3498db' },
        Line2: { top: 100, color: '#2ecc71' },
        Line3: { top: 160, color: '#e67e22' }
    };

    const map = document.getElementById("metro-map");
    // Remove previous train elements from the map
    map.querySelectorAll(".train-container").forEach(el => el.remove());

    for (const [line, count] of Object.entries(predictions)) {
        if (count === 0) continue; // Skip if no rakes are predicted

        // Create a single container for the entire train
        const trainContainer = document.createElement("div");
        trainContainer.classList.add("train-container");
        
        // Center the train on the track line vertically (Car height is 24px)
        trainContainer.style.top = (trackInfo[line].top - 12 + 3) + "px";

        // Create and add the individual cars to the train
        for (let i = 0; i < count; i++) {
            const car = document.createElement("div");
            car.classList.add("train-car");
            car.textContent = i + 1; // Add the number
            
            // The first car is the engine
            if (i === 0) {
                car.classList.add("train-engine");
            }
            
            car.style.backgroundColor = trackInfo[line].color;
            trainContainer.appendChild(car);
        }

        map.appendChild(trainContainer);

        // Animate the entire train container as one unit
        // Calculate train width: (car width + margin) * number of cars
        const trainWidth = (40 + 4) * count; 
        const mapWidth = map.offsetWidth;
        let pos = -trainWidth; // Start fully off-screen to the left
        trainContainer.style.left = pos + "px";

        const intervalId = setInterval(() => {
            pos += 2; // Adjust for speed
            if (pos > mapWidth) {
                pos = -trainWidth; // Reset when off-screen to the right
            }
            trainContainer.style.left = pos + "px";
        }, 20);

        activeIntervals.push(intervalId);
    }
}
