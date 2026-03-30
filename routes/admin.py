from flask import Blueprint, flash, redirect, render_template, request, url_for

from extensions import db
from models import Order, Product
from utils import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


@admin_bp.route("/orders")
@admin_required
def admin_orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return render_template("admin/orders.html", orders=orders)


@admin_bp.route("/orders/<int:order_id>/status", methods=["POST"])
@admin_required
def update_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    order.status = request.form.get("status", order.status)
    db.session.commit()
    flash("Order status updated.", "success")
    return redirect(url_for("admin.admin_orders"))


@admin_bp.route("/products")
@admin_required
def admin_products():
    products = Product.query.all()
    return render_template("admin/products.html", products=products)
