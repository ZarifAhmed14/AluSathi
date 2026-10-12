"""Count historical days flagged by the app's two-consecutive-day Hutton rule."""

from collections import defaultdict
from datetime import date, timedelta

import requests


SITES = {"Dinajpur": (25.63, 88.64), "Rangpur": (25.75, 89.25)}
START, END = "2025-10-01", "2026-04-30"
API = "https://archive-api.open-meteo.com/v1/archive"


def flagged_days(hourly):
    dates = hourly["time"]
    temperatures = hourly["temperature_2m"]
    humidities = hourly["relative_humidity_2m"]
    if not (len(dates) == len(temperatures) == len(humidities)):
        raise ValueError("Hourly arrays have different lengths")
    days = defaultdict(lambda: {"hours": 0, "minimum": float("inf"), "humid_hours": 0})
    for time, temperature, humidity in zip(dates, temperatures, humidities):
        if temperature is None or humidity is None:
            continue
        day = days[time[:10]]
        day["hours"] += 1
        day["minimum"] = min(day["minimum"], temperature)
        day["humid_hours"] += humidity >= 90
    qualifies = {day for day, values in days.items() if values["hours"] == 24 and values["minimum"] >= 10 and values["humid_hours"] >= 6}
    complete = {day for day, values in days.items() if values["hours"] == 24}
    eligible = {day for day in complete if all((date.fromisoformat(day) + timedelta(days=offset)).isoformat() in complete for offset in (1, 2))}
    flagged = {day for day in eligible if any(all((date.fromisoformat(day) + timedelta(days=offset)).isoformat() in qualifies for offset in pair) for pair in ((0, 1), (1, 2)))}
    return flagged, eligible


def main():
    assert flagged_days({"time": [f"2025-11-{day:02d}T{hour:02d}:00" for day in (1, 2, 3) for hour in range(24)], "temperature_2m": [12] * 72, "relative_humidity_2m": [95] * 72})[0] == {"2025-11-01"}
    print("Month       Dinajpur          Rangpur")
    results = {}
    for name, (latitude, longitude) in SITES.items():
        response = requests.get(API, params={"latitude": latitude, "longitude": longitude, "start_date": START, "end_date": END, "hourly": "temperature_2m,relative_humidity_2m", "timezone": "Asia/Dhaka"}, timeout=45)
        response.raise_for_status()
        payload = response.json()
        if payload.get("timezone") != "Asia/Dhaka":
            raise ValueError(f"Unexpected timezone for {name}: {payload.get('timezone')}")
        results[name] = flagged_days(payload["hourly"])
        print(f"Source {name}: {response.url}")
    high_months = []
    for month in ("2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"):
        cells = []
        for name in SITES:
            flagged, complete = results[name]
            count = sum(day.startswith(month) for day in flagged)
            total = sum(day.startswith(month) for day in complete)
            if not total:
                raise ValueError(f"No complete days for {name}, {month}")
            percent = 100 * count / total
            cells.append(f"{count:2d}/{total:2d} = {percent:5.1f}%")
            if month not in ("2025-10", "2026-04") and percent > 50:
                high_months.append((name, month, percent))
        print(f"{month}     {cells[0]}    {cells[1]}")
    if high_months:
        print("Over 50% in Nov-Mar; do not tune thresholds without agronomy review:", high_months)


if __name__ == "__main__":
    main()
