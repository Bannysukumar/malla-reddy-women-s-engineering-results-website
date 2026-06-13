from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from scraper import fetch_class_results, infer_prefix, login_and_fetch_marks
import json
import os

BASE_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.dirname(BASE_DIR)
FRONTEND_DIST = os.path.join(ROOT_DIR, "frontend", "dist")
PUBLIC = FRONTEND_DIST if os.path.isdir(FRONTEND_DIST) else None
MAX_CLASS_RANGE = 70

app = Flask(__name__)

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")
if allowed_origins == "*":
    CORS(app)
else:
    CORS(app, origins=[o.strip() for o in allowed_origins.split(",") if o.strip()])


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "mrecw-connect-api"})


@app.route("/")
def index():
    if PUBLIC and os.path.isfile(os.path.join(PUBLIC, "index.html")):
        return send_from_directory(PUBLIC, "index.html")
    return jsonify({"service": "mrecw-connect-api", "status": "ok"})


@app.route("/api/results/<hall_ticket>")
def get_results(hall_ticket):
    hall_ticket = hall_ticket.strip().upper()
    if not hall_ticket:
        return jsonify({"error": "Hall ticket required"}), 400
    if len(hall_ticket) < 6 or len(hall_ticket) > 20:
        return jsonify({"error": "Invalid hall ticket format"}), 400

    try:
        data = login_and_fetch_marks(hall_ticket)
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch results: {exc}"}), 500

    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)


@app.route("/api/results", methods=["POST"])
def post_results():
    body = request.get_json(silent=True) or {}
    hall_ticket = (body.get("hallTicket") or "").strip().upper()
    if not hall_ticket:
        return jsonify({"error": "Hall ticket required"}), 400
    return get_results(hall_ticket)


@app.route("/api/class-results", methods=["POST"])
def post_class_results():
    body = request.get_json(silent=True) or {}
    prefix = (body.get("prefix") or "").strip().upper()
    sample_ticket = (body.get("sampleTicket") or "").strip().upper()
    roll_digits = int(body.get("rollDigits") or 2)
    start_roll = int(body.get("startRoll") or 1)
    end_roll = int(body.get("endRoll") or 60)
    delay_sec = float(body.get("delaySec") or 1.5)
    stream = bool(body.get("stream"))

    if not prefix and sample_ticket:
        prefix = infer_prefix(sample_ticket, roll_digits)

    if not prefix:
        return jsonify({"error": "Section prefix or sample hall ticket required"}), 400

    if roll_digits not in (2, 3, 4):
        return jsonify({"error": "rollDigits must be 2, 3, or 4"}), 400

    if start_roll < 1 or end_roll < start_roll:
        return jsonify({"error": "Invalid roll range"}), 400

    count = end_roll - start_roll + 1
    if count > MAX_CLASS_RANGE:
        return jsonify({"error": f"Maximum {MAX_CLASS_RANGE} students per request"}), 400

    if stream:
        return Response(
            _stream_class_results(prefix, start_roll, end_roll, roll_digits, delay_sec),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    try:
        data = fetch_class_results(
            prefix, start_roll, end_roll, roll_digits, delay_sec, summary_only=True
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch class results: {exc}"}), 500

    return jsonify(data)


def _stream_class_results(prefix, start_roll, end_roll, roll_digits, delay_sec):
    def emit(payload):
        return f"data: {json.dumps(payload)}\n\n"

    yield emit({"type": "start", "total": end_roll - start_roll + 1, "prefix": prefix})

    students = []
    failed = []

    import time
    from playwright.sync_api import sync_playwright
    from scraper import USER_AGENT, _fetch_marks, build_hall_ticket

    tickets = [
        build_hall_ticket(prefix, roll, roll_digits)
        for roll in range(start_roll, end_roll + 1)
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT)
        page = context.new_page()

        try:
            for index, ticket in enumerate(tickets):
                if index > 0:
                    time.sleep(delay_sec)
                    context.clear_cookies()

                yield emit(
                    {
                        "type": "progress",
                        "current": index + 1,
                        "total": len(tickets),
                        "hallTicket": ticket,
                    }
                )

                try:
                    data = _fetch_marks(page, ticket, summary_only=True)
                    if "error" in data:
                        failed.append({"hallTicket": ticket, "error": data["error"]})
                        yield emit({"type": "failed", "student": {"hallTicket": ticket, "error": data["error"]}})
                    else:
                        students.append(data)
                        yield emit({"type": "student", "student": data})
                except Exception as exc:
                    item = {"hallTicket": ticket, "error": str(exc)}
                    failed.append(item)
                    yield emit({"type": "failed", "student": item})
        finally:
            browser.close()

    students.sort(key=lambda row: float(row.get("cgpa") or 0), reverse=True)
    cgpa_values = [float(s["cgpa"]) for s in students if s.get("cgpa")]
    class_avg = round(sum(cgpa_values) / len(cgpa_values), 2) if cgpa_values else None

    yield emit(
        {
            "type": "done",
            "result": {
                "prefix": prefix,
                "startRoll": start_roll,
                "endRoll": end_roll,
                "rollDigits": roll_digits,
                "totalAttempted": len(tickets),
                "successCount": len(students),
                "failedCount": len(failed),
                "classAverageCgpa": class_avg,
                "students": students,
                "failed": failed,
            },
        }
    )


@app.route("/<path:path>")
def spa_fallback(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    if not PUBLIC:
        return jsonify({"error": "Not found"}), 404
    file_path = os.path.join(PUBLIC, path)
    if os.path.isfile(file_path):
        return send_from_directory(PUBLIC, path)
    if os.path.isfile(os.path.join(PUBLIC, "index.html")):
        return send_from_directory(PUBLIC, "index.html")
    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug, threaded=True)
