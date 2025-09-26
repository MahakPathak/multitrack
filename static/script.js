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
            // Show Predicted Rakes Table
            // -----------------------------
            let tableHTML = `<table>
                <tr><th>Line</th><th>Predicted Rakes</th><th>Available Rakes</th></tr>`;
            for(const line of Object.keys(result.predictions)) {
                const pred = result.predictions[line];
                const avail = result.available_rakes[line];
                tableHTML += `<tr${pred > avail ? ' style="background:#fdd;"' : ''}>
                                <td>${line}</td>
                                <td>${pred}</td>
                                <td>${avail}</td>
                              </tr>`;
            }
            tableHTML += `</table>`;
            document.getElementById("results").innerHTML = tableHTML;

            // -----------------------------
            // Show total demand
            // -----------------------------
            const totalHTML = `<p><strong>Total Demand:</strong> ${result.total_demand}</p>`;
            document.getElementById("results").innerHTML += totalHTML;

            // -----------------------------
            // Show alerts
            // -----------------------------
            if(result.alerts.length > 0){
                let alertHTML = `<p style="color:red;"><strong>Alerts:</strong><br>`;
                alertHTML += result.alerts.join("<br>");
                alertHTML += `</p>`;
                document.getElementById("results").innerHTML += alertHTML;
            }

            // -----------------------------
            // Show Hourly Schedule
            // -----------------------------
            if(result.hourly_schedule){
                let scheduleHTML = `<h3>Hourly Schedule (Predicted Rakes)</h3>`;
                scheduleHTML += `<table><tr><th>Hour</th><th>Line1</th><th>Line2</th><th>Line3</th></tr>`;
                for(const [hour, lines] of Object.entries(result.hourly_schedule)){
                    scheduleHTML += `<tr>`;
                    scheduleHTML += `<td>${hour}</td>`;
                    for(const line of ["Line1","Line2","Line3"]){
                        const pred = lines[line];
                        const avail = result.available_rakes[line];
                        scheduleHTML += `<td${pred > avail ? ' style="background:#fdd;"' : ''}>${pred}</td>`;
                    }
                    scheduleHTML += `</tr>`;
                }
                scheduleHTML += `</table>`;
                document.getElementById("results").innerHTML += scheduleHTML;
            }

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
    const trackInfo = {
        Line1: {top: 40, color:'#0077cc'},
        Line2: {top: 100, color:'#00aa44'},
        Line3: {top: 160, color:'#cc7700'}
    };

    // Remove previous rakes
    document.querySelectorAll(".rake").forEach(el => el.remove());

    for(const [line, count] of Object.entries(predictions)) {
        const spacing = 500 / Math.max(count, 1);
        for(let i = 0; i < count; i++) {
            const rake = document.createElement("div");
            rake.classList.add("rake");
            rake.style.background = trackInfo[line].color;
            rake.style.top = (trackInfo[line].top - 6) + "px";
            rake.style.left = (-40 - i*spacing) + "px";
            document.getElementById("metro-map").appendChild(rake);

            let pos = -40 - i*spacing;
            setInterval(() => {
                pos += 2;
                if(pos > 530) pos = -40;
                rake.style.left = pos + "px";
            }, 30);
        }
    }
}
