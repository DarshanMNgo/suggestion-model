"""The shop assistant: understands short spoken or typed commands and does the work.

Design rules (important for a shop owner):
  * Works offline. It is a simple rule-based understander, not a cloud service, so it
    never fails because of internet, never needs an API key and is fully predictable.
  * Understands English, Hindi and Kannada (and Hinglish) command words.
  * Reading information happens straight away. Anything that CHANGES the shop
    (a sale, new stock, khata, an order) is first shown back to the owner, and only
    happens after the owner says yes ("confirm").
  * It never invents numbers: missing details make it ask a question instead.

Entry points: interpret(conn, text, lang) and execute(conn, action).
"""
from __future__ import annotations

import re
import sqlite3

from . import catalog, khata, orders, planner

# ---------------------------------------------------------------- vocabulary
# Every list holds words in English, Hindi, Kannada and common spoken spellings.

WORDS = {
    "sell": ["sold", "sell", "sale", "becha", "beche", "bech", "bika", "bikri", "बेचा", "बेचे", "बिका",
             "बिक्री", "ಮಾರಾಟ", "ಮಾರಿದೆ", "ಮಾರಿದೆವು", "ಮಾರಿದ", "maaride", "maarata"],
    "add": ["add", "received", "receive", "got", "arrived", "bought", "aaya", "aaye", "aya", "mila",
            "आया", "आए", "मिला", "जोड़ो", "जोड़", "जोड़ें", "ಬಂತು", "ಬಂದಿದೆ", "ಸೇರಿಸಿ", "ಸೇರಿಸು", "bantu"],
    "stock": ["stock", "have", "left", "remaining", "kitna", "kitne", "kitni", "बचा", "कितना", "कितने",
              "कितनी", "स्टॉक", "ಎಷ್ಟು", "ಸ್ಟಾಕ್", "ಉಳಿದಿದೆ", "eshtu", "balance"],
    "order": ["order", "buy", "purchase", "reorder", "mangwana", "mangwao", "mangana", "kharid", "kharidna",
              "मंगवाना", "मंगाना", "मंगवाओ", "खरीदना", "खरीदें", "ಆರ್ಡರ್", "ತರಬೇಕು", "ಖರೀದಿ", "tarabeku"],
    "make_order": ["make", "create", "prepare", "draft", "banao", "bana", "बनाओ", "बनाएं", "ಮಾಡಿ", "ತಯಾರಿಸಿ"],
    "expiry": ["expiry", "expire", "expiring", "expired", "expires", "kharab", "खराब", "एक्सपायरी",
               "ಮುಗಿಯುವ", "ಎಕ್ಸ್‌ಪೈರಿ", "ಎಕ್ಸ್ಪೈರಿ", "ಅವಧಿ"],
    "dead": ["dead", "slow", "unsold", "idle", "nahi bika", "ಮಾರಾಟವಾಗದ", "नहीं बिका", "बेकार", "dead stock"],
    "summary": ["today", "aaj", "aj", "summary", "report", "total", "आज", "ಇಂದು", "ಇವತ್ತು", "sales", "bikri"],
    "khata": ["khata", "udhar", "udhaar", "credit", "owe", "owes", "due", "pending", "baaki", "baki",
              "खाता", "उधार", "बाकी", "ಖಾತಾ", "ಉದ್ರಿ", "ಬಾಕಿ", "ಸಾಲ", "udri"],
    "paid": ["paid", "pay", "returned", "gave", "diya", "di", "chukaya", "jama", "दिया", "दी", "चुकाया",
             "जमा", "ಕೊಟ್ಟರು", "ಪಾವತಿ", "ಕಟ್ಟಿದ", "ಕೊಟ್ಟ", "kotta", "paid back"],
    "took": ["took", "taken", "lena", "liya", "li", "le", "लिया", "ली", "ಪಡೆದ", "ತೆಗೆದುಕೊಂಡ", "teskonda"],
    "low": ["low", "kam", "short", "कम", "ಕಡಿಮೆ", "kadime"],
    "yes": ["yes", "confirm", "ok", "okay", "haan", "han", "ha", "theek", "thik", "sahi", "हाँ", "हां", "ठीक",
            "सही", "ಹೌದು", "ಸರಿ", "ಓಕೆ", "ಹಾಂ", "ಕನ್ಫರ್ಮ್"],
    "no": ["no", "cancel", "stop", "nahi", "nahin", "mat", "नहीं", "नही", "रद्द", "ಬೇಡ", "ಇಲ್ಲ", "ರದ್ದು"],
    "help": ["help", "madad", "sahayata", "मदद", "सहायता", "ಸಹಾಯ"],
}

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "twelve": 12, "fifteen": 15, "twenty": 20, "thirty": 30, "fifty": 50, "hundred": 100,
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "panch": 5, "chhe": 6, "saat": 7, "aath": 8,
    "nau": 9, "das": 10, "bees": 20, "tees": 30, "pachaas": 50, "sau": 100,
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5, "छह": 6, "सात": 7, "आठ": 8, "नौ": 9,
    "दस": 10, "बीस": 20, "तीस": 30, "पचास": 50, "सौ": 100,
    "ಒಂದು": 1, "ಎರಡು": 2, "ಮೂರು": 3, "ನಾಲ್ಕು": 4, "ಐದು": 5, "ಆರು": 6, "ಏಳು": 7, "ಎಂಟು": 8, "ಒಂಬತ್ತು": 9,
    "ಹತ್ತು": 10, "ಇಪ್ಪತ್ತು": 20, "ಮೂವತ್ತು": 30, "ಐವತ್ತು": 50, "ನೂರು": 100,
}

