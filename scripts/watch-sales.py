#!/usr/bin/env python3
"""Watch brand sites for a holiday sale launch.

Each morning the GitHub Action compares what the page says now with
scripts/sale-baseline.json. A brand that newly announces a holiday sale,
or posts a new percent or dollar offer, fails the run so it shows up.
A wording tweak on a sale already on file does not. Everyday newsletter
discounts do not.

Amazon and ShopMy links are not in this list. Those pages block a
morning check, and they are not the brand's own sale announcement.

python3 scripts/watch-sales.py --baseline   # record what the pages say today
"""
import json
import re
import sys
import urllib.request
from html import unescape
from pathlib import Path

UA = "Mozilla/5.0 (compatible; HolidaysMadeSimple/1.0; sales-watch)"
ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "scripts" / "sale-baseline.json"
HOLIDAY = re.compile(
    r".{0,50}(?:black friday|cyber monday|cyber week|holiday sale|biggest sale|sale is live|sitewide).{0,70}",
    re.I,
)
FACT = re.compile(r"\d+\s*%|\$\s*\d+", re.I)

# One page per brand shop in the guide. The URL is the public site, not an affiliate redirect.
SITES = [
    ("Lumebox", "https://thelumebox.com/"),
    ("Boncharge", "https://boncharge.com/pages/black-friday-2026"),
    ("Just Ingredients", "https://justingredients.com/"),
    ("Rowe Casa Organics", "https://www.rowecasaorganics.com/"),
    ("360 Cookware", "https://www.360cookware.com/"),
    ("Bella Luna Toys", "https://www.bellalunatoys.com/"),
    ("Natural Sloth", "https://naturalsloth.com/"),
    ("Promix", "https://promixnutrition.com/"),
    ("Huella", "https://huellabeauty.com/"),
    ("Leaf", "https://leafshave.com/"),
    ("Colorful Standard", "https://colorfulstandard.com/en-us"),
    ("O My Bag", "https://omybagamsterdam.com/en-us/"),
    ("East Perry", "https://www.eastperry.com/"),
    ("Indigo Row", "http://www.shopindigorow.com/"),
    ("Feelgrounds", "https://feelgrounds.com/en-usa"),
    ("Be Lenka", "https://www.belenka.shop/"),
    ("Little Love Bug", "https://www.littlelovebugcompany.com/"),
    ("Avocado", "https://www.avocadogreenmattress.com/"),
    ("Ringana", "https://taylor.ringana.us"),
    ("Groceries Apparel", "https://groceriesapparel.com/"),
    ("Plant Paper", "https://plantpaper.us/"),
    ("Clearly Filtered", "https://www.clearlyfiltered.com/"),
    ("The Healthy Home", "https://thehealthyhome.shop/"),
    ("Ora", "https://soundofora.com/"),
    ("ESAS", "https://www.esasnyc.com/"),
    ("Savoiz", "https://www.savoiz.com/"),
    ("Orgaid", "https://orgaid.com/"),
    ("Bearaby", "https://bearaby.com/"),
    ("Aizome", "https://aizome-textiles.com/"),
    ("Rise", "https://risecentered.com/"),
    ("Growing Tree Toys", "https://www.growingtreetoys.com/"),
    ("Our Greenhouse", "https://ourgreenhouse.com/"),
    ("Hope & Plum", "https://www.hopeandplum.co/"),
    ("Anxi Ring", "https://anxiring.com/"),
    ("Kooshoo", "https://kooshoo.com/"),
    ("Botanical Interests", "https://www.botanicalinterests.com/"),
]

LUMEBOX = {
    "name": "Lumebox 2.0 price",
    "url": "https://thelumebox.com/products/lumebox-2-0-new.js",
    "price": 31500,
    "compare": 62900,
}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/json"})
    with urllib.request.urlopen(req, timeout=25) as res:
        return res.read()


def phrases(raw):
    text = raw.decode("utf-8", "replace")
    text = re.sub(r"<script[\s\S]*?</script>", " ", text, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(re.sub(r"\s+", " ", text))
    found = []
    for match in HOLIDAY.finditer(text):
        line = re.sub(r"\s+", " ", match.group(0)).strip().lower()
        line = re.sub(r"\d{6,}", "", line)[:140]
        if line and line not in found:
            found.append(line)
        if len(found) == 6:
            break
    return found


def sale_facts(lines):
    blob = " ".join(lines).lower()
    return {re.sub(r"\s+", "", item) for item in FACT.findall(blob)}


def lumebox_note():
    product = json.loads(fetch(LUMEBOX["url"]).decode("utf-8", "replace"))
    variant = (product.get("variants") or [{}])[0]
    price = variant.get("price")
    compare = variant.get("compare_at_price")
    if price != LUMEBOX["price"] or compare != LUMEBOX["compare"]:
        return (
            f"Lumebox price moved. Watching ${LUMEBOX['price']/100:.2f} from ${LUMEBOX['compare']/100:.2f}. "
            f"The page now says ${price/100:.2f}" + (f" from ${compare/100:.2f}." if compare else ".")
        )
    return ""


def main():
    baseline_mode = "--baseline" in sys.argv
    baseline = {}
    if BASELINE.exists() and not baseline_mode:
        baseline = json.loads(BASELINE.read_text())
    current = {}
    changes = []
    reached = 0
    for name, url in SITES:
        try:
            lines = phrases(fetch(url))
        except Exception as err:
            print(f"{name}: could not check ({err.__class__.__name__})")
            continue
        reached += 1
        current[name] = lines
        previous = baseline.get(name, [])
        added = [line for line in lines if line not in previous]
        new_facts = sale_facts(lines) - sale_facts(previous)
        if not baseline_mode and ((lines and not previous) or new_facts):
            detail = added[0] if added else lines[0]
            extra = f" ({', '.join(sorted(new_facts))})" if new_facts else ""
            changes.append(f"{name} sale announcement: {detail}{extra}")
        status = lines[0] if lines else "no holiday sale announced"
        print(f"{name}: {status}")
    try:
        note = lumebox_note()
        reached += 1
        if note:
            changes.append(note)
            print(note)
        else:
            print("Lumebox 2.0 price: $315.00 from $629.00")
    except Exception as err:
        print(f"Lumebox 2.0 price: could not check ({err.__class__.__name__})")
    if baseline_mode:
        BASELINE.write_text(json.dumps(current, indent=2, ensure_ascii=False) + "\n")
        print(f"recorded {len(current)} brands in {BASELINE.name}")
        return 0
    if changes:
        print("\n".join(changes))
        return 1
    if not reached:
        print("could not reach the brand sites. no launch recorded.")
        return 0
    print("no new holiday sale launches.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
