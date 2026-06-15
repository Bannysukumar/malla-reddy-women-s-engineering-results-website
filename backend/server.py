from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from scraper import infer_prefix
from results_service import (
    get_backlog_report,
    get_class_results,
    get_credits_compare,
    get_exam_hall_tickets,
    get_result_contrast,
    get_student_attendance,
    get_student_overall_result,
    get_student_results,
    get_student_semwise_marks,
    build_class_from_cache,
    assemble_class_from_individual_cache,
    finalize_class_result,
    filter_class_result_to_range,
    schedule_class_refresh,
    start_class_scrape,
    iter_class_scrape_events,
)
from firebase_cache import init_firebase, is_enabled, class_cache_key, get_cached_class, save_class_result
from admin_auth import authenticate_admin, decode_admin_token, require_admin, verify_admin_token
from admin_service import fetch_admin_stats, is_scrape_running, stream_bulk_scrape, stream_hard_scrape, is_hard_scrape_running
from cms_service import (
    create_admin_user,
    create_notification,
    delete_admin_user,
    delete_notification,
    get_footer_settings,
    list_admin_users,
    list_feedback,
    list_notifications,
    save_footer_settings,
    submit_feedback,
    update_admin_user,
    update_feedback_status,
    update_notification,
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


@app.route("/api/exam-hall-tickets/<hall_ticket>")
def get_exam_hall_tickets_route(hall_ticket):
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err

    try:
        data = get_exam_hall_tickets(hall_ticket, force_refresh=_force_refresh())
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch exam hall tickets: {exc}"}), 500

    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)


@app.route("/api/exam-hall-tickets", methods=["POST"])
def post_exam_hall_tickets():
    body = request.get_json(silent=True) or {}
    hall_ticket = body.get("hallTicket") or body.get("hall_ticket") or ""
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err
    return get_exam_hall_tickets_route(hall_ticket)


@app.route("/api/attendance/<hall_ticket>")
def get_attendance_route(hall_ticket):
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err

    try:
        data = get_student_attendance(hall_ticket, force_refresh=_force_refresh())
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch attendance: {exc}"}), 500

    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)


@app.route("/api/attendance", methods=["POST"])
def post_attendance():
    body = request.get_json(silent=True) or {}
    hall_ticket = body.get("hallTicket") or body.get("hall_ticket") or ""
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err
    return get_attendance_route(hall_ticket)


@app.route("/api/overall-result/<hall_ticket>")
def get_overall_result_route(hall_ticket):
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err

    try:
        data = get_student_overall_result(hall_ticket, force_refresh=_force_refresh())
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch overall result: {exc}"}), 500

    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)


@app.route("/api/overall-result", methods=["POST"])
def post_overall_result():
    body = request.get_json(silent=True) or {}
    hall_ticket = body.get("hallTicket") or body.get("hall_ticket") or ""
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err
    return get_overall_result_route(hall_ticket)


@app.route("/api/semwise-marks/<hall_ticket>")
def get_semwise_marks_route(hall_ticket):
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err

    try:
        data = get_student_semwise_marks(hall_ticket, force_refresh=_force_refresh())
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch semester-wise marks: {exc}"}), 500

    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)


@app.route("/api/semwise-marks", methods=["POST"])
def post_semwise_marks():
    body = request.get_json(silent=True) or {}
    hall_ticket = body.get("hallTicket") or body.get("hall_ticket") or ""
    hall_ticket, err = _validate_hall_ticket(hall_ticket)
    if err:
        return err
    return get_semwise_marks_route(hall_ticket)


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

    if not force_refresh and is_enabled():
        cached_class = get_cached_class(cache_key)
        if cached_class:
            data = filter_class_result_to_range(dict(cached_class["data"]), prefix, start_roll, end_roll, roll_digits)
            if data.get("scrapeStatus") == "in_progress":
                start_class_scrape(prefix, start_roll, end_roll, roll_digits, delay_sec, force_refresh=force_refresh)
                for event in iter_class_scrape_events(cache_key):
                    yield emit(event)
                return
            if "_meta" not in data:
                data["_meta"] = {
                    "source": "firebase",
                    "cached": True,
                    "cachedAt": cached_class.get("updatedAt"),
                }
            yield emit({"type": "done", "result": data, "cached": True, "instant": True})
            schedule_class_refresh(prefix, start_roll, end_roll, roll_digits, delay_sec)
            return

        assembled = build_class_from_cache(prefix, start_roll, end_roll, roll_digits)
        if assembled:
            save_class_result(cache_key, assembled)
            assembled["_meta"] = {"source": "firebase", "cached": True}
            yield emit({"type": "done", "result": assembled, "cached": True, "instant": True})
            schedule_class_refresh(prefix, start_roll, end_roll, roll_digits, delay_sec)
            return

        partial = assemble_class_from_individual_cache(prefix, start_roll, end_roll, roll_digits)
        if partial["resolvedCount"] > 0 and partial["missingCount"] > 0:
            snapshot = finalize_class_result(
                partial["students"], partial["failed"], prefix, start_roll, end_roll, roll_digits
            )
            snapshot["scrapeStatus"] = "in_progress"
            snapshot["scrapeProgress"] = {
                "current": partial["resolvedCount"],
                "total": partial["total"],
                "remaining": partial["missingCount"],
                "cachedCount": partial["cachedCount"],
                "hallTicket": None,
            }
            save_class_result(cache_key, snapshot)
            yield emit({
                "type": "partial",
                "result": snapshot,
                "cachedCount": partial["cachedCount"],
                "remaining": partial["missingCount"],
            })

    start_class_scrape(prefix, start_roll, end_roll, roll_digits, delay_sec, force_refresh=force_refresh)

    for event in iter_class_scrape_events(cache_key):
        yield emit(event)


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


@app.route("/api/notifications", methods=["GET"])
def public_notifications():
    try:
        return jsonify({"items": list_notifications(published_only=True)})
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


@app.route("/api/admin/scrape/<job_type>", methods=["POST"])
@require_admin
def admin_bulk_scrape(job_type):
    if is_scrape_running(job_type):
        return jsonify({"error": f"{job_type} scrape already running"}), 409
    return Response(
        stream_bulk_scrape(job_type),
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


@app.route("/api/admin/notifications", methods=["GET"])
@require_admin
def admin_notifications_list():
    try:
        return jsonify({"items": list_notifications(published_only=False)})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/notifications", methods=["POST"])
@require_admin
def admin_notifications_create():
    body = request.get_json(silent=True) or {}
    try:
        return jsonify(create_notification(
            body.get("title") or "",
            body.get("body") or "",
            published=bool(body.get("published", True)),
            link=body.get("link") or "",
        )), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/notifications/<notification_id>", methods=["PATCH"])
@require_admin
def admin_notifications_update(notification_id):
    body = request.get_json(silent=True) or {}
    try:
        return jsonify(update_notification(
            notification_id,
            title=body.get("title"),
            body=body.get("body"),
            published=body.get("published") if "published" in body else None,
            link=body.get("link"),
        ))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/admin/notifications/<notification_id>", methods=["DELETE"])
@require_admin
def admin_notifications_delete(notification_id):
    try:
        delete_notification(notification_id)
        return jsonify({"ok": True})
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