# words that carry no meaning for finding names/products
FILLER = {
    "the", "a", "an", "of", "for", "to", "me", "my", "i", "is", "are", "was", "were", "and", "please", "kindly",
    "units", "unit", "packets", "packet", "pcs", "piece", "pieces", "kg", "rs", "rupees", "rupee", "rupay",
    "in", "on", "at", "has", "have", "had", "from", "customer", "did", "do", "does", "how", "much", "many",
    "what", "should", "now", "ko", "ka", "ki", "ke", "hai", "hain", "ne", "se", "mein", "me", "aur", "kya",
    "karo", "kar", "do", "दो", "को", "का", "की", "के", "है", "हैं", "ने", "से", "में", "और", "क्या", "करो",
    "रुपये", "रुपए", "ಅವರು", "ಅವರ", "ಗೆ", "ಇದೆ", "ಮತ್ತು", "ರೂಪಾಯಿ", "ರೂ", "ಏನು", "ಯಾವ",
}

# Words that show the sentence is about a person's account (not a stock item).
_ALL_COMMAND_WORDS = {w for key, words in WORDS.items() for w in words}


def _has(tokens: list[str], key: str) -> bool:
    return any(token in WORDS[key] for token in tokens) or any(
        phrase in " ".join(tokens) for phrase in WORDS[key] if " " in phrase)


def _numbers(tokens: list[str]) -> list[int]:
    out = []
    for token in tokens:
        if token.isdigit():
            out.append(int(token))
        elif token in NUMBER_WORDS:
            out.append(NUMBER_WORDS[token])
    return out


# ---------------------------------------------------------------- replies in 3 languages

