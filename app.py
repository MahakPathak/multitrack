from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from asgiref.wsgi import WsgiToAsgi
import random

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

# Convert Flask → ASGI for uvicorn deployment
asgi_app = WsgiToAsgi(app)


@app.route("/")
def home():
    return render_template("index.html")   # serve frontend


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No input data received"}), 400

        # -----------------------------
        # Extract input features
        # -----------------------------
        dow = data.get("dow", 0)
        month = data.get("month", 1)
        is_weekend = data.get("is_weekend", 0)
        is_holiday = data.get("is_holiday", 0)
        special_event = data.get("special_event", 0)
        # NEW, more robust code
        temp = data.get("temp")
        if temp is None:
            temp = 28.0

        # -----------------------------
        # Dynamic synthetic predictions
        # -----------------------------
        base_line_demands = {"Line1": 3, "Line2": 2, "Line3": 2}

        multiplier = 1
        if is_weekend:
            multiplier += 0.5
        if is_holiday:
            multiplier += 0.7
        if special_event:
            multiplier += 0.8
        if temp > 35 or temp < 15:
            multiplier -= 0.2

        predicted_demands = {
            line: max(1, int(round(base * multiplier)))
            for line, base in base_line_demands.items()
        }

        # -----------------------------
        # Available rakes (demo)
        # -----------------------------
        available_rakes = {"Line1": 5, "Line2": 5, "Line3": 5}

        # -----------------------------
        # Allocation plan
        # -----------------------------
        allocation_plan = {
            line: min(pred, available_rakes[line])
            for line, pred in predicted_demands.items()
        }

        # -----------------------------
        # Total demand
        # -----------------------------
        total_demand = sum(predicted_demands.values())

        # -----------------------------
        # Alerts
        # -----------------------------
        alerts = []
        for line, pred in predicted_demands.items():
            if pred > available_rakes[line]:
                alerts.append(
                    f"{line} demand exceeds available rakes by {pred - available_rakes[line]}"
                )

        # -----------------------------
        # Dynamic Hourly Schedule
        # -----------------------------
        hourly_schedule = {}
        hours = range(6, 23)  # 6AM to 10PM
        for hour in hours:
            # Rush hours: 7–10AM and 5–8PM
            rush_multiplier = 1.5 if (7 <= hour <= 10 or 17 <= hour <= 20) else 1.0

            # Weekend/Holiday adjustment
            wh_multiplier = 0.8 if (is_weekend or is_holiday) else 1.0

            # Temperature adjustment
            temp_multiplier = 0.9 if temp > 35 or temp < 15 else 1.0

            # Combine multipliers
            hour_factor = rush_multiplier * wh_multiplier * temp_multiplier

            # Small random variation (+/- 10%)
            hourly_schedule[f"{hour}:00"] = {
                line: max(
                    1,
                    int(predicted_demands[line] * hour_factor * random.uniform(0.9, 1.1))
                )
                for line in predicted_demands
            }

        return jsonify({
            "status": "success",
            "predictions": predicted_demands,
            "total_demand": total_demand,
            "available_rakes": available_rakes,
            "allocation_plan": allocation_plan,
            "alerts": alerts,
            "hourly_schedule": hourly_schedule
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, debug=True)
