/* =====================================================================
   GetInterest — indicative bank rate cards
   ---------------------------------------------------------------------
   These are INDICATIVE STARTING rates compiled from public rate cards.
   Real offers depend on credit score, income, loan-to-value, tenure and
   relationship pricing. Always confirm with the bank before you borrow.

   To refresh: edit the numbers below and bump `updated`. Nothing else in
   the app hard-codes a rate — every table, dropdown and comparison reads
   from this file.

   type:  public | private | islamic | nbfc | online
          "islamic" banks are Sharia-compliant: what is shown is a
          PROFIT RATE under murabaha/ijara, not interest. The UI relabels
          automatically via region.rateWord / bank.type.
   ===================================================================== */
window.GI_DATA = {
  updated: "2026-08-01",

  productOrder: ["home", "car", "personal", "deposit1y", "deposit5y"],

  regions: {
    IN: {
      name: "India", currency: "INR", flag: "🇮🇳", group: "Asia", rateWord: "interest",
      labels: { home: "Home loan", car: "Car loan", personal: "Personal loan", deposit1y: "FD · 1 yr", deposit5y: "FD · 5 yr" },
      defaults: { home: [5000000, 8.5, 20], car: [900000, 9.2, 7], personal: [600000, 11.5, 5] },
      fdCompounding: 4,
      note: "Indian home loans are usually floating and repriced against the repo-linked lending rate. FD rates shown are for the general public; senior citizens typically get 40–50 bps more.",
      banks: [
        { name: "State Bank of India",     short: "SBI",        type: "public",  rates: { home: 8.40, car: 9.05, personal: 11.15, deposit1y: 6.80, deposit5y: 6.50 } },
        { name: "HDFC Bank",               short: "HDFC",       type: "private", rates: { home: 8.50, car: 9.20, personal: 10.85, deposit1y: 6.60, deposit5y: 7.00 } },
        { name: "ICICI Bank",              short: "ICICI",      type: "private", rates: { home: 8.55, car: 9.10, personal: 10.80, deposit1y: 6.70, deposit5y: 6.90 } },
        { name: "Axis Bank",               short: "Axis",       type: "private", rates: { home: 8.70, car: 9.30, personal: 11.10, deposit1y: 6.70, deposit5y: 7.00 } },
        { name: "Kotak Mahindra Bank",     short: "Kotak",      type: "private", rates: { home: 8.65, car: 9.15, personal: 10.99, deposit1y: 7.00, deposit5y: 6.20 } },
        { name: "Punjab National Bank",    short: "PNB",        type: "public",  rates: { home: 8.45, car: 9.25, personal: 11.40, deposit1y: 6.80, deposit5y: 6.50 } },
        { name: "Bank of Baroda",          short: "BoB",        type: "public",  rates: { home: 8.40, car: 9.15, personal: 11.05, deposit1y: 6.85, deposit5y: 6.50 } },
        { name: "Canara Bank",             short: "Canara",     type: "public",  rates: { home: 8.50, car: 9.00, personal: 11.25, deposit1y: 6.85, deposit5y: 6.70 } },
        { name: "Union Bank of India",     short: "Union",      type: "public",  rates: { home: 8.35, car: 9.10, personal: 11.35, deposit1y: 6.75, deposit5y: 6.50 } },
        { name: "IDFC FIRST Bank",         short: "IDFC FIRST", type: "private", rates: { home: 8.85, car: 9.40, personal: 10.75, deposit1y: 7.25, deposit5y: 7.25 } },
        { name: "LIC Housing Finance",     short: "LIC HFL",    type: "nbfc",    rates: { home: 8.45, car: null, personal: null, deposit1y: 7.05, deposit5y: 7.35 } },
        { name: "Bajaj Finserv",           short: "Bajaj",      type: "nbfc",    rates: { home: 8.60, car: null, personal: 11.00, deposit1y: 7.40, deposit5y: 7.60 } }
      ]
    },

    US: {
      name: "United States", currency: "USD", flag: "🇺🇸", group: "Americas", rateWord: "interest",
      labels: { home: "30-yr mortgage", car: "Auto loan", personal: "Personal loan", deposit1y: "1-yr CD APY", deposit5y: "5-yr CD APY" },
      defaults: { home: [400000, 6.6, 30], car: [35000, 7.1, 6], personal: [20000, 11.9, 4] },
      fdCompounding: 12,
      note: "US mortgage rates are quoted as an APR before points and closing costs. CD yields are APY — already annualised — so a CD row is compared like-for-like with a savings APY.",
      banks: [
        { name: "Chase",                   short: "Chase",      type: "private", rates: { home: 6.63, car: 7.09, personal: null,  deposit1y: 3.75, deposit5y: 3.20 } },
        { name: "Bank of America",         short: "BofA",       type: "private", rates: { home: 6.70, car: 6.99, personal: null,  deposit1y: 3.60, deposit5y: 3.10 } },
        { name: "Wells Fargo",             short: "Wells",      type: "private", rates: { home: 6.68, car: 7.24, personal: 11.49, deposit1y: 3.55, deposit5y: 3.05 } },
        { name: "Citibank",                short: "Citi",       type: "private", rates: { home: 6.75, car: null,  personal: 11.99, deposit1y: 3.80, deposit5y: 3.15 } },
        { name: "U.S. Bank",               short: "US Bank",    type: "private", rates: { home: 6.72, car: 7.34, personal: 12.24, deposit1y: 3.65, deposit5y: 3.10 } },
        { name: "PNC Bank",                short: "PNC",        type: "private", rates: { home: 6.78, car: 7.19, personal: 11.79, deposit1y: 3.70, deposit5y: 3.05 } },
        { name: "Truist",                  short: "Truist",     type: "private", rates: { home: 6.74, car: 7.29, personal: 11.69, deposit1y: 3.50, deposit5y: 3.00 } },
        { name: "Capital One",             short: "Cap One",    type: "private", rates: { home: null, car: 7.44, personal: null,  deposit1y: 4.00, deposit5y: 3.50 } },
        { name: "Ally Bank",               short: "Ally",       type: "online",  rates: { home: 6.55, car: 7.15, personal: null,  deposit1y: 4.10, deposit5y: 3.60 } },
        { name: "Discover Bank",           short: "Discover",   type: "online",  rates: { home: null, car: null,  personal: 12.99, deposit1y: 4.05, deposit5y: 3.65 } },
        { name: "Marcus by Goldman Sachs", short: "Marcus",     type: "online",  rates: { home: null, car: null,  personal: 11.99, deposit1y: 4.15, deposit5y: 3.70 } },
        { name: "SoFi",                    short: "SoFi",       type: "online",  rates: { home: 6.60, car: null,  personal: 10.99, deposit1y: 3.95, deposit5y: 3.40 } }
      ]
    },

    AE: {
      name: "United Arab Emirates", currency: "AED", flag: "🇦🇪", group: "GCC", rateWord: "interest",
      labels: { home: "Mortgage", car: "Auto finance", personal: "Personal finance", deposit1y: "1-yr deposit", deposit5y: "3-yr deposit" },
      defaults: { home: [1500000, 4.5, 25], car: [120000, 3.5, 5], personal: [200000, 6.5, 4] },
      fdCompounding: 4,
      note: "UAE mortgages are capped at 80% LTV for expatriate first-time buyers (85% for nationals). Islamic banks quote a profit rate under ijara or murabaha rather than interest — the maths in this calculator is identical, the contract is not.",
      banks: [
        { name: "Emirates NBD",              short: "ENBD",     type: "private", rates: { home: 4.49, car: 3.49, personal: 6.49, deposit1y: 4.00, deposit5y: 3.80 } },
        { name: "First Abu Dhabi Bank",      short: "FAB",      type: "private", rates: { home: 4.39, car: 3.29, personal: 6.25, deposit1y: 4.10, deposit5y: 3.85 } },
        { name: "Abu Dhabi Commercial Bank", short: "ADCB",     type: "private", rates: { home: 4.55, car: 3.55, personal: 6.75, deposit1y: 3.95, deposit5y: 3.70 } },
        { name: "Mashreq Bank",              short: "Mashreq",  type: "private", rates: { home: 4.65, car: 3.65, personal: 6.99, deposit1y: 4.05, deposit5y: 3.75 } },
        { name: "RAKBANK",                   short: "RAKBANK",  type: "private", rates: { home: 4.75, car: 3.75, personal: 7.25, deposit1y: 4.15, deposit5y: 3.90 } },
        { name: "Dubai Islamic Bank",        short: "DIB",      type: "islamic", rates: { home: 4.59, car: 3.45, personal: 6.60, deposit1y: 3.90, deposit5y: 3.65 } },
        { name: "Abu Dhabi Islamic Bank",    short: "ADIB",     type: "islamic", rates: { home: 4.62, car: 3.50, personal: 6.70, deposit1y: 3.85, deposit5y: 3.60 } },
        { name: "Emirates Islamic",          short: "EI",       type: "islamic", rates: { home: 4.69, car: 3.60, personal: 6.85, deposit1y: 3.88, deposit5y: 3.62 } }
      ]
    },

    SA: {
      name: "Saudi Arabia", currency: "SAR", flag: "🇸🇦", group: "GCC", rateWord: "profit",
      labels: { home: "Home finance", car: "Auto finance", personal: "Personal finance", deposit1y: "1-yr deposit", deposit5y: "3-yr deposit" },
      defaults: { home: [900000, 5.2, 20], car: [110000, 4.4, 5], personal: [150000, 6.9, 5] },
      fdCompounding: 4,
      note: "Retail finance in Saudi Arabia is overwhelmingly Sharia-compliant, so what banks publish is an annual PROFIT rate under murabaha or ijara. The monthly instalment maths matches a conventional amortising loan; the legal structure and early-settlement rules differ.",
      banks: [
        { name: "Al Rajhi Bank",             short: "Al Rajhi", type: "islamic", rates: { home: 5.15, car: 4.35, personal: 6.75, deposit1y: 4.30, deposit5y: 4.05 } },
        { name: "Saudi National Bank",       short: "SNB",      type: "islamic", rates: { home: 5.25, car: 4.45, personal: 6.90, deposit1y: 4.25, deposit5y: 4.00 } },
        { name: "Riyad Bank",                short: "Riyad",    type: "private", rates: { home: 5.35, car: 4.55, personal: 7.10, deposit1y: 4.20, deposit5y: 3.95 } },
        { name: "Banque Saudi Fransi",       short: "BSF",      type: "private", rates: { home: 5.45, car: 4.65, personal: 7.25, deposit1y: 4.15, deposit5y: 3.90 } },
        { name: "Alinma Bank",               short: "Alinma",   type: "islamic", rates: { home: 5.30, car: 4.40, personal: 6.95, deposit1y: 4.35, deposit5y: 4.10 } },
        { name: "Arab National Bank",        short: "ANB",      type: "private", rates: { home: 5.40, car: 4.60, personal: 7.15, deposit1y: 4.18, deposit5y: 3.92 } }
      ]
    },

    QA: {
      name: "Qatar", currency: "QAR", flag: "🇶🇦", group: "GCC", rateWord: "interest",
      labels: { home: "Home finance", car: "Auto finance", personal: "Personal loan", deposit1y: "1-yr deposit", deposit5y: "3-yr deposit" },
      defaults: { home: [1200000, 5.0, 20], car: [120000, 4.0, 5], personal: [200000, 5.5, 6] },
      fdCompounding: 4,
      note: "Qatar Central Bank caps personal loan tenure for nationals and expatriates separately, and limits total instalments to a share of monthly salary. Check your eligibility band before you model a long tenure.",
      banks: [
        { name: "Qatar National Bank",       short: "QNB",      type: "private", rates: { home: 4.95, car: 3.95, personal: 5.49, deposit1y: 4.20, deposit5y: 3.95 } },
        { name: "Qatar Islamic Bank",        short: "QIB",      type: "islamic", rates: { home: 5.05, car: 4.05, personal: 5.60, deposit1y: 4.15, deposit5y: 3.90 } },
        { name: "Commercial Bank of Qatar",  short: "CBQ",      type: "private", rates: { home: 5.15, car: 4.15, personal: 5.75, deposit1y: 4.10, deposit5y: 3.85 } },
        { name: "Doha Bank",                 short: "Doha",     type: "private", rates: { home: 5.25, car: 4.25, personal: 5.90, deposit1y: 4.05, deposit5y: 3.80 } },
        { name: "Dukhan Bank",               short: "Dukhan",   type: "islamic", rates: { home: 5.10, car: 4.10, personal: 5.65, deposit1y: 4.12, deposit5y: 3.88 } }
      ]
    },

    KW: {
      name: "Kuwait", currency: "KWD", flag: "🇰🇼", group: "GCC", rateWord: "interest",
      labels: { home: "Housing finance", car: "Auto finance", personal: "Personal loan", deposit1y: "1-yr deposit", deposit5y: "3-yr deposit" },
      defaults: { home: [70000, 5.5, 15], car: [8000, 4.5, 5], personal: [25000, 5.5, 5] },
      fdCompounding: 4,
      note: "Central Bank of Kuwait rules cap consumer loans at 25× monthly salary (up to a ceiling) over a maximum 15-year term, and tie the ceiling rate to the discount rate. Model within those limits.",
      banks: [
        { name: "National Bank of Kuwait",   short: "NBK",      type: "private", rates: { home: 5.25, car: 4.25, personal: 5.25, deposit1y: 3.60, deposit5y: 3.40 } },
        { name: "Kuwait Finance House",      short: "KFH",      type: "islamic", rates: { home: 5.35, car: 4.35, personal: 5.35, deposit1y: 3.55, deposit5y: 3.35 } },
        { name: "Gulf Bank",                 short: "Gulf",     type: "private", rates: { home: 5.45, car: 4.45, personal: 5.45, deposit1y: 3.50, deposit5y: 3.30 } },
        { name: "Burgan Bank",               short: "Burgan",   type: "private", rates: { home: 5.50, car: 4.50, personal: 5.50, deposit1y: 3.48, deposit5y: 3.28 } },
        { name: "Boubyan Bank",              short: "Boubyan",  type: "islamic", rates: { home: 5.30, car: 4.30, personal: 5.30, deposit1y: 3.58, deposit5y: 3.38 } }
      ]
    },

    BH: {
      name: "Bahrain", currency: "BHD", flag: "🇧🇭", group: "GCC", rateWord: "interest",
      labels: { home: "Home finance", car: "Auto finance", personal: "Personal loan", deposit1y: "1-yr deposit", deposit5y: "3-yr deposit" },
      defaults: { home: [90000, 5.4, 20], car: [9000, 4.6, 5], personal: [20000, 5.8, 5] },
      fdCompounding: 4,
      note: "The Bahraini dinar is pegged to the US dollar, so local deposit and lending rates track US policy rates closely — expect repricing when the Fed moves.",
      banks: [
        { name: "National Bank of Bahrain",  short: "NBB",      type: "private", rates: { home: 5.30, car: 4.50, personal: 5.70, deposit1y: 4.00, deposit5y: 3.75 } },
        { name: "Bank of Bahrain and Kuwait", short: "BBK",     type: "private", rates: { home: 5.40, car: 4.60, personal: 5.85, deposit1y: 3.95, deposit5y: 3.70 } },
        { name: "Al Salam Bank",             short: "Al Salam", type: "islamic", rates: { home: 5.45, car: 4.65, personal: 5.90, deposit1y: 3.90, deposit5y: 3.65 } },
        { name: "Bahrain Islamic Bank",      short: "BisB",     type: "islamic", rates: { home: 5.50, car: 4.70, personal: 5.95, deposit1y: 3.88, deposit5y: 3.62 } }
      ]
    },

    OM: {
      name: "Oman", currency: "OMR", flag: "🇴🇲", group: "GCC", rateWord: "interest",
      labels: { home: "Housing finance", car: "Auto finance", personal: "Personal loan", deposit1y: "1-yr deposit", deposit5y: "3-yr deposit" },
      defaults: { home: [60000, 5.6, 20], car: [7000, 4.8, 5], personal: [18000, 5.9, 6] },
      fdCompounding: 4,
      note: "The Central Bank of Oman caps the personal-loan interest rate and limits instalment-to-salary ratios. Published rates are ceilings as much as offers.",
      banks: [
        { name: "Bank Muscat",               short: "Muscat",   type: "private", rates: { home: 5.50, car: 4.75, personal: 5.80, deposit1y: 3.80, deposit5y: 3.60 } },
        { name: "Bank Dhofar",               short: "Dhofar",   type: "private", rates: { home: 5.60, car: 4.85, personal: 5.90, deposit1y: 3.75, deposit5y: 3.55 } },
        { name: "National Bank of Oman",     short: "NBO",      type: "private", rates: { home: 5.65, car: 4.90, personal: 5.95, deposit1y: 3.72, deposit5y: 3.52 } },
        { name: "Sohar International",       short: "Sohar",    type: "private", rates: { home: 5.70, car: 4.95, personal: 6.00, deposit1y: 3.70, deposit5y: 3.50 } },
        { name: "Bank Nizwa",                short: "Nizwa",    type: "islamic", rates: { home: 5.55, car: 4.80, personal: 5.85, deposit1y: 3.78, deposit5y: 3.58 } }
      ]
    }
  }
};