REPLIES = {
    "en": {
        "greet": "Tell me what you need. For example: \"sold 5 milk\", \"add 20 sugar\", \"what should I buy\".",
        "unknown": "Sorry, I did not understand. Try: \"sold 5 milk\", \"how much rice\", or \"what should I buy\".",
        "need_item": "Which item do you mean?",
        "need_qty": "How many?",
        "need_amount": "How much money?",
        "need_customer": "Which customer?",
        "item_unknown": "I could not find \"{name}\" in your shop. Please add it in Stock first.",
        "sell": "Sell {qty} {product}?",
        "sell_price": "Sell {qty} {product} for Rs {amount}?",
        "add": "Add {qty} {product} to stock?",
        "stock": "{product}: {stock} in stock.",
        "stock_none": "{product} is finished. Nothing left.",
        "nothing_to_buy": "Nothing urgent to buy right now.",
        "buy_list": "You should buy {count} items: {items}. Say \"make order\" to prepare it.",
        "no_expiry": "Nothing is about to expire.",
        "expiry": "{count} items need attention: {items}.",
        "no_dead": "No dead stock. Everything is moving.",
        "dead": "{count} items have not sold for a long time: {items}. About Rs {money} is stuck.",
        "summary": "Today: Rs {total} from {entries} sales. {low} items are low, {owed} pending in khata.",
        "khata_credit": "Write Rs {amount} udhar for {customer}?",
        "khata_paid": "{customer} paid Rs {amount}. Write it in the khata?",
        "khata_owes": "{customer} owes Rs {balance}.",
        "khata_total": "Customers owe you Rs {total} in total.",
        "customer_unknown": "I do not know \"{name}\" yet. Say yes to add this customer.",
        "make_order": "Prepare {count} draft orders? You can still check and approve each one.",
        "make_order_none": "There is nothing to order right now.",
        "cancelled": "Okay, cancelled.",
        "nothing_pending": "There is nothing waiting for confirmation.",
        "done_sell": "Done. Sold {qty} {product}. {stock} left.",
        "done_sell_warn": "Done. But the app showed less stock than you sold. Please check the {product} count.",
        "done_add": "Done. Added {qty} {product}. Now {stock} in stock.",
        "done_khata_credit": "Written. {customer} now owes Rs {balance}.",
        "done_khata_paid": "Written. {customer} owes Rs {balance} now.",
        "done_order": "Prepared {count} draft orders. Open Buy to check and approve.",
        "error": "Could not do that: {why}",
    },
    "hi": {
        "greet": "बताइए क्या करना है। जैसे: \"5 दूध बेचा\", \"20 चीनी आई\", \"क्या मंगवाना है\".",
        "unknown": "माफ़ कीजिए, समझ नहीं आया। ऐसे बोलें: \"5 दूध बेचा\", \"चावल कितना है\", \"क्या मंगवाना है\".",
        "need_item": "कौन सा सामान?",
        "need_qty": "कितना?",
        "need_amount": "कितने रुपये?",
        "need_customer": "कौन सा ग्राहक?",
        "item_unknown": "\"{name}\" आपकी दुकान में नहीं मिला। पहले इसे स्टॉक में जोड़ें।",
        "sell": "{qty} {product} बेचना है?",
        "sell_price": "{qty} {product} ₹{amount} में बेचना है?",
        "add": "{qty} {product} स्टॉक में जोड़ें?",
        "stock": "{product}: {stock} बचा है।",
        "stock_none": "{product} ख़त्म हो गया है।",
        "nothing_to_buy": "अभी कुछ ज़रूरी मंगवाना नहीं है।",
        "buy_list": "{count} चीज़ें मंगवानी हैं: {items}। \"ऑर्डर बनाओ\" बोलें।",
        "no_expiry": "कुछ भी जल्दी एक्सपायर नहीं हो रहा।",
        "expiry": "{count} चीज़ों पर ध्यान दें: {items}।",
        "no_dead": "कोई डेड स्टॉक नहीं है। सब बिक रहा है।",
        "dead": "{count} चीज़ें बहुत दिनों से नहीं बिकीं: {items}। करीब ₹{money} फँसा है।",
        "summary": "आज: {entries} बिक्री से ₹{total}। {low} चीज़ें कम हैं, खाते में ₹{owed} बाकी।",
        "khata_credit": "{customer} के नाम ₹{amount} उधार लिखें?",
        "khata_paid": "{customer} ने ₹{amount} दिए। खाते में लिखें?",
        "khata_owes": "{customer} का ₹{balance} बाकी है।",
        "khata_total": "ग्राहकों का कुल ₹{total} बाकी है।",
        "customer_unknown": "\"{name}\" नया ग्राहक है। जोड़ने के लिए हाँ बोलें।",
        "make_order": "{count} ड्राफ़्ट ऑर्डर बनाएं? आप हर एक देखकर मंज़ूर कर सकते हैं।",
        "make_order_none": "अभी कुछ मंगवाने को नहीं है।",
        "cancelled": "ठीक है, रद्द किया।",
        "nothing_pending": "पुष्टि के लिए कुछ बाकी नहीं है।",
        "done_sell": "हो गया। {qty} {product} बेचा। {stock} बचा है।",
        "done_sell_warn": "हो गया। लेकिन ऐप में स्टॉक कम दिख रहा था। कृपया {product} की गिनती जाँचें।",
        "done_add": "हो गया। {qty} {product} जोड़ा। अब {stock} है।",
        "done_khata_credit": "लिख दिया। {customer} का अब ₹{balance} बाकी है।",
        "done_khata_paid": "लिख दिया। {customer} का अब ₹{balance} बाकी है।",
        "done_order": "{count} ड्राफ़्ट ऑर्डर बन गए। 'खरीदारी' में जाकर देखें और मंज़ूर करें।",
        "error": "यह नहीं हो सका: {why}",
    },
    "kn": {
        "greet": "ಏನು ಮಾಡಬೇಕು ಹೇಳಿ. ಉದಾಹರಣೆ: \"5 ಹಾಲು ಮಾರಿದೆ\", \"20 ಸಕ್ಕರೆ ಬಂತು\", \"ಏನು ತರಬೇಕು\".",
        "unknown": "ಕ್ಷಮಿಸಿ, ಅರ್ಥವಾಗಲಿಲ್ಲ. ಹೀಗೆ ಹೇಳಿ: \"5 ಹಾಲು ಮಾರಿದೆ\", \"ಅಕ್ಕಿ ಎಷ್ಟು ಇದೆ\", \"ಏನು ತರಬೇಕು\".",
        "need_item": "ಯಾವ ವಸ್ತು?",
        "need_qty": "ಎಷ್ಟು?",
        "need_amount": "ಎಷ್ಟು ರೂಪಾಯಿ?",
        "need_customer": "ಯಾವ ಗ್ರಾಹಕ?",
        "item_unknown": "\"{name}\" ನಿಮ್ಮ ಅಂಗಡಿಯಲ್ಲಿ ಸಿಗಲಿಲ್ಲ. ಮೊದಲು ಸ್ಟಾಕ್‌ನಲ್ಲಿ ಸೇರಿಸಿ.",
        "sell": "{qty} {product} ಮಾರಾಟ ಮಾಡಬೇಕೇ?",
        "sell_price": "{qty} {product} ₹{amount}ಕ್ಕೆ ಮಾರಾಟ ಮಾಡಬೇಕೇ?",
        "add": "{qty} {product} ಸ್ಟಾಕ್‌ಗೆ ಸೇರಿಸಬೇಕೇ?",
        "stock": "{product}: {stock} ಇದೆ.",
        "stock_none": "{product} ಮುಗಿದಿದೆ.",
        "nothing_to_buy": "ಈಗ ಅಗತ್ಯವಾಗಿ ತರಬೇಕಾದದ್ದು ಏನೂ ಇಲ್ಲ.",
        "buy_list": "{count} ವಸ್ತುಗಳನ್ನು ತರಬೇಕು: {items}. \"ಆರ್ಡರ್ ಮಾಡಿ\" ಎನ್ನಿ.",
        "no_expiry": "ಯಾವುದೂ ಶೀಘ್ರದಲ್ಲಿ ಅವಧಿ ಮುಗಿಯುತ್ತಿಲ್ಲ.",
        "expiry": "{count} ವಸ್ತುಗಳ ಬಗ್ಗೆ ಗಮನ ಕೊಡಿ: {items}.",
        "no_dead": "ಮಾರಾಟವಾಗದ ಸ್ಟಾಕ್ ಇಲ್ಲ. ಎಲ್ಲವೂ ಮಾರಾಟವಾಗುತ್ತಿದೆ.",
        "dead": "{count} ವಸ್ತುಗಳು ತುಂಬಾ ದಿನದಿಂದ ಮಾರಾಟವಾಗಿಲ್ಲ: {items}. ಸುಮಾರು ₹{money} ಸಿಕ್ಕಿಹಾಕಿಕೊಂಡಿದೆ.",
        "summary": "ಇಂದು: {entries} ಮಾರಾಟದಿಂದ ₹{total}. {low} ವಸ್ತುಗಳು ಕಡಿಮೆ, ಖಾತಾದಲ್ಲಿ ₹{owed} ಬಾಕಿ.",
        "khata_credit": "{customer} ಹೆಸರಿಗೆ ₹{amount} ಉದ್ರಿ ಬರೆಯಬೇಕೇ?",
        "khata_paid": "{customer} ₹{amount} ಕೊಟ್ಟರು. ಖಾತಾದಲ್ಲಿ ಬರೆಯಬೇಕೇ?",
        "khata_owes": "{customer} ಅವರ ₹{balance} ಬಾಕಿ ಇದೆ.",
        "khata_total": "ಗ್ರಾಹಕರಿಂದ ಒಟ್ಟು ₹{total} ಬರಬೇಕಿದೆ.",
        "customer_unknown": "\"{name}\" ಹೊಸ ಗ್ರಾಹಕರು. ಸೇರಿಸಲು ಹೌದು ಎನ್ನಿ.",
        "make_order": "{count} ಡ್ರಾಫ್ಟ್ ಆರ್ಡರ್ ಮಾಡಬೇಕೇ? ಪ್ರತಿಯೊಂದನ್ನೂ ನೋಡಿ ಒಪ್ಪಬಹುದು.",
        "make_order_none": "ಈಗ ಆರ್ಡರ್ ಮಾಡಲು ಏನೂ ಇಲ್ಲ.",
        "cancelled": "ಸರಿ, ರದ್ದು ಮಾಡಿದೆ.",
        "nothing_pending": "ದೃಢೀಕರಿಸಲು ಏನೂ ಬಾಕಿ ಇಲ್ಲ.",
        "done_sell": "ಆಯಿತು. {qty} {product} ಮಾರಾಟ. {stock} ಉಳಿದಿದೆ.",
        "done_sell_warn": "ಆಯಿತು. ಆದರೆ ಆ್ಯಪ್‌ನಲ್ಲಿ ಕಡಿಮೆ ಸ್ಟಾಕ್ ಇತ್ತು. {product} ಎಣಿಕೆ ಪರಿಶೀಲಿಸಿ.",
        "done_add": "ಆಯಿತು. {qty} {product} ಸೇರಿಸಿದೆ. ಈಗ {stock} ಇದೆ.",
        "done_khata_credit": "ಬರೆದಿದೆ. {customer} ಅವರ ಬಾಕಿ ಈಗ ₹{balance}.",
        "done_khata_paid": "ಬರೆದಿದೆ. {customer} ಅವರ ಬಾಕಿ ಈಗ ₹{balance}.",
        "done_order": "{count} ಡ್ರಾಫ್ಟ್ ಆರ್ಡರ್ ಸಿದ್ಧ. 'ಖರೀದಿ'ಯಲ್ಲಿ ನೋಡಿ ಒಪ್ಪಿಗೆ ನೀಡಿ.",
        "error": "ಇದು ಆಗಲಿಲ್ಲ: {why}",
    },
}


