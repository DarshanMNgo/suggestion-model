// All words shown in the app, in English, Hindi and Kannada.
// To add a language: copy the "en" block, translate the values, and add it to LANGUAGES.
export const LANGUAGES = [
  { code: "en", label: "English", speech: "en-IN" },
  { code: "hi", label: "हिंदी", speech: "hi-IN" },
  { code: "kn", label: "ಕನ್ನಡ", speech: "kn-IN" },
];

export const YES_WORDS = ["yes", "confirm", "ok", "okay", "haan", "han", "ha", "theek", "thik", "sahi", "हाँ", "हां", "ठीक", "सही", "ಹೌದು", "ಸರಿ", "ಓಕೆ"];
export const NO_WORDS = ["no", "cancel", "stop", "nahi", "nahin", "नहीं", "नही", "रद्द", "ಬೇಡ", "ಇಲ್ಲ", "ರದ್ದು"];

const en = {
  appName: "KiranaWise",
  tagline: "Your shop helper",
  navHome: "Home", navSell: "Sell", navStock: "Stock", navBuy: "Buy", navKhata: "Khata", navSettings: "Settings",
  offlineTitle: "Cannot reach the shop server",
  offlineHelp: "Start the backend (uvicorn app.api:app --reload) and refresh this page.",
  loading: "Loading…", retry: "Try again", save: "Save", cancel: "Cancel", close: "Close", back: "Back",
  saved: "Saved", yes: "Yes", no: "No", search: "Search item…", units: "units", today: "Today",

  // home
  hello: "Namaste", todaySales: "Today's sales", khataPending: "Khata pending",
  attention: "Needs your attention", allGood: "Everything looks fine today.",
  buyNow: "Items to buy", expiring: "Expiring soon", lowStock: "Low stock", deadStock: "Not selling",
  buyNowHint: "will run out soon", expiringHint: "need to sell fast", lowHint: "below your alert level", deadHint: "money stuck on shelf",
  festivalIn: "{name} is in {days} days. Demand will go up.", festivalToday: "{name} is today!",
  quick: "Quick actions", askAssistant: "Tap the mic and just say what you want.",
  emptyShopTitle: "Your shop is empty", emptyShopText: "Add your items, or load a sample shop to try the app.",
  loadSample: "Load sample shop", addFirst: "Add an item",
  moneyStuck: "Money stuck", valueStock: "Stock value",

  // sell
  sellTitle: "Sell", pickItem: "Pick the item", howMany: "How many?", pay: "Payment",
  cash: "Cash", upi: "UPI", udhar: "Udhar", pickCustomer: "Who is taking on udhar?", noCustomers: "Add a customer in Khata first.",
  priceEach: "Price each", saveSale: "Save sale", recentSales: "Recent sales", noSales: "No sales yet.",
  soldDone: "Sold {qty} {name}. {left} left.", shortWarn: "The app showed less stock than you sold. Please check the count.",
  total: "Total",

  // stock
  stockTitle: "Stock", filterAll: "All", filterLow: "Low", filterExpiry: "Expiring", filterDead: "Not selling",
  addItem: "Add item", editItem: "Edit item", itemName: "Item name", unit: "Unit (kg, packet…)",
  inStock: "In stock", alertAt: "Alert me at", costPrice: "Buying price", sellPrice: "Selling price",
  otherNames: "Other names (Hindi, Kannada…)", otherNamesHint: "Separate with commas. The voice assistant uses these.",
  supplier: "Supplier", shelfLife: "Shelf life (days)", shelfHint: "0 if it does not expire",
  goodsArrived: "Goods arrived", qtyArrived: "How many arrived?", expiryDate: "Expiry date", addToStock: "Add to stock",
  low: "Low", expiresIn: "Expires in {days} days", expiresToday: "Expires today", expired: "Expired",
  lastSold: "Last sold {days} days ago", neverSold: "Never sold", noItems: "No items found.", deleteItem: "Delete item",
  confirmDelete: "Delete this item?", expiryAction: "What to do", moneyAtRisk: "Money at risk",

  // buy
  buyTitle: "Buy", budget: "Cash for buying", suggested: "What to buy", makeOrders: "Prepare orders",
  nothingToBuy: "Nothing to buy right now.", orders: "Your orders", noOrders: "No orders yet.",
  statusDraft: "Waiting for you", statusApproved: "Approved", statusReceived: "Received", statusRejected: "Cancelled",
  approve: "Approve", reject: "Cancel order", received: "Goods arrived", shareWhatsapp: "Send on WhatsApp",
  urgNow: "Buy now", urgSoon: "Soon", urgLater: "Later", cost: "Cost", cashLeft: "Cash left", skipped: "Not enough cash for: {items}",
  orderNote: "The app only suggests. Nothing is ordered until you approve.", ordersMade: "{count} orders prepared. Check and approve.",
  joint: "Order together with neighbours", jointHint: "Share one bulk order with nearby shops to save on delivery.",
  sendNeighbours: "Message neighbours", addNeighbour: "Add neighbour shop", neighbourName: "Shop name", phone: "Phone number",
  enterExpiry: "Expiry dates (optional)",
  khataLocked: "Customers still owe you {amount}. Collecting it gives you more cash for buying.",

  // khata
  khataTitle: "Khata", totalPending: "Total pending", addCustomer: "Add customer", customerName: "Customer name",
  owes: "owes", settled: "All clear", tookUdhar: "Took udhar", paidBack: "Paid back", amount: "Amount (₹)",
  entryDone: "Written in khata.", history: "History", remind: "Send reminder", noCustomersYet: "No customers yet.",
  remindText: "Namaste {name}, a small reminder: ₹{amount} is pending at {shop}. Thank you!",
  credit: "Took udhar", payment: "Paid",

  // settings
  settingsTitle: "Settings", shopName: "Shop name", language: "Language", weeklyBudget: "Cash for each buying round (₹)",
  coverDays: "Days one order should last", leadTime: "Days supplier takes to deliver",
  sampleTitle: "Sample shop", sampleText: "Fill the app with example items, sales and customers.",
  resetSample: "Reset with sample shop", resetWarn: "This deletes ALL your items, sales and khata. Continue?",
  about: "KiranaWise keeps your stock, sales and khata in one simple place and suggests what to buy.",

  // assistant
  assistant: "Shop assistant", tapToSpeak: "Tap and speak", listening: "Listening…", typeHere: "Or type here…", send: "Send",
  confirmQ: "Do it?", noMic: "Voice is not supported in this browser. You can type instead.", micDenied: "Please allow the microphone.",
  speakReplies: "Speak replies", examples: "Try saying", ex1: "\"Sold 5 milk\"", ex2: "\"Add 20 sugar\"",
  ex3: "\"What should I buy?\"", ex4: "\"Ramesh took 200 udhar\"", ex5: "\"What is expiring?\"",
  didNotHear: "I did not hear anything. Try again.",
  noVoice: "This device has no {language} voice, so I cannot speak {language} aloud. Replies still appear as text. For a spoken voice, try Microsoft Edge (it usually has online Kannada and Hindi voices) or, on Android, install the Google speech voice for that language.",
};

