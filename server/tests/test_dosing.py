from app.services import dosing

PLAN = {
    "icr": [{"start": "00:00", "g_per_unit": 12}, {"start": "05:00", "g_per_unit": 10}, {"start": "11:00", "g_per_unit": 15}],
    "isf_mgdl_per_unit": 50,
    "correction_target": 120,
    "max_bolus": 10,
    "activity_rules": {"light": 0, "moderate": 25, "vigorous": 50},
    "version": 3,
}


def test_round_half_is_half_up():
    assert dosing.round_half(3.25) == 3.5
    assert dosing.round_half(3.24) == 3.0
    assert dosing.round_half(2.5) == 2.5
    assert dosing.round_half(0.74) == 0.5


def test_icr_follows_time_of_day_and_wraps_before_first_slot():
    assert dosing.icr_for(PLAN["icr"], "07:30") == 10
    assert dosing.icr_for(PLAN["icr"], "12:00") == 15
    assert dosing.icr_for(PLAN["icr"], "02:00") == 12
    plan_late_start = [{"start": "06:00", "g_per_unit": 8}, {"start": "18:00", "g_per_unit": 14}]
    assert dosing.icr_for(plan_late_start, "03:00") == 14  # before the first slot -> last slot of the day


def test_meal_dose_with_correction():
    r = dosing.suggest(PLAN, carbs_g=45, bg_mgdl=170, time_hhmm="08:00")
    assert r["carb_units"] == 4.5 and r["correction_units"] == 1.0
    assert r["suggested_units"] == 5.5 and not r["blocked"]


def test_no_correction_at_or_below_target():
    r = dosing.suggest(PLAN, carbs_g=30, bg_mgdl=110, time_hhmm="08:00")
    assert r["correction_units"] == 0 and r["suggested_units"] == 3.0


def test_activity_reduces_the_dose():
    plain = dosing.suggest(PLAN, 45, 140, "08:00", "none")
    moderate = dosing.suggest(PLAN, 45, 140, "08:00", "moderate")
    # (4.5 + 0.4) * 0.75 = 3.675 -> 3.5
    assert plain["suggested_units"] == 5.0
    assert moderate["suggested_units"] == 3.5
    assert moderate["activity_reduce_pct"] == 25


def test_low_glucose_blocks_dosing():
    r = dosing.suggest(PLAN, 45, 65, "08:00")
    assert r["blocked"] and r["suggested_units"] == 0
    assert "15 g" in r["message"]


def test_dose_is_capped_at_max_bolus():
    r = dosing.suggest(PLAN, carbs_g=200, bg_mgdl=300, time_hhmm="08:00")
    assert r["suggested_units"] == 10 and r["capped"]
    assert any("maximum" in w for w in r["warnings"])


def test_iob_warning_is_always_shown():
    assert any("Insulin on board" in w for w in dosing.suggest(PLAN, 10, 100, "08:00")["warnings"])
