#!/usr/bin/env python3
"""Check the holiday prices we are watching. Exit 1 when one has moved.

Add a Shopify product by appending to WATCH. Prices are cents.
The GitHub Action runs this every morning.
It reports a change. It does not edit the guide.
"""
import json
import sys
import urllib.request

UA = "Mozilla/5.0 (compatible; HolidaysMadeSimple/1.0; sales-watch)"

WATCH = [
    {
        "name": "Lumebox 2.0",
        "url": "https://thelumebox.com/products/lumebox-2-0-new.js",
        "price": 31500,
        "compare": 62900,
    }
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as res:
        return res.read()


def main():
    changes = []
    checked = 0
    for item in WATCH:
        try:
            product = json.loads(fetch(item["url"]).decode("utf-8", "replace"))
        except Exception as err:
            print(f"{item['name']}: could not check ({err})")
            continue
        variant = (product.get("variants") or [{}])[0]
        price = variant.get("price")
        compare = variant.get("compare_at_price")
        available = product.get("available")
        checked += 1
        print(f"{item['name']}: ${price/100:.2f}" + (f" (was ${compare/100:.2f})" if compare else "") + f", available {available}")
        if price != item["price"] or (item.get("compare") and compare != item["compare"]):
            changes.append(
                f"{item['name']} moved. Watching ${item['price']/100:.2f}"
                + (f" from ${item['compare']/100:.2f}" if item.get("compare") else "")
                + f". The page now says ${price/100:.2f}"
                + (f" from ${compare/100:.2f}" if compare else "")
                + "."
            )
    if changes:
        print("\n".join(changes))
        return 1
    if not checked:
        print("could not reach the watched sale pages. no price change recorded.")
        return 0
    print("watched prices still match.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