const hi = {
  ...en,
  tagline: "आपकी दुकान का साथी",
  navHome: "होम", navSell: "बिक्री", navStock: "स्टॉक", navBuy: "खरीद", navKhata: "खाता", navSettings: "सेटिंग",
  offlineTitle: "दुकान का सर्वर नहीं मिल रहा",
  offlineHelp: "बैकएंड चालू करें (uvicorn app.api:app --reload) और पेज रीफ़्रेश करें।",
  loading: "लोड हो रहा है…", retry: "फिर कोशिश करें", save: "सेव करें", cancel: "रद्द करें", close: "बंद करें", back: "वापस",
  saved: "सेव हो गया", yes: "हाँ", no: "नहीं", search: "सामान खोजें…", units: "नग", today: "आज",

  hello: "नमस्ते", todaySales: "आज की बिक्री", khataPending: "खाते में बाकी",
  attention: "इन पर ध्यान दें", allGood: "आज सब ठीक है।",
  buyNow: "मंगवाने वाला सामान", expiring: "जल्दी एक्सपायर", lowStock: "कम स्टॉक", deadStock: "नहीं बिक रहा",
  buyNowHint: "जल्दी ख़त्म होगा", expiringHint: "जल्दी बेचना है", lowHint: "आपके अलर्ट से कम", deadHint: "शेल्फ पर पैसा फँसा है",
  festivalIn: "{name} {days} दिन में है। माँग बढ़ेगी।", festivalToday: "आज {name} है!",
  quick: "जल्दी काम", askAssistant: "माइक दबाकर बस बोल दीजिए।",
  emptyShopTitle: "आपकी दुकान खाली है", emptyShopText: "अपना सामान जोड़ें, या ऐप आज़माने के लिए सैंपल दुकान लोड करें।",
  loadSample: "सैंपल दुकान लोड करें", addFirst: "सामान जोड़ें",
  moneyStuck: "फँसा हुआ पैसा", valueStock: "स्टॉक की कीमत",

  sellTitle: "बिक्री", pickItem: "सामान चुनें", howMany: "कितना?", pay: "भुगतान",
  cash: "नकद", upi: "UPI", udhar: "उधार", pickCustomer: "उधार कौन ले रहा है?", noCustomers: "पहले खाते में ग्राहक जोड़ें।",
  priceEach: "एक का दाम", saveSale: "बिक्री सेव करें", recentSales: "हाल की बिक्री", noSales: "अभी कोई बिक्री नहीं।",
  soldDone: "{qty} {name} बिका। {left} बचा।", shortWarn: "ऐप में स्टॉक कम दिख रहा था। कृपया गिनती जाँचें।",
  total: "कुल",

  stockTitle: "स्टॉक", filterAll: "सब", filterLow: "कम", filterExpiry: "एक्सपायरी", filterDead: "नहीं बिक रहा",
  addItem: "सामान जोड़ें", editItem: "सामान बदलें", itemName: "सामान का नाम", unit: "इकाई (किलो, पैकेट…)",
  inStock: "स्टॉक में", alertAt: "इस पर अलर्ट दें", costPrice: "खरीद दाम", sellPrice: "बेचने का दाम",
  otherNames: "दूसरे नाम (हिंदी, कन्नड़…)", otherNamesHint: "कॉमा से अलग करें। आवाज़ सहायक इन्हें पहचानता है।",
  supplier: "सप्लायर", shelfLife: "शेल्फ लाइफ (दिन)", shelfHint: "एक्सपायर नहीं होता तो 0",
  goodsArrived: "माल आया", qtyArrived: "कितना आया?", expiryDate: "एक्सपायरी की तारीख", addToStock: "स्टॉक में जोड़ें",
  low: "कम", expiresIn: "{days} दिन में एक्सपायर", expiresToday: "आज एक्सपायर", expired: "एक्सपायर हो गया",
  lastSold: "{days} दिन पहले बिका", neverSold: "कभी नहीं बिका", noItems: "कोई सामान नहीं मिला।", deleteItem: "सामान हटाएं",
  confirmDelete: "यह सामान हटाएं?", expiryAction: "क्या करें", moneyAtRisk: "जोखिम में पैसा",

  buyTitle: "खरीद", budget: "खरीद के लिए नकद", suggested: "क्या मंगवाना है", makeOrders: "ऑर्डर तैयार करें",
  nothingToBuy: "अभी कुछ मंगवाना नहीं है।", orders: "आपके ऑर्डर", noOrders: "अभी कोई ऑर्डर नहीं।",
  statusDraft: "आपके इंतज़ार में", statusApproved: "मंज़ूर", statusReceived: "माल आ गया", statusRejected: "रद्द",
  approve: "मंज़ूर करें", reject: "ऑर्डर रद्द करें", received: "माल आ गया", shareWhatsapp: "WhatsApp पर भेजें",
  urgNow: "अभी मंगवाएं", urgSoon: "जल्दी", urgLater: "बाद में", cost: "कीमत", cashLeft: "बचा नकद", skipped: "इनके लिए नकद कम है: {items}",
  orderNote: "ऐप सिर्फ़ सुझाव देता है। आपके मंज़ूर करने तक कुछ ऑर्डर नहीं होता।", ordersMade: "{count} ऑर्डर तैयार। देखकर मंज़ूर करें।",
  joint: "पड़ोसी दुकानों के साथ मिलकर ऑर्डर", jointHint: "पास की दुकानों के साथ एक बड़ा ऑर्डर करें, डिलीवरी खर्च बचेगा।",
  sendNeighbours: "पड़ोसियों को संदेश भेजें", addNeighbour: "पड़ोसी दुकान जोड़ें", neighbourName: "दुकान का नाम", phone: "फ़ोन नंबर",
  enterExpiry: "एक्सपायरी तारीख (ज़रूरी नहीं)",
  khataLocked: "ग्राहकों पर आपके {amount} बाकी हैं। वसूल करने से खरीद के लिए ज़्यादा नकद मिलेगा।",

  khataTitle: "खाता", totalPending: "कुल बाकी", addCustomer: "ग्राहक जोड़ें", customerName: "ग्राहक का नाम",
  owes: "बाकी", settled: "हिसाब बराबर", tookUdhar: "उधार लिया", paidBack: "पैसे दिए", amount: "रकम (₹)",
  entryDone: "खाते में लिख दिया।", history: "इतिहास", remind: "याद दिलाएं", noCustomersYet: "अभी कोई ग्राहक नहीं।",
  remindText: "नमस्ते {name}, छोटी सी याद: {shop} में ₹{amount} बाकी है। धन्यवाद!",
  credit: "उधार लिया", payment: "जमा",

  settingsTitle: "सेटिंग", shopName: "दुकान का नाम", language: "भाषा", weeklyBudget: "हर खरीद के लिए नकद (₹)",
  coverDays: "एक ऑर्डर कितने दिन चले", leadTime: "सप्लायर कितने दिन में माल देता है",
  sampleTitle: "सैंपल दुकान", sampleText: "ऐप में उदाहरण सामान, बिक्री और ग्राहक भरें।",
  resetSample: "सैंपल दुकान से रीसेट करें", resetWarn: "इससे आपका सारा सामान, बिक्री और खाता मिट जाएगा। जारी रखें?",
  about: "KiranaWise आपका स्टॉक, बिक्री और खाता एक जगह रखता है और बताता है क्या मंगवाना है।",

  assistant: "दुकान सहायक", tapToSpeak: "दबाएं और बोलें", listening: "सुन रहा हूँ…", typeHere: "या यहाँ लिखें…", send: "भेजें",
  confirmQ: "करना है?", noMic: "इस ब्राउज़र में आवाज़ काम नहीं करती। आप लिख सकते हैं।", micDenied: "कृपया माइक की अनुमति दें।",
  speakReplies: "जवाब बोलकर सुनाएं", examples: "ऐसे बोलें", ex1: "\"5 दूध बेचा\"", ex2: "\"20 चीनी आई\"",
  ex3: "\"क्या मंगवाना है?\"", ex4: "\"रमेश ने 200 उधार लिया\"", ex5: "\"क्या एक्सपायर हो रहा है?\"",
  didNotHear: "कुछ सुनाई नहीं दिया। फिर कोशिश करें।",
  noVoice: "इस डिवाइस में {language} आवाज़ नहीं है, इसलिए मैं {language} बोलकर नहीं सुना सकता। जवाब लिखे हुए दिखते रहेंगे। बोलकर सुनने के लिए Microsoft Edge आज़माएँ (उसमें आमतौर पर ऑनलाइन हिंदी और कन्नड़ आवाज़ें होती हैं) या Android पर उस भाषा की Google आवाज़ इंस्टॉल करें।",
};