def say(lang: str, key: str, **values) -> str:
    table = REPLIES.get(lang) or REPLIES["en"]
    template = table.get(key) or REPLIES["en"][key]
    return template.format(**values)


def _money(value: float) -> str:
    return f"{value:,.0f}" if float(value).is_integer() else f"{value:,.2f}"


# ---------------------------------------------------------------- understanding

def interpret(conn: sqlite3.Connection, text: str, lang: str = "en") -> dict:
    """Understand one command.

    Returns a dict with:
      reply          what to show / speak to the owner
      needs_confirm  True when the owner must say yes before anything changes
      action         the change that will happen on confirm (send back to execute())
      ask            True when a detail is missing and the owner should answer it
    """
    tokens = catalog.tokenize(text)
    if not tokens:
        return {"reply": say(lang, "greet"), "needs_confirm": False, "action": None, "ask": False}

    def reply(key: str, **values) -> dict:
        return {"reply": say(lang, key, **values), "needs_confirm": False, "action": None, "ask": False}

    def ask(key: str) -> dict:
        return {"reply": say(lang, key), "needs_confirm": False, "action": None, "ask": True}

    if _has(tokens, "help") and len(tokens) <= 3:
        return reply("greet")

    numbers = _numbers(tokens)
    hits = catalog.match_products(conn, tokens, skip=_ALL_COMMAND_WORDS | FILLER)
    product = hits[0][0] if hits else None

    # --- information questions --------------------------------------------------
    wants_khata = _has(tokens, "khata") or any(
        t in WORDS["khata"] for t in tokens)
    if wants_khata and not _has(tokens, "paid") and not _has(tokens, "took") and not numbers:
        person = _find_person(conn, tokens, hits)
        if person:
            return reply("khata_owes", customer=person["name"], balance=_money(max(0, person["balance"])))
        return reply("khata_total", total=_money(khata.total_outstanding(conn)))

    if _has(tokens, "expiry"):
        report = [e for e in planner.expiry_report(conn) if e["level"] != "ok"]
        if not report:
            return reply("no_expiry")
        names = ", ".join(f"{e['product']} ({e['days_left']}d)" if e["days_left"] >= 0 else f"{e['product']} (expired)"
                          for e in report[:5])
        return reply("expiry", count=len(report), items=names)

    if _has(tokens, "dead"):
        dead = planner.dead_stock(conn)
        if not dead:
            return reply("no_dead")
        return reply("dead", count=len(dead), items=", ".join(d["product"] for d in dead[:5]),
                     money=_money(sum(d["money_locked"] for d in dead)))

    # --- make an order (needs confirm) ------------------------------------------
    if _has(tokens, "order") and _has(tokens, "make_order") or (
            _has(tokens, "make_order") and _has(tokens, "order")):
        suggestions = planner.reorder_suggestions(conn)["items"]
        count = len([i for i in suggestions if i["fits_budget"]])
        if not count:
            return reply("make_order_none")
        return {"reply": say(lang, "make_order", count=count), "needs_confirm": True, "ask": False,
                "action": {"type": "make_order"}}

    if _has(tokens, "order") and not numbers:
        suggestions = [i for i in planner.reorder_suggestions(conn)["items"] if i["fits_budget"]]
        if not suggestions:
            return reply("nothing_to_buy")
        names = ", ".join(f"{i['product']} {i['suggested_qty']}" for i in suggestions[:6])
        return reply("buy_list", count=len(suggestions), items=names)

    # --- khata changes ------------------------------------------------------------
    if _has(tokens, "paid") and (numbers or _has(tokens, "khata")) and not _has(tokens, "sell"):
        return _khata_change(conn, tokens, hits, numbers, "payment", lang)
    if (_has(tokens, "took") or wants_khata) and numbers and not _has(tokens, "sell"):
        return _khata_change(conn, tokens, hits, numbers, "credit", lang)

    # --- sell / add ---------------------------------------------------------------
    if _has(tokens, "sell"):
        if not product:
            unknown = _unknown_name(tokens)
            if unknown and numbers:
                return reply("item_unknown", name=unknown)
            if not numbers and not hits:
                return _summary(conn, lang)
            return ask("need_item")
        if not numbers:
            return ask("need_qty")
        qty = numbers[0]
        price = numbers[1] if len(numbers) > 1 else None  # "sold 5 milk 30" -> total price
        action = {"type": "sell", "product": product, "quantity": qty, "price": None}
        text_key = "sell"
        values = {"qty": qty, "product": product}
        if price:
            action["price"] = round(price / qty, 2)
            text_key, values["amount"] = "sell_price", _money(price)
        return {"reply": say(lang, text_key, **values), "needs_confirm": True, "ask": False, "action": action}

    if _has(tokens, "add"):
        if not product:
            unknown = _unknown_name(tokens)
            if unknown and numbers:
                return reply("item_unknown", name=unknown)
            return ask("need_item")
        if not numbers:
            return ask("need_qty")
        return {"reply": say(lang, "add", qty=numbers[0], product=product), "needs_confirm": True, "ask": False,
                "action": {"type": "receive", "product": product, "quantity": numbers[0]}}

    if _has(tokens, "stock") or (product and not numbers):
        if not product:
            return ask("need_item")
        row = catalog.get_product(conn, product)
        key = "stock_none" if row["stock"] <= 0 else "stock"
        return reply(key, product=row["product"], stock=row["stock"])

    if _has(tokens, "low"):
        low = [i for i in catalog.list_inventory(conn) if i["is_low"]]
        if not low:
            return reply("nothing_to_buy")
        return reply("buy_list", count=len(low), items=", ".join(i["product"] for i in low[:6]))

    if _has(tokens, "summary"):
        return _summary(conn, lang)

    # "5 milk" with no verb: most likely a sale. Ask instead of guessing.
    if product and numbers:
        return {"reply": say(lang, "sell", qty=numbers[0], product=product), "needs_confirm": True, "ask": False,
                "action": {"type": "sell", "product": product, "quantity": numbers[0], "price": None}}

    return reply("unknown")


