import os
from pathlib import Path

from flask import Flask

from extensions import db
from models import Product, User
from routes.admin import admin_bp
from routes.user import user_bp


def create_app():
    app = Flask(__name__)
    # Use DATABASE_URL in production (for persistent SQLite), fallback to local dev DB.
    if os.environ.get("DATABASE_URL"):
        app.config["SQLALCHEMY_DATABASE_URI"] = os.environ["DATABASE_URL"]
    else:
        # Store SQLite in Flask's `instance/` directory by default.
        db_file = Path(app.instance_path) / "spice_store.db"
        db_file.parent.mkdir(parents=True, exist_ok=True)
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_file.resolve().as_posix()}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    # Don't hardcode secrets in production.
    app.secret_key = os.environ.get("SECRET_KEY", "spice-store-secret-key")

    db.init_app(app)
    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)

    with app.app_context():
        db.create_all()
        seed_data()

    return app


def seed_data():
    if User.query.count() == 0:
        db.session.add(
            User(
                name="Admin User",
                email="admin@spice.com",
                password="admin123",
                is_admin=True,
            )
        )
        db.session.add(
            User(
                name="Demo User",
                email="user@spice.com",
                password="user123",
                is_admin=False,
            )
        )

    if Product.query.count() == 0:
        db.session.add(
            Product(
                name="Pepper",
                price_250g=120,
                price_500g=230,
                price_750g=340,
                price_1kg=450,
            )
        )
        db.session.add(
            Product(
                name="Cardamom",
                price_250g=300,
                price_500g=580,
                price_750g=860,
                price_1kg=1120,
            )
        )

    db.session.commit()


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
