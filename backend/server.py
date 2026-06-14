from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from scraper import (
    infer_prefix,
    USER_AGENT,
    _fetch_marks,
    build_hall_ticket,
)
from results_service import (
    get_backlog_report,
    get_class_results,
    get_credits_compare,
    get_result_contrast,
    get_student_results,
    resolve_class_student,
    build_class_from_cache,
    finalize_class_result,
    schedule_class_refresh,
)
from firebase_cache import init_firebase, is_enabled, class_cache_key, get_cached_class, get_cached_result, save_class_result, save_result
from admin_auth import authenticate_admin, decode_admin_token, require_admin, verify_admin_token
from admin_service import fetch_admin_stats, is_hard_scrape_running, stream_hard_scrape
from cms_service import (
    create_admin_user,
    delete_admin_user,
    get_footer_settings,
    list_admin_users,
    list_feedback,
    save_footer_settings,
    submit_feedback,
    update_admin_user,
    update_feedback_status,
)
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

def _resolve_frontend_dist():
    env_path = os.environ.get("FRONTEND_DIST")
    if env_path and os.path.isdir(env_path):
        return env_path
    for candidate in (
        os.path.join(BASE_DIR, "frontend", "dist"),
        os.path.join(ROOT_DIR, "frontend", "dist"),
    ):
        if os.path.isdir(candidate):
            return candidate
    return None


PUBLIC = _resolve_frontend_dist()
MAX_CLASS_RANGE = 70

app = Flask(__name__)

init_firebase()

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")
if allowed_origins == "*":
    CORS(app)
else:
    CORS(app, origins=[o.strip() for o in allowed_origins.split(",") if o.strip()])


@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "mrecw-connect-api",
        "firebaseCache": is_enabled(),
    })


@app.route("/")
def index():
    if PUBLIC and os.path.isfile(os.path.join(PUBLIC, "index.html")):
        return send_from_directory(PUBLIC, "index.html")
    return jsonify({"service": "mrecw-connect-api", "status": "ok"})


def _validate_hall_ticket(hall_ticket: str):
    hall_ticket = (hall_ticket or "").strip().upper()
    if not hall_ticket:
        return None, (jsonify({"error": "Hall ticket required"}), 400)
    if len(hall_ticket) < 6 or len(hall_ticket) > 20:
        return None, (jsonify({"error": "Invalid hall ticket format"}), 400)
    return hall_ticket, None


def _force_refresh() -> bool:
    value = request.args.get("refresh") or request.args.get("forceRefresh")
    if value and str(value).lower() in ("1", "true", "yes"):
        return True
    body = request.get_json(silent=True) or {}
    value = body.get("refresh") or body.get("forceRefresh")
    return bool(value and str(value).lower() in ("1", "true", "yes", True))


@app.route("/api/results/<hall_ticket>")
def get_results(hall_ticket):
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err

    try:
        data = get_student_results(hall_ticket, force_refresh=_force_refresh())
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch results: {exc}"}), 500

    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)


@app.route("/api/results", methods=["POST"])
def post_results():
    body = request.get_json(silent=True) or {}
    hall_ticket = body.get("hallTicket") or body.get("hall_ticket") or ""
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err
    return get_results(hall_ticket)


@app.route("/api/backlog-report/<hall_ticket>")
def get_backlog_report_route(hall_ticket):
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err

    try:
        data = get_backlog_report(hall_ticket, force_refresh=_force_refresh())
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch backlog report: {exc}"}), 500

    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)


@app.route("/api/backlog-report", methods=["POST"])
def post_backlog_report():
    body = request.get_json(silent=True) or {}
    hall_ticket = body.get("hallTicket") or body.get("hall_ticket") or ""
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err
    return get_backlog_report_route(hall_ticket)


@app.route("/api/result-contrast", methods=["POST"])
def post_result_contrast():
    body = request.get_json(silent=True) or {}
    ticket_a = (body.get("hallTicketA") or body.get("firstHallTicket") or body.get("ticketA") or "").strip().upper()
    ticket_b = (body.get("hallTicketB") or body.get("secondHallTicket") or body.get("ticketB") or "").strip().upper()

    ticket_a, err = _validate_hall_ticket(ticket_a)
    if err:
        return err
    ticket_b, err = _validate_hall_ticket(ticket_b)
    if err:
        return err

    if ticket_a == ticket_b:
        return jsonify({"error": "Enter two different hall tickets to compare"}), 400

    try:
        data = get_result_contrast(ticket_a, ticket_b, force_refresh=_force_refresh())
    except Exception as exc:
        return jsonify({"error": f"Failed to compare results: {exc}"}), 500

    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)


