"""Shop catalog. `asset_key` is the id the family app uses to draw the item on Dotty."""

from .. import db

# (id, slot, name, price, rarity, unlock_badge)
CATALOG = [
    ("color_sky", "color", "Pip Pink", 0, "common", None),
    ("color_mint", "color", "Mint", 60, "common", None),
    ("color_sunset", "color", "Sunset", 80, "common", None),
    ("color_grape", "color", "Grape", 80, "common", None),
    ("color_gold", "color", "Golden", 300, "epic", "first_week"),
    ("hat_cap", "hat", "Baseball Cap", 50, "common", None),
    ("hat_beanie", "hat", "Beanie", 70, "common", None),
    ("hat_party", "hat", "Party Hat", 90, "rare", None),
    ("hat_crown", "hat", "Crown", 200, "epic", None),
    ("hat_wizard", "hat", "Wizard Hat", 150, "rare", "night_owl"),
    ("acc_glasses", "accessory", "Cool Glasses", 60, "common", None),
    ("acc_bowtie", "accessory", "Bow Tie", 50, "common", None),
    ("acc_scarf", "accessory", "Scarf", 70, "common", None),
    ("acc_headphones", "accessory", "Headphones", 120, "rare", None),
    ("acc_cape", "accessory", "Hero Cape", 180, "epic", "sport_star"),
    ("bg_underwater", "background", "Pip's Pond", 0, "common", None),
    ("bg_day", "background", "Sunny Day", 0, "common", None),
    ("bg_night", "background", "Starry Night", 80, "common", None),
    ("bg_beach", "background", "Beach", 100, "rare", None),
    ("bg_space", "background", "Outer Space", 120, "rare", None),
    ("bg_candy", "background", "Candy Land", 150, "epic", "carb_counter"),
]


def ensure_items() -> None:
    for item_id, slot, name, price, rarity, badge in CATALOG:
        db.shop_items.update_one(
            {"_id": item_id},
            {"$set": {"slot": slot, "name": name, "price": price, "rarity": rarity, "asset_key": item_id, "unlock_badge": badge}},
            upsert=True,
        )