def _summary(conn: sqlite3.Connection, lang: str) -> dict:
    data = planner.daily_summary(conn)
    return {"reply": say(lang, "summary", total=_money(data["today"]["total"]), entries=data["today"]["entries"],
                         low=data["counts"]["low_stock"], owed=_money(data["khata_pending"])),
            "needs_confirm": False, "action": None, "ask": False}


def _unknown_name(tokens: list[str]) -> str:
    """The first word that is not a number, filler or command word: probably the item they meant."""
    for token in tokens:
        if not token.isdigit() and token not in FILLER and token not in _ALL_COMMAND_WORDS \
                and token not in NUMBER_WORDS and len(token) > 1:
            return token
    return ""


def _find_person(conn: sqlite3.Connection, tokens: list[str], hits) -> dict | None:
    product_positions = {pos for _, start, end in hits for pos in range(start, end + 1)}
    for pos, token in enumerate(tokens):
        if pos in product_positions or token in _ALL_COMMAND_WORDS or token in FILLER or token.isdigit():
            continue
        person = khata.find_customer(conn, token)
        if person:
            return person
    return None


def _khata_change(conn, tokens, hits, numbers, kind: str, lang: str) -> dict:
    amount = max(numbers) if numbers else 0
    if not amount:
        return {"reply": say(lang, "need_amount"), "needs_confirm": False, "action": None, "ask": True}
    person = _find_person(conn, tokens, hits)
    if person:
        name, is_new = person["name"], False
    else:
        name = _unknown_name(tokens)
        if not name:
            return {"reply": say(lang, "need_customer"), "needs_confirm": False, "action": None, "ask": True}
        name, is_new = name.capitalize(), True
    key = "khata_credit" if kind == "credit" else "khata_paid"
    message = say(lang, key, customer=name, amount=_money(amount))
    if is_new:
        message += " " + say(lang, "customer_unknown", name=name)
    return {"reply": message, "needs_confirm": True, "ask": False,
            "action": {"type": "khata", "kind": kind, "customer": name, "amount": amount}}


