from functools import wraps

from flask import flash, redirect, session, url_for


def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            flash("Please login first.", "warning")
            return redirect(url_for("user.login"))
        return func(*args, **kwargs)

    return wrapper


def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not session.get("user_id") or not session.get("is_admin"):
            flash("Admin access required.", "danger")
            return redirect(url_for("user.index"))
        return func(*args, **kwargs)

    return wrapper
