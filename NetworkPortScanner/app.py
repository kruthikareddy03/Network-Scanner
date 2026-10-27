
from flask import Flask, render_template, request, jsonify
import socket
import time

app = Flask(__name__)

# This educational version scans only your own computer.
ALLOWED_TARGETS = {"127.0.0.1", "localhost"}
MAX_PORTS = 50
TIMEOUT = 0.4

SERVICES = {
    21: "FTP",
    22: "SSH",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    143: "IMAP",
    443: "HTTPS",
    445: "SMB",
    3306: "MySQL",
    5000: "Flask",
    5432: "PostgreSQL",
    8080: "HTTP Alternate"
}


def scan_port(host, port):
    try:
        with socket.socket(
            socket.AF_INET, socket.SOCK_STREAM
        ) as sock:
            sock.settimeout(TIMEOUT)
            result = sock.connect_ex((host, port))

        if result == 0:
            status = "Open"
        elif result in (10061, 111):
            status = "Closed"
        else:
            status = "Filtered / Unresponsive"

    except OSError:
        status = "Filtered / Unresponsive"

    return {
        "port": port,
        "service": SERVICES.get(port, "Unknown"),
        "status": status
    }


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/scan", methods=["POST"])
def scan():
    data = request.get_json(silent=True) or {}
    target = str(data.get("target", "")).strip().lower()

    if target not in ALLOWED_TARGETS:
        return jsonify({
            "error": "Use localhost or 127.0.0.1 only."
        }), 400

    try:
        start = int(data.get("start_port"))
        end = int(data.get("end_port"))
    except (TypeError, ValueError):
        return jsonify({
            "error": "Enter valid port numbers."
        }), 400

    if not (1 <= start <= 65535 and 1 <= end <= 65535):
        return jsonify({
            "error": "Ports must be between 1 and 65535."
        }), 400

    if end < start:
        return jsonify({
            "error": "End port must be greater than or equal to start port."
        }), 400

    if end - start + 1 > MAX_PORTS:
        return jsonify({
            "error": "You can scan a maximum of 50 ports per scan."
        }), 400

    results = []
    started = time.perf_counter()

    for port in range(start, end + 1):
        results.append(scan_port("127.0.0.1", port))

    duration = round(time.perf_counter() - started, 2)

    return jsonify({
        "target": target,
        "results": results,
        "total": len(results),
        "open": sum(r["status"] == "Open" for r in results),
        "closed": sum(r["status"] == "Closed" for r in results),
        "unresponsive": sum(
            r["status"] == "Filtered / Unresponsive"
            for r in results
        ),
        "duration": duration
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