@app.route("/api/credits-compare", methods=["POST"])
def post_credits_compare():
    body = request.get_json(silent=True) or {}
    ticket_a = (body.get("hallTicketA") or body.get("firstHallTicket") or body.get("ticketA") or "").strip().upper()
    ticket_b = (body.get("hallTicketB") or body.get("secondHallTicket") or body.get("ticketB") or "").strip().upper()

    ticket_a, err = _validate_hall_ticket(ticket_a)
    if err:
        return err
    ticket_b, err = _validate_hall_ticket(ticket_b)
    if err:
        return err

    if ticket_a == ticket_b:
        return jsonify({"error": "Enter two different hall tickets to compare credits"}), 400

    try:
        data = get_credits_compare(ticket_a, ticket_b, force_refresh=_force_refresh())
    except Exception as exc:
        return jsonify({"error": f"Failed to compare credits: {exc}"}), 500

    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)


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
            _stream_class_results(prefix, start_roll, end_roll, roll_digits, delay_sec, _force_refresh()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    try:
        data = get_class_results(
            prefix, start_roll, end_roll, roll_digits, delay_sec, force_refresh=_force_refresh()
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch class results: {exc}"}), 500

    return jsonify(data)


def _stream_class_results(prefix, start_roll, end_roll, roll_digits, delay_sec, force_refresh=False):
    def emit(payload):
        return f"data: {json.dumps(payload)}\n\n"

    init_firebase()
    cache_key = class_cache_key(prefix, start_roll, end_roll, roll_digits)
    total = end_roll - start_roll + 1

    if not force_refresh and is_enabled():
        cached_class = get_cached_class(cache_key)
        if cached_class:
            result = dict(cached_class["data"])
            if "_meta" not in result:
                result["_meta"] = {
                    "source": "firebase",
                    "cached": True,
                    "cachedAt": cached_class.get("updatedAt"),
                }
            yield emit({"type": "done", "result": result, "cached": True, "instant": True})
            schedule_class_refresh(prefix, start_roll, end_roll, roll_digits, delay_sec)
            return

        assembled = build_class_from_cache(prefix, start_roll, end_roll, roll_digits)
        if assembled:
            save_class_result(cache_key, assembled)
            assembled["_meta"] = {"source": "firebase", "cached": True}
            yield emit({"type": "done", "result": assembled, "cached": True, "instant": True})
            schedule_class_refresh(prefix, start_roll, end_roll, roll_digits, delay_sec)
            return

    yield emit({"type": "start", "total": total, "prefix": prefix})

    students = []
    failed = []
    tickets = [build_hall_ticket(prefix, roll, roll_digits) for roll in range(start_roll, end_roll + 1)]

    import time
    from playwright.sync_api import sync_playwright

    all_cached = not force_refresh and is_enabled()
    if all_cached:
        for ticket in tickets:
            cached = get_cached_result(ticket) if is_enabled() else None
            if not cached:
                all_cached = False
                break

    if all_cached:
        for index, ticket in enumerate(tickets):
            student = resolve_class_student(ticket, force_refresh=False)
            yield emit({
                "type": "progress",
                "current": index + 1,
                "total": len(tickets),
                "hallTicket": ticket,
                "cached": True,
            })
            if "error" in student:
                failed.append({"hallTicket": ticket, "error": student["error"]})
                yield emit({"type": "failed", "student": {"hallTicket": ticket, "error": student["error"]}})
            else:
                students.append(student)
                yield emit({"type": "student", "student": student, "cached": True})
    else:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(user_agent=USER_AGENT)
            page = context.new_page()

            try:
                for index, ticket in enumerate(tickets):
                    if index > 0:
                        time.sleep(delay_sec)
                        context.clear_cookies()

                    yield emit({
                        "type": "progress",
                        "current": index + 1,
                        "total": len(tickets),
                        "hallTicket": ticket,
                    })

                    if not force_refresh and is_enabled():
                        cached = resolve_class_student(ticket, force_refresh=False)
                        if "error" not in cached:
                            students.append(cached)
                            yield emit({"type": "student", "student": cached, "cached": True})
                            continue

                    try:
                        data = _fetch_marks(page, ticket, summary_only=True)
                        if "error" in data:
                            failed.append({"hallTicket": ticket, "error": data["error"]})
                            yield emit({"type": "failed", "student": {"hallTicket": ticket, "error": data["error"]}})
                        else:
                            if is_enabled():
                                save_result(ticket, data)
                            students.append(data)
                            yield emit({"type": "student", "student": data})
                    except Exception as exc:
                        item = {"hallTicket": ticket, "error": str(exc)}
                        failed.append(item)
                        yield emit({"type": "failed", "student": item})
            finally:
                browser.close()

    result = finalize_class_result(students, failed, prefix, start_roll, end_roll, roll_digits)
    if is_enabled():
        save_class_result(cache_key, result)
    result["_meta"] = {"source": "scraped_and_cached" if is_enabled() else "scraped", "cached": False}
    yield emit({"type": "done", "result": result})


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    token = authenticate_admin(username, password)
    if not token:
        return jsonify({"error": "Invalid admin credentials"}), 401
    payload = decode_admin_token(token) or {}
    return jsonify({"token": token, "username": payload.get("sub") or username, "role": payload.get("role") or "admin"})


@app.route("/api/feedback", methods=["POST"])
def public_feedback():
    body = request.get_json(silent=True) or {}
    message = body.get("message") or ""
    try:
        result = submit_feedback(message)
        return jsonify(result), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/settings/footer", methods=["GET"])
def public_footer_settings():
    try:
        return jsonify(get_footer_settings())
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/verify", methods=["GET"])
def admin_verify():
    auth = request.headers.get("Authorization") or request.headers.get("X-Admin-Token")
    payload = decode_admin_token(auth)
    if not payload:
        return jsonify({"valid": False}), 401
    return jsonify({"valid": True, "username": payload.get("sub"), "role": payload.get("role")})


@app.route("/api/admin/stats", methods=["GET"])
@require_admin
def admin_stats():
    try:
        return jsonify(fetch_admin_stats())
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/hard-scrape", methods=["POST"])
@require_admin
def admin_hard_scrape():
    if is_hard_scrape_running():
        return jsonify({"error": "Hard scrape already running"}), 409
    return Response(
        stream_hard_scrape(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.route("/api/admin/feedback", methods=["GET"])
@require_admin
def admin_feedback_list():
    try:
        return jsonify({"items": list_feedback()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/feedback/<feedback_id>", methods=["PATCH"])
@require_admin
def admin_feedback_update(feedback_id):
    body = request.get_json(silent=True) or {}
    status = body.get("status") or ""
    try:
        return jsonify(update_feedback_status(feedback_id, status))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/users", methods=["GET"])
@require_admin
def admin_users_list():
    try:
        return jsonify({"items": list_admin_users()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/users", methods=["POST"])
@require_admin
def admin_users_create():
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    role = (body.get("role") or "admin").strip()
    try:
        return jsonify(create_admin_user(username, password, role)), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/users/<user_id>", methods=["PATCH"])
@require_admin
def admin_users_update(user_id):
    body = request.get_json(silent=True) or {}
    try:
        return jsonify(update_admin_user(
            user_id,
            role=body.get("role"),
            active=body.get("active") if "active" in body else None,
            password=body.get("password") or None,
        ))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/users/<user_id>", methods=["DELETE"])
@require_admin
def admin_users_delete(user_id):
    try:
        delete_admin_user(user_id)
        return jsonify({"ok": True})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/settings/footer", methods=["GET"])
@require_admin
def admin_footer_get():
    try:
        return jsonify(get_footer_settings())
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/settings/footer", methods=["PUT"])
@require_admin
def admin_footer_save():
    body = request.get_json(silent=True) or {}
    sections = body.get("sections")
    if not isinstance(sections, list):
        return jsonify({"error": "sections must be an array"}), 400
    try:
        return jsonify(save_footer_settings(body))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


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
