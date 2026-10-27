
const form = document.getElementById("scanForm");
const button = document.getElementById("scanButton");
const message = document.getElementById("message");
const resultsBody = document.getElementById("resultsBody");

function showMessage(text, type = "") {
    message.textContent = text;
    message.className = type;
}

function resetResults() {
    ["totalCount", "openCount", "closedCount",
     "unresponsiveCount"].forEach(id => {
        document.getElementById(id).textContent = "—";
    });

    document.getElementById("scanInfo").textContent =
        "Run a scan to see the results.";

    resultsBody.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "empty";
    cell.textContent = "No scan results yet.";
    row.appendChild(cell);
    resultsBody.appendChild(row);
}

function displayResults(data) {
    document.getElementById("totalCount").textContent = data.total;
    document.getElementById("openCount").textContent = data.open;
    document.getElementById("closedCount").textContent = data.closed;
    document.getElementById("unresponsiveCount").textContent =
        data.unresponsive;

    document.getElementById("scanInfo").textContent =
        `Target: ${data.target} | Duration: ${data.duration}s`;

    resultsBody.replaceChildren();

    data.results.forEach(item => {
        const row = document.createElement("tr");

        const port = document.createElement("td");
        port.textContent = item.port;

        const service = document.createElement("td");
        service.textContent = item.service;

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "status";

        if (item.status === "Open") {
            badge.classList.add("status-open");
        } else if (item.status === "Closed") {
            badge.classList.add("status-closed");
        } else {
            badge.classList.add("status-unresponsive");
        }

        badge.textContent = item.status;
        statusCell.appendChild(badge);

        row.append(port, service, statusCell);
        resultsBody.appendChild(row);
    });
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    const target = document.getElementById("target").value.trim();
    const start = Number(document.getElementById("startPort").value);
    const end = Number(document.getElementById("endPort").value);

    if (!Number.isInteger(start) || !Number.isInteger(end) ||
        start < 1 || end > 65535 || end < start) {
        showMessage("Enter a valid port range.", "error");
        return;
    }

    if (end - start + 1 > 50) {
        showMessage("Scan a maximum of 50 ports at a time.", "error");
        return;
    }

    button.disabled = true;
    button.textContent = "Scanning...";
    resetResults();
    showMessage("Scanning your local computer...");

    try {
        const response = await fetch("/scan", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                target: target,
                start_port: start,
                end_port: end
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Scan failed.");
        }

        displayResults(data);
        showMessage(
            `Scan completed! Checked ${data.total} ports.`,
            "success"
        );
    } catch (error) {
        showMessage(error.message || "Unable to contact the server.", "error");
    } finally {
        button.disabled = false;
        button.textContent = "▶ Start Scan";
    }
});

document.getElementById("resetButton").addEventListener("click", () => {
    form.reset();
    resetResults();
    showMessage("");
});

resetResults();
