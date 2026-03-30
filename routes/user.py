from io import BytesIO

from flask import Blueprint, Response, flash, redirect, render_template, request, session, url_for
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from extensions import db
from models import Order, OrderItem, Product, User
from utils import login_required

user_bp = Blueprint("user", __name__)


@user_bp.route("/")
def index():
    products = Product.query.all()
    return render_template("index.html", products=products)


@user_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "").strip()
        user = User.query.filter_by(email=email, password=password).first()
        if user:
            session["user_id"] = user.id
            session["user_name"] = user.name
            session["is_admin"] = user.is_admin
            flash("Login successful.", "success")
            if user.is_admin:
                return redirect(url_for("admin.admin_orders"))
            return redirect(url_for("user.index"))
        flash("Invalid credentials.", "danger")
    return render_template("login.html")


@user_bp.route("/logout")
def logout():
    session.clear()
    flash("Logged out.", "info")
    return redirect(url_for("user.login"))


@user_bp.route("/cart")
@login_required
def cart():
    cart_items = session.get("cart", [])
    grand_total = sum(item["subtotal"] for item in cart_items)
    return render_template("cart.html", cart_items=cart_items, grand_total=grand_total)


@user_bp.route("/add-to-cart", methods=["POST"])
@login_required
def add_to_cart():
    product_id = int(request.form.get("product_id"))
    weight = request.form.get("weight")
    quantity = int(request.form.get("quantity", 1))
    product = Product.query.get_or_404(product_id)

    price_map = {
        "250g": product.price_250g,
        "500g": product.price_500g,
        "750g": product.price_750g,
        "1kg": product.price_1kg,
    }
    unit_price = float(price_map[weight])
    subtotal = unit_price * quantity

    cart_items = session.get("cart", [])
    cart_items.append(
        {
            "product_id": product.id,
            "product_name": product.name,
            "weight": weight,
            "quantity": quantity,
            "price": unit_price,
            "subtotal": subtotal,
        }
    )
    session["cart"] = cart_items
    flash("Item added to cart.", "success")
    return redirect(url_for("user.index"))


@user_bp.route("/checkout", methods=["POST"])
@login_required
def checkout():
    cart_items = session.get("cart", [])
    if not cart_items:
        flash("Cart is empty.", "warning")
        return redirect(url_for("user.cart"))

    order = Order(
        user_id=session["user_id"],
        status="Placed",
        total_amount=sum(item["subtotal"] for item in cart_items),
    )
    db.session.add(order)
    db.session.flush()

    for item in cart_items:
        db.session.add(
            OrderItem(
                order_id=order.id,
                product_id=item["product_id"],
                product_name=item["product_name"],
                weight=item["weight"],
                quantity=item["quantity"],
                price=item["price"],
                subtotal=item["subtotal"],
            )
        )

    db.session.commit()
    session["cart"] = []
    flash("Order placed successfully.", "success")
    return redirect(url_for("user.my_orders"))


@user_bp.route("/orders")
@login_required
def my_orders():
    orders = Order.query.filter_by(user_id=session["user_id"]).order_by(Order.created_at.desc()).all()
    return render_template("user/orders.html", orders=orders)


@user_bp.route("/invoice/<int:order_id>")
@login_required
def invoice(order_id):
    order = Order.query.get_or_404(order_id)
    if order.user_id != session.get("user_id"):
        flash("You are not authorized to access this invoice.", "danger")
        return redirect(url_for("user.my_orders"))

    user = User.query.get(order.user_id)
    items = OrderItem.query.filter_by(order_id=order.id).all()

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("<b>Spice Store</b>", styles["Title"]))
    elements.append(Paragraph("123 Spice Street, Flavor City, India - 600001", styles["Normal"]))
    elements.append(Paragraph("Phone: +91 98765 43210 | Email: support@spicestore.com", styles["Normal"]))
    elements.append(Paragraph("GSTIN: 29ABCDE1234F1Z9", styles["Normal"]))
    elements.append(Spacer(1, 14))

    elements.append(Paragraph("<b>Invoice</b>", styles["Heading2"]))
    elements.append(Spacer(1, 8))

    elements.append(Paragraph(f"<b>Customer:</b> {user.name}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Email:</b> {user.email}", styles["Normal"]))
    elements.append(Spacer(1, 8))

    elements.append(Paragraph(f"<b>Order ID:</b> {order.id}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Date:</b> {order.created_at.strftime('%d-%m-%Y %H:%M')}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Status:</b> {order.status}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    data = [["Product Name", "Weight", "Quantity", "Price", "Subtotal"]]
    for item in items:
        data.append(
            [
                item.product_name,
                item.weight,
                str(item.quantity),
                f"Rs. {item.price:,.2f}",
                f"Rs. {item.subtotal:,.2f}",
            ]
        )

    table = Table(data, colWidths=[170, 70, 70, 90, 100])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2f3b52")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 16))
    elements.append(Paragraph(f"<b>Total Amount: Rs. {order.total_amount:,.2f}</b>", styles["Heading3"]))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Thank you for shopping with Spice Store!", styles["Normal"]))

    doc.build(elements)
    buffer.seek(0)

    return Response(
        buffer.getvalue(),
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment;filename=invoice_order_{order.id}.pdf"},
    )