# ---------------------------------------------------------------- doing the work

def execute(conn: sqlite3.Connection, action: dict, lang: str = "en") -> dict:
    """Carry out an action the owner confirmed. Validates everything again."""
    kind = (action or {}).get("type")
    try:
        if kind == "sell":
            result = catalog.record_sale(conn, action["product"], int(action["quantity"]),
                                         price=action.get("price") or None)
            key = "done_sell_warn" if result["warning"] else "done_sell"
            return {"ok": True, "reply": say(lang, key, qty=result["quantity"], product=result["product"],
                                              stock=result["stock_left"]), "result": result}
        if kind == "receive":
            result = catalog.receive_stock(conn, action["product"], int(action["quantity"]))
            return {"ok": True, "reply": say(lang, "done_add", qty=result["added"], product=result["product"],
                                              stock=result["stock"]), "result": result}
        if kind == "khata":
            person = khata.add_customer(conn, str(action["customer"]))
            updated = khata.add_entry(conn, person["id"], float(action["amount"]), action["kind"],
                                      note="by voice assistant")
            key = "done_khata_credit" if action["kind"] == "credit" else "done_khata_paid"
            return {"ok": True, "reply": say(lang, key, customer=updated["name"],
                                              balance=_money(max(0, updated["balance"]))), "result": updated}
        if kind == "make_order":
            created = orders.create_draft_orders(conn)
            if not created:
                return {"ok": True, "reply": say(lang, "make_order_none"), "result": []}
            return {"ok": True, "reply": say(lang, "done_order", count=len(created)), "result": created}
    except (ValueError, LookupError, KeyError, TypeError) as exc:
        return {"ok": False, "reply": say(lang, "error", why=str(exc)), "result": None}
    return {"ok": False, "reply": say(lang, "unknown"), "result": None}


def is_yes(text: str) -> bool:
    tokens = catalog.tokenize(text)
    return bool(tokens) and len(tokens) <= 4 and any(t in WORDS["yes"] for t in tokens) \
        and not any(t in WORDS["no"] for t in tokens)


def is_no(text: str) -> bool:
    tokens = catalog.tokenize(text)
    return bool(tokens) and len(tokens) <= 4 and any(t in WORDS["no"] for t in tokens)