const kn = {
  ...en,
  tagline: "ನಿಮ್ಮ ಅಂಗಡಿಯ ಸಹಾಯಕ",
  navHome: "ಮುಖಪುಟ", navSell: "ಮಾರಾಟ", navStock: "ಸ್ಟಾಕ್", navBuy: "ಖರೀದಿ", navKhata: "ಖಾತಾ", navSettings: "ಸೆಟ್ಟಿಂಗ್",
  offlineTitle: "ಅಂಗಡಿ ಸರ್ವರ್ ಸಿಗುತ್ತಿಲ್ಲ",
  offlineHelp: "ಬ್ಯಾಕೆಂಡ್ ಆರಂಭಿಸಿ (uvicorn app.api:app --reload) ಮತ್ತು ಪುಟವನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ.",
  loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ…", retry: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ", save: "ಉಳಿಸಿ", cancel: "ರದ್ದು", close: "ಮುಚ್ಚಿ", back: "ಹಿಂದೆ",
  saved: "ಉಳಿಸಲಾಗಿದೆ", yes: "ಹೌದು", no: "ಇಲ್ಲ", search: "ವಸ್ತು ಹುಡುಕಿ…", units: "ಸಂಖ್ಯೆ", today: "ಇಂದು",

  hello: "ನಮಸ್ಕಾರ", todaySales: "ಇಂದಿನ ಮಾರಾಟ", khataPending: "ಖಾತಾ ಬಾಕಿ",
  attention: "ಗಮನ ಕೊಡಿ", allGood: "ಇಂದು ಎಲ್ಲವೂ ಸರಿಯಾಗಿದೆ.",
  buyNow: "ತರಬೇಕಾದ ವಸ್ತುಗಳು", expiring: "ಶೀಘ್ರ ಅವಧಿ ಮುಗಿಯುವುದು", lowStock: "ಕಡಿಮೆ ಸ್ಟಾಕ್", deadStock: "ಮಾರಾಟವಾಗುತ್ತಿಲ್ಲ",
  buyNowHint: "ಬೇಗ ಮುಗಿಯುತ್ತದೆ", expiringHint: "ಬೇಗ ಮಾರಬೇಕು", lowHint: "ನಿಮ್ಮ ಎಚ್ಚರಿಕೆಗಿಂತ ಕಡಿಮೆ", deadHint: "ಶೆಲ್ಫ್‌ನಲ್ಲಿ ಹಣ ಸಿಕ್ಕಿಹಾಕಿಕೊಂಡಿದೆ",
  festivalIn: "{name} {days} ದಿನಗಳಲ್ಲಿ ಇದೆ. ಬೇಡಿಕೆ ಹೆಚ್ಚಾಗುತ್ತದೆ.", festivalToday: "ಇಂದು {name}!",
  quick: "ತ್ವರಿತ ಕೆಲಸ", askAssistant: "ಮೈಕ್ ಒತ್ತಿ ಬೇಕಾದದ್ದನ್ನು ಹೇಳಿ.",
  emptyShopTitle: "ನಿಮ್ಮ ಅಂಗಡಿ ಖಾಲಿ ಇದೆ", emptyShopText: "ನಿಮ್ಮ ವಸ್ತುಗಳನ್ನು ಸೇರಿಸಿ, ಅಥವಾ ಆ್ಯಪ್ ಪ್ರಯತ್ನಿಸಲು ಮಾದರಿ ಅಂಗಡಿ ಲೋಡ್ ಮಾಡಿ.",
  loadSample: "ಮಾದರಿ ಅಂಗಡಿ ಲೋಡ್ ಮಾಡಿ", addFirst: "ವಸ್ತು ಸೇರಿಸಿ",
  moneyStuck: "ಸಿಕ್ಕಿಹಾಕಿಕೊಂಡ ಹಣ", valueStock: "ಸ್ಟಾಕ್ ಮೌಲ್ಯ",

  sellTitle: "ಮಾರಾಟ", pickItem: "ವಸ್ತು ಆಯ್ಕೆಮಾಡಿ", howMany: "ಎಷ್ಟು?", pay: "ಪಾವತಿ",
  cash: "ನಗದು", upi: "UPI", udhar: "ಉದ್ರಿ", pickCustomer: "ಉದ್ರಿ ಯಾರು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದಾರೆ?", noCustomers: "ಮೊದಲು ಖಾತಾದಲ್ಲಿ ಗ್ರಾಹಕರನ್ನು ಸೇರಿಸಿ.",
  priceEach: "ಒಂದಕ್ಕೆ ಬೆಲೆ", saveSale: "ಮಾರಾಟ ಉಳಿಸಿ", recentSales: "ಇತ್ತೀಚಿನ ಮಾರಾಟ", noSales: "ಇನ್ನೂ ಮಾರಾಟ ಇಲ್ಲ.",
  soldDone: "{qty} {name} ಮಾರಾಟ. {left} ಉಳಿದಿದೆ.", shortWarn: "ಆ್ಯಪ್‌ನಲ್ಲಿ ಕಡಿಮೆ ಸ್ಟಾಕ್ ಇತ್ತು. ಎಣಿಕೆ ಪರಿಶೀಲಿಸಿ.",
  total: "ಒಟ್ಟು",

  stockTitle: "ಸ್ಟಾಕ್", filterAll: "ಎಲ್ಲಾ", filterLow: "ಕಡಿಮೆ", filterExpiry: "ಅವಧಿ", filterDead: "ಮಾರಾಟವಿಲ್ಲ",
  addItem: "ವಸ್ತು ಸೇರಿಸಿ", editItem: "ವಸ್ತು ಬದಲಿಸಿ", itemName: "ವಸ್ತುವಿನ ಹೆಸರು", unit: "ಘಟಕ (ಕೆಜಿ, ಪ್ಯಾಕೆಟ್…)",
  inStock: "ಸ್ಟಾಕ್‌ನಲ್ಲಿ", alertAt: "ಈ ಪ್ರಮಾಣಕ್ಕೆ ಎಚ್ಚರಿಸಿ", costPrice: "ಖರೀದಿ ಬೆಲೆ", sellPrice: "ಮಾರಾಟ ಬೆಲೆ",
  otherNames: "ಇತರ ಹೆಸರುಗಳು (ಹಿಂದಿ, ಕನ್ನಡ…)", otherNamesHint: "ಕಾಮಾದಿಂದ ಬೇರ್ಪಡಿಸಿ. ಧ್ವನಿ ಸಹಾಯಕ ಇವುಗಳನ್ನು ಗುರುತಿಸುತ್ತದೆ.",
  supplier: "ಸರಬರಾಜುದಾರ", shelfLife: "ಶೆಲ್ಫ್ ಲೈಫ್ (ದಿನ)", shelfHint: "ಅವಧಿ ಮುಗಿಯದಿದ್ದರೆ 0",
  goodsArrived: "ಸರಕು ಬಂತು", qtyArrived: "ಎಷ್ಟು ಬಂತು?", expiryDate: "ಅವಧಿ ಮುಗಿಯುವ ದಿನಾಂಕ", addToStock: "ಸ್ಟಾಕ್‌ಗೆ ಸೇರಿಸಿ",
  low: "ಕಡಿಮೆ", expiresIn: "{days} ದಿನಗಳಲ್ಲಿ ಅವಧಿ ಮುಗಿಯುತ್ತದೆ", expiresToday: "ಇಂದು ಅವಧಿ ಮುಗಿಯುತ್ತದೆ", expired: "ಅವಧಿ ಮುಗಿದಿದೆ",
  lastSold: "{days} ದಿನಗಳ ಹಿಂದೆ ಮಾರಾಟ", neverSold: "ಎಂದೂ ಮಾರಾಟವಾಗಿಲ್ಲ", noItems: "ವಸ್ತುಗಳು ಸಿಗಲಿಲ್ಲ.", deleteItem: "ವಸ್ತು ತೆಗೆಯಿರಿ",
  confirmDelete: "ಈ ವಸ್ತುವನ್ನು ತೆಗೆಯಬೇಕೇ?", expiryAction: "ಏನು ಮಾಡಬೇಕು", moneyAtRisk: "ಅಪಾಯದಲ್ಲಿರುವ ಹಣ",

  buyTitle: "ಖರೀದಿ", budget: "ಖರೀದಿಗೆ ನಗದು", suggested: "ಏನು ತರಬೇಕು", makeOrders: "ಆರ್ಡರ್ ಸಿದ್ಧಪಡಿಸಿ",
  nothingToBuy: "ಈಗ ತರಬೇಕಾದದ್ದು ಏನೂ ಇಲ್ಲ.", orders: "ನಿಮ್ಮ ಆರ್ಡರ್‌ಗಳು", noOrders: "ಇನ್ನೂ ಆರ್ಡರ್ ಇಲ್ಲ.",
  statusDraft: "ನಿಮಗಾಗಿ ಕಾಯುತ್ತಿದೆ", statusApproved: "ಒಪ್ಪಿಗೆ ನೀಡಲಾಗಿದೆ", statusReceived: "ಸರಕು ಬಂದಿದೆ", statusRejected: "ರದ್ದಾಗಿದೆ",
  approve: "ಒಪ್ಪಿಗೆ ನೀಡಿ", reject: "ಆರ್ಡರ್ ರದ್ದು ಮಾಡಿ", received: "ಸರಕು ಬಂತು", shareWhatsapp: "WhatsApp ನಲ್ಲಿ ಕಳುಹಿಸಿ",
  urgNow: "ಈಗಲೇ ತನ್ನಿ", urgSoon: "ಬೇಗ", urgLater: "ನಂತರ", cost: "ಬೆಲೆ", cashLeft: "ಉಳಿದ ನಗದು", skipped: "ಇವುಗಳಿಗೆ ನಗದು ಸಾಲದು: {items}",
  orderNote: "ಆ್ಯಪ್ ಕೇವಲ ಸಲಹೆ ನೀಡುತ್ತದೆ. ನೀವು ಒಪ್ಪುವವರೆಗೆ ಏನೂ ಆರ್ಡರ್ ಆಗುವುದಿಲ್ಲ.", ordersMade: "{count} ಆರ್ಡರ್ ಸಿದ್ಧ. ನೋಡಿ ಒಪ್ಪಿಗೆ ನೀಡಿ.",
  joint: "ಪಕ್ಕದ ಅಂಗಡಿಗಳೊಂದಿಗೆ ಸೇರಿ ಆರ್ಡರ್", jointHint: "ಹತ್ತಿರದ ಅಂಗಡಿಗಳೊಂದಿಗೆ ಒಂದೇ ದೊಡ್ಡ ಆರ್ಡರ್ ಮಾಡಿ, ಡೆಲಿವರಿ ಖರ್ಚು ಉಳಿಸಿ.",
  sendNeighbours: "ಪಕ್ಕದವರಿಗೆ ಸಂದೇಶ ಕಳುಹಿಸಿ", addNeighbour: "ಪಕ್ಕದ ಅಂಗಡಿ ಸೇರಿಸಿ", neighbourName: "ಅಂಗಡಿ ಹೆಸರು", phone: "ಫೋನ್ ಸಂಖ್ಯೆ",
  enterExpiry: "ಅವಧಿ ದಿನಾಂಕ (ಐಚ್ಛಿಕ)",
  khataLocked: "ಗ್ರಾಹಕರಿಂದ ನಿಮಗೆ {amount} ಬರಬೇಕಿದೆ. ಅದನ್ನು ವಸೂಲಿ ಮಾಡಿದರೆ ಖರೀದಿಗೆ ಹೆಚ್ಚು ನಗದು ಸಿಗುತ್ತದೆ.",

  khataTitle: "ಖಾತಾ", totalPending: "ಒಟ್ಟು ಬಾಕಿ", addCustomer: "ಗ್ರಾಹಕರನ್ನು ಸೇರಿಸಿ", customerName: "ಗ್ರಾಹಕರ ಹೆಸರು",
  owes: "ಬಾಕಿ", settled: "ಲೆಕ್ಕ ಸರಿ", tookUdhar: "ಉದ್ರಿ ತೆಗೆದುಕೊಂಡರು", paidBack: "ಹಣ ಕೊಟ್ಟರು", amount: "ಮೊತ್ತ (₹)",
  entryDone: "ಖಾತಾದಲ್ಲಿ ಬರೆದಿದೆ.", history: "ಇತಿಹಾಸ", remind: "ನೆನಪಿಸಿ", noCustomersYet: "ಇನ್ನೂ ಗ್ರಾಹಕರಿಲ್ಲ.",
  remindText: "ನಮಸ್ಕಾರ {name}, ಸಣ್ಣ ನೆನಪು: {shop} ನಲ್ಲಿ ₹{amount} ಬಾಕಿ ಇದೆ. ಧನ್ಯವಾದ!",
  credit: "ಉದ್ರಿ", payment: "ಪಾವತಿ",

  settingsTitle: "ಸೆಟ್ಟಿಂಗ್", shopName: "ಅಂಗಡಿ ಹೆಸರು", language: "ಭಾಷೆ", weeklyBudget: "ಪ್ರತಿ ಖರೀದಿಗೆ ನಗದು (₹)",
  coverDays: "ಒಂದು ಆರ್ಡರ್ ಎಷ್ಟು ದಿನ ಬರಬೇಕು", leadTime: "ಸರಬರಾಜುದಾರ ಎಷ್ಟು ದಿನಗಳಲ್ಲಿ ತಲುಪಿಸುತ್ತಾರೆ",
  sampleTitle: "ಮಾದರಿ ಅಂಗಡಿ", sampleText: "ಆ್ಯಪ್‌ನಲ್ಲಿ ಉದಾಹರಣೆ ವಸ್ತುಗಳು, ಮಾರಾಟ ಮತ್ತು ಗ್ರಾಹಕರನ್ನು ತುಂಬಿ.",
  resetSample: "ಮಾದರಿ ಅಂಗಡಿಯೊಂದಿಗೆ ರೀಸೆಟ್", resetWarn: "ಇದು ನಿಮ್ಮ ಎಲ್ಲಾ ವಸ್ತುಗಳು, ಮಾರಾಟ ಮತ್ತು ಖಾತಾವನ್ನು ಅಳಿಸುತ್ತದೆ. ಮುಂದುವರಿಯಬೇಕೇ?",
  about: "KiranaWise ನಿಮ್ಮ ಸ್ಟಾಕ್, ಮಾರಾಟ ಮತ್ತು ಖಾತಾವನ್ನು ಒಂದೇ ಕಡೆ ಇಟ್ಟು ಏನು ತರಬೇಕೆಂದು ಸೂಚಿಸುತ್ತದೆ.",

  assistant: "ಅಂಗಡಿ ಸಹಾಯಕ", tapToSpeak: "ಒತ್ತಿ ಮಾತನಾಡಿ", listening: "ಕೇಳುತ್ತಿದ್ದೇನೆ…", typeHere: "ಅಥವಾ ಇಲ್ಲಿ ಬರೆಯಿರಿ…", send: "ಕಳುಹಿಸಿ",
  confirmQ: "ಮಾಡಬೇಕೇ?", noMic: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಬೆಂಬಲ ಇಲ್ಲ. ನೀವು ಬರೆಯಬಹುದು.", micDenied: "ದಯವಿಟ್ಟು ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿಸಿ.",
  speakReplies: "ಉತ್ತರವನ್ನು ಓದಿ ಹೇಳಿ", examples: "ಹೀಗೆ ಹೇಳಿ", ex1: "\"5 ಹಾಲು ಮಾರಿದೆ\"", ex2: "\"20 ಸಕ್ಕರೆ ಬಂತು\"",
  ex3: "\"ಏನು ತರಬೇಕು?\"", ex4: "\"ರಮೇಶ್ 200 ಉದ್ರಿ ತೆಗೆದುಕೊಂಡ\"", ex5: "\"ಯಾವುದು ಎಕ್ಸ್‌ಪೈರ್ ಆಗುತ್ತಿದೆ?\"",
  didNotHear: "ಏನೂ ಕೇಳಿಸಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
  noVoice: "ಈ ಸಾಧನದಲ್ಲಿ {language} ಧ್ವನಿ ಇಲ್ಲ, ಆದ್ದರಿಂದ ನಾನು {language}ದಲ್ಲಿ ಜೋರಾಗಿ ಹೇಳಲಾರೆ. ಉತ್ತರಗಳು ಬರಹದಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ. ಧ್ವನಿ ಕೇಳಲು Microsoft Edge ಪ್ರಯತ್ನಿಸಿ (ಅದರಲ್ಲಿ ಸಾಮಾನ್ಯವಾಗಿ ಆನ್‌ಲೈನ್ ಕನ್ನಡ ಮತ್ತು ಹಿಂದಿ ಧ್ವನಿಗಳಿರುತ್ತವೆ) ಅಥವಾ Android ನಲ್ಲಿ ಆ ಭಾಷೆಯ Google ಧ್ವನಿ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ.",
};

export const STRINGS = { en, hi, kn };

/** Fill {placeholders} in a translated sentence. */
export function fill(text, values = {}) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => (values[key] ?? ""));
}
