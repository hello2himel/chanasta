/**
 * Copy for the public surfaces (landing, supporter page, thanks, embed, 404).
 *
 * Design rule (docs/redesign.md §5.8): page copy lives with the page as
 * `{ bn, en }` pairs instead of `src/lib/i18n.ts` (Lead-owned). The language
 * toggle re-renders the whole route, so reading `ctx.lang` once per render is
 * enough. Shared honesty lines still come from `ctx.t(...)` so there is one
 * canonical wording for the compliance copy.
 *
 * Bangla is natural, uses `আপনি`, and is adapted from the supplied boards —
 * not machine transliteration. English is the secondary voice, never a literal
 * gloss. Nothing here may imply that Chanasta processes, holds or confirms
 * money.
 */
import type { Lang } from "../lib/types.ts";

export interface CopyPair {
  bn: string;
  en: string;
}

export interface CopyList {
  bn: readonly string[];
  en: readonly string[];
}

/** `pick(ctx.lang)` returns a reader for one copy pair. */
export function pick(lang: Lang): (value: CopyPair) => string {
  return (value) => value[lang];
}

export function pickText(lang: Lang, value: CopyPair): string {
  return value[lang];
}

export function pickList(lang: Lang, value: CopyList): readonly string[] {
  return value[lang];
}

const pair = (bn: string, en: string): CopyPair => ({ bn, en });
const list = (bn: readonly string[], en: readonly string[]): CopyList => ({ bn, en });

export const COPY = {
  landing: {
    eyebrow: pair("বাংলাদেশের জন্য · Made for Bangladesh", "Made for Bangladesh · বাংলাদেশের জন্য"),

    heroTitleA: pair("এক কাপ", "Buy me a cup of"),
    heroTitleAccent: pair("চা", "tea"),
    heroTitleB: pair("খাওয়ান", ""),
    heroSub: pair(
      "Buy me a cup of tea — straight from your own app.",
      "এক কাপ চা — সোজা আপনার নিজের অ্যাপ থেকে।",
    ),
    heroLead: pair(
      "একটা লিংক। আপনার নিজের বিকাশ QR। সমর্থকেরা নিজের অ্যাপ থেকে সরাসরি আপনার অ্যাকাউন্টে পাঠান — মাঝখানে কেউ নেই, কোনো কাটছাঁটও নেই।",
      "One link. Your own bKash QR. Supporters send from their own app straight to your account — nobody in between, no cut.",
    ),
    ctaPrimary: pair("আপনার পাতার লিংক বানান", "Make your page link"),
    ctaSecondary: pair("ডেমো পাতা দেখুন", "See a demo page"),
    trust: list(
      ["চানাস্তা টাকা ধরে না", "টাকার কোনো ভাগ নেয় না", "সাপোর্ট সবসময় ঐচ্ছিক"],
      ["Chanasta never holds the money", "No cut of any transfer", "Support is always optional"],
    ),

    demoTitle: pair("তিনটি ডেমো পাতা", "Three demo pages"),
    demoIntro: pair(
      "সব নাম, নম্বর আর QR কাল্পনিক — DEMO লেবেল দেওয়া। দেখে বুঝে নিন পাতাটা কেমন লাগে।",
      "Every name, number and QR here is made up and stamped DEMO. Have a look at how a page feels.",
    ),
    demoOpen: pair("পাতা দেখুন", "View page"),

    moneyTitle: pair("তিন ধাপ, মাঝখানে কেউ নেই", "Three steps, nobody in between"),
    moneyLead: pair(
      "টাকার পথ একটাই: সমর্থকের অ্যাপ থেকে সরাসরি ক্রিয়েটরের অ্যাকাউন্টে। চানাস্তা শুধু পেমেন্ট তথ্য দেখায় আর ঐচ্ছিক নোট জমা রাখে।",
      "There is one money path: from the supporter's app straight to the creator's account. Chanasta only shows payment details and stores an optional note.",
    ),
    pathSupporter: pair("সমর্থকের অ্যাপ", "Supporter's app"),
    pathMoney: pair("টাকা", "money"),
    pathCreator: pair("ক্রিয়েটরের অ্যাকাউন্ট", "Creator's account"),
    pathBracket: pair(
      "চানাস্তা — এই পথের বাইরে। শুধু পেমেন্ট তথ্য দেখায় এবং সমর্থকের নিজের লেখা নোট জমা রাখে।",
      "Chanasta — outside the path. It only shows payment details and stores the supporter's own note.",
    ),
    step1Title: pair("লিংক বানান", "Make the link"),
    step1Body: pair(
      "ইমেইলে ঢুকুন, একটা নাম বেছে নিন, আপনার বিকাশ QR পেস্ট করুন বা স্ক্রিনশট দিন। নগদ, রকেট আর ব্যাংকও যোগ করা যায়।",
      "Sign in, pick a name, paste your bKash QR or upload a screenshot. Nagad, Rocket and bank can be added too.",
    ),
    step2Title: pair("সমর্থক নিজের অ্যাপে পাঠান", "The supporter sends from their own app"),
    step2Body: pair(
      "এক কাপ চা, এক প্লেট নাস্তা বা ইচ্ছেমতো — পরিমাণ বেছে QR স্ক্যান করলেই হলো। কোনো অ্যাকাউন্ট খুলতে হয় না।",
      "A cup of cha, a plate of snacks or any amount — choose an amount and scan the QR. No account needed.",
    ),
    step3Title: pair("চাইলে একটা নোট", "A note, if they want"),
    step3Body: pair(
      "সমর্থক ধন্যবাদ লিখে রাখতে পারেন। নোটটি “স্ব-ঘোষিত” হিসেবে দেখায়; ক্রিয়েটর নিজের অ্যাপ দেখে নিশ্চিত করতে বা লুকাতে পারেন।",
      "The supporter can leave a thank-you. It shows as “Self-reported”; the creator can check their own app and confirm or hide it.",
    ),

    whoTitle: pair("যাঁরা কাজ করে অন্যের কাজে লাগেন", "For people whose work helps others"),
    whoLead: pair(
      "ক্লাস, লেখা, কোড, ছবি — যা-ই বানান, সাপোর্টের একটা সহজ রাস্তা।",
      "Classes, writing, code, art — whatever you make, a simple way for people to support it.",
    ),
    whoRows: [
      {
        icon: "graduation" as const,
        title: pair("টিউটোরিয়াল ইউটিউবার", "Tutorial YouTuber"),
        body: pair(
          "ভিডিওর ডেসক্রিপশনে একটা লিংক। শিক্ষার্থীরা মোবাইল ডেটায় হালকা পাতা খোলে, নিজের অ্যাপে পাঠায়।",
          "One link in the video description. Students open a light page on mobile data and send from their own app.",
        ),
      },
      {
        icon: "quill" as const,
        title: pair("লেখক ও ডেভেলপার", "Writer and developer"),
        body: pair(
          "বিকাশের পাশাপাশি ব্যাংক অ্যাকাউন্ট যোগ করুন, পাতা ইংরেজিতে দিন — প্রবাসী পাঠকদের জন্য।",
          "Add a bank account alongside bKash, and offer the page in English for readers abroad.",
        ),
      },
      {
        icon: "bookmark" as const,
        title: pair("টিউশন শিক্ষক", "Tuition teacher"),
        body: pair(
          "A4 পোস্টার প্রিন্ট করে দেয়ালে লাগান। অভিভাবকেরা স্ক্যান করে সরাসরি পাঠান।",
          "Print the A4 poster and put it on the wall. Guardians scan it and send directly.",
        ),
      },
      {
        icon: "palette" as const,
        title: pair("শিল্পী ও আয়োজক", "Artist and organiser"),
        body: pair(
          "আঁকা, গান বা কমিউনিটি ইভেন্ট — নিজের কাজের জন্য একটা সাপোর্ট লিংক।",
          "Art, music or a community event — one support link for your own work.",
        ),
      },
    ],
    embedTitle: pair("আপনার সাইটে বসান", "Embed it on your site"),
    embedBody: pair(
      "নিচের কোডটি আপনার ব্লগ বা পোর্টফোলিওতে বসান। ফ্রেমের ভেতরে পাতাটি নিজে থেকেই ছোট-বড় হয়।",
      "Paste the code below into your blog or portfolio. The card fits itself to the frame.",
    ),
    embedCopy: pair("এমবেড কোড কপি করুন", "Copy embed code"),
    embedPreview: pair("এমবেড প্রিভিউ", "Embed preview"),

    limitsTitle: pair("সোজা কথা: আমরা কী করি, কী করি না", "Straight talk: what we do and don't do"),
    limitsDoTitle: pair("আমরা করি", "What we do"),
    limitsDo: list(
      [
        "ক্রিয়েটরের নিজের পেমেন্ট তথ্য দেখাই, প্রতিটার পাশে খোলাখুলি লেবেল দিয়ে: যাচাইকৃত QR, অযাচাইকৃত QR বা ম্যানুয়াল।",
        "“যাচাইকৃত QR” মানে শুধু QR-এর তথ্য ও চেকসাম ঠিক আছে — টাকার কোনো যাচাই নয়।",
        "সমর্থকের নোট সবসময় “স্ব-ঘোষিত” দেখাই। ক্রিয়েটর নিজের অ্যাপে দেখে তবেই “ক্রিয়েটর নিশ্চিত করেছেন” হয়।",
        "ছদ্মবেশী বা প্রতারণার রিপোর্ট সাধ্যমতো ৭২ ঘণ্টার মধ্যে দেখি।",
      ],
      [
        "We show the creator's own payment details, each with an explicit label: verified QR, unverified QR or manual.",
        "“Verified QR” only means the QR data and checksum are valid — it is never a check of any money.",
        "Every supporter note shows as “Self-reported”. Only the creator, checking their own app, can mark it “Creator confirmed”.",
        "We look at impersonation and scam reports best-effort, within about 72 hours.",
      ],
    ),
    limitsDontTitle: pair("আমরা করি না", "What we don't do"),
    limitsDont: list(
      [
        "টাকা ধরি না, পাঠাই না, জমা রাখি না। কোনো ব্যালেন্স বা পেআউট নেই।",
        "আপনার টাকার কোনো ভাগ নিই না।",
        "লেনদেন নিশ্চিত করি না — এসএমএস পড়ি না, প্রোভাইডারের সঙ্গে সংযোগও নেই।",
        "অপরাধবোধ বা চাপ তৈরি করি না। সাপোর্ট করলে বাড়তি সুবিধার লোভও দেখাই না।",
      ],
      [
        "We don't hold, route or store money. There are no balances and no payouts.",
        "We take no cut of your money.",
        "We don't confirm transactions — we don't read SMS, and we have no connection to providers.",
        "We don't guilt or pressure anyone. Supporting never unlocks extra perks.",
      ],
    ),

    faqTitle: pair("প্রশ্নোত্তর", "Common questions"),
    faqItems: [
      {
        q: pair("চানাস্তা কি আমার টাকা ধরে?", "Does Chanasta hold my money?"),
        a: pair(
          "না। টাকা সরাসরি সমর্থকের অ্যাপ থেকে আপনার অ্যাকাউন্টে যায়। চানাস্তা শুধু আপনার দেওয়া পেমেন্ট তথ্য দেখায়।",
          "No. The money goes straight from the supporter's app to your account. Chanasta only shows the payment details you gave it.",
        ),
      },
      {
        q: pair("কোনো ফি আছে?", "Are there any fees?"),
        a: pair(
          "টাকা পাঠানোর ওপর কোনো ফি বা ভাগ নেই। ভবিষ্যতে কিছু নিলে তা হবে শুধু সফটওয়্যারের বাড়তি সুবিধার জন্য — যেমন নিজের ডোমেইন — টাকা সরানোর জন্য কখনোই নয়।",
          "There is no fee or cut on sending money. If we ever charge, it will be for software extras — like a custom domain — never for moving money.",
        ),
      },
      {
        q: pair("কেউ টাকা না পাঠিয়ে নোট লিখলে?", "What if someone leaves a note without sending money?"),
        a: pair(
          "নোট শুধু সমর্থকের নিজের ঘোষণা, তাই পাতায় “স্ব-ঘোষিত” দেখায়। আপনি চাইলে নিজের অ্যাপ দেখে নিশ্চিত করতে পারেন, অথবা লুকিয়ে ফেলতে পারেন।",
          "A note is only the supporter's own claim, so it shows as “Self-reported”. You can check your own app and confirm it, or hide it.",
        ),
      },
      {
        q: pair("দান বা তহবিল সংগ্রহের জন্য ব্যবহার করা যাবে?", "Can I use it for donations or fundraising?"),
        a: pair(
          "না। চানাস্তা সৃষ্টিশীল মানুষের কাজের জন্য এক কাপ চা খাওয়ানোর ব্যবস্থা। দাতব্য বা তহবিল সংগ্রহ এই সংস্করণে সমর্থিত নয়, এমন ব্যবহার ধরা পড়লে পাতা বন্ধ করা হতে পারে।",
          "No. Chanasta is for buying a creator a cup of cha for their work. Charity and fundraising are not supported in this version, and such pages may be closed.",
        ),
      },
      {
        q: pair("কোন কোন মাধ্যমে পাঠানো যায়?", "Which methods can people use?"),
        a: pair(
          "বিকাশ বাংলা QR-এর ডিকোড এখন যাচাই করা; নগদ, রকেট ও ব্যাংক আপাতত ম্যানুয়াল। প্রোভাইডারের বর্তমান শর্ত দেখে নিন।",
          "bKash Bangla QR decoding is verified today; Nagad, Rocket and bank are manual for now. Check your provider's current terms.",
        ),
      },
      {
        q: pair("আমার QR কীভাবে যোগ করব?", "How do I add my QR?"),
        a: pair(
          "পেজ তৈরি করে QR পেলোড পেস্ট করুন বা ছবি আপলোড করুন — ইঞ্জিন তথ্যটি যাচাই করে। নম্বর দিয়েও যোগ করা যায়।",
          "Create a page and paste your QR payload or upload a photo — the engine checks the data. You can also add a number.",
        ),
      },
    ],
    closingTitle: pair("আজই আপনার চায়ের লিংকটা বানিয়ে ফেলুন", "Make your cha link today"),
    closingLead: pair(
      "না দেওয়া, না চাওয়া — শুধু একটা লিংক। সমর্থক নিজের অ্যাপে পাঠাবেন, আপনি নিজের অ্যাপে দেখবেন।",
      "No giving, no asking — just one link. Supporters send from their app, you see it in yours.",
    ),
    closingCta: pair("আপনার পাতার লিংক বানান", "Make your page link"),
  },

  supporter: {
    lastUpdated: pair("সর্বশেষ হালনাগাদ", "Last updated"),
    amountTitle: pair("আজ কী খাওয়াবেন?", "What should they treat you to?"),
    amountHelper: pair("দাম নয় — যতটা ইচ্ছা।", "Not a price — whatever you like."),
    anyAmount: pair("ইচ্ছেমতো", "Any amount"),
    anyAmountSub: pair("আপনার ইচ্ছে", "Your choice"),
    customLabel: pair("ইচ্ছেমতো টাকা (৳1 – ৳100,000)", "Any amount (৳1 – ৳100,000)"),
    customPlaceholder: pair("যেমন ৭৫", "e.g. 75"),
    customError: pair("৳1 থেকে ৳100,000-এর মধ্যে লিখুন।", "Enter an amount between ৳1 and ৳100,000."),
    methodTitle: pair("কোন মাধ্যমে পাঠাবেন?", "Which way will you send?"),
    methodHelp: pair(
      "যে উপায়টা সহজ লাগে সেটা বেছে নিন। নম্বরটা কপি করে নিজের অ্যাপে দিন — অথবা QR স্ক্যান করুন।",
      "Pick whichever is easiest. Copy the number into your own app — or scan the QR.",
    ),
    selectedMethod: pair("দেখানো হচ্ছে", "Showing"),
    receiptKicker: pair("চানাস্তা · চা-বিল", "Chanasta · CHA BILL"),
    receiptSample: pair("নমুনা বিল", "Sample bill"),
    receiptCreator: pair("ক্রিয়েটর", "Creator"),
    receiptPage: pair("পাতা", "Page"),
    receiptAmount: pair("পরিমাণ", "Amount"),
    receiptMethod: pair("মাধ্যম", "Method"),
    receiptReference: pair("রেফারেন্স", "Reference"),
    receiptQrName: pair("QR-এ থাকা নাম", "Name inside the QR"),
    receiptGivenName: pair("ক্রিয়েটরের দেওয়া নাম", "Name the creator gave"),
    receiptCompare: pair(
      "দুটো নাম মিলিয়ে দেখুন। চেনা না লাগলে পাঠাবেন না।",
      "Compare the two names. If it doesn't look right, don't send.",
    ),
    receiptScan: pair(
      "বিকাশ বা যেকোনো বাংলা QR অ্যাপ দিয়ে স্ক্যান করুন",
      "Scan with bKash or any app that accepts Bangla QR",
    ),
    receiptNoQr: pair(
      "এই মাধ্যমে QR নেই। নাম ও নম্বর মিলিয়ে নিজের অ্যাপে পাঠান।",
      "No QR for this method. Check the name and number and send from your own app.",
    ),
    receiptAnyQr: pair(
      "এই QR-এ পরিমাণ নেই — আপনার অ্যাপে নিজে লিখুন",
      "This QR has no amount — type it in your app",
    ),
    receiptTearNote: pair("এই বিল কোনো রসিদ নয় — চানাস্তা টাকা রাখে না।", "This bill is not a receipt — Chanasta holds no money."),
    otherMethods: pair("অন্য উপায়", "Other ways"),
    copyNumber: pair("নম্বর কপি করুন", "Copy number"),
    maskedNumber: pair("নম্বর দেখতে “দেখান” চাপুন", "Press “Show” to view the number"),
    noMethods: pair(
      "ক্রিয়েটর এখনো কোনো পেমেন্ট তথ্য যোগ করেননি।",
      "The creator hasn't added any payment details yet.",
    ),
    claimsTitle: pair("ধন্যবাদের খাতা", "Thank-you ledger"),
    claimsNote: pair(
      "এগুলো সমর্থকদের নিজের লেখা নোট — রসিদ বা প্রমাণ নয়। ক্রিয়েটর নিশ্চিত না করা পর্যন্ত যাচাই করা নয়।",
      "These are supporters' own notes — not a receipt or proof. Unverified unless the creator confirms them.",
    ),
    claimsEmpty: pair(
      "এখনো কেউ জানায়নি যে কিছু পাঠিয়েছে। আপনিই প্রথম হতে পারেন।",
      "Nobody has said they sent anything yet. You could be the first.",
    ),
    claimCta: pair("পাঠিয়েছেন? জানিয়ে দিন", "Sent it? Let them know"),
    reportTitle: pair("সন্দেহ হচ্ছে?", "Something feels off?"),
    engineCredit: "Powered by deshiQR",
    draftBanner: pair("খসড়া প্রিভিউ — পেজটি এখনো পাবলিক নয়।", "Draft preview — this page is not public yet."),
    previewOnly: pair(
      "এটি শুধু প্রিভিউ — এখনো কেউ এই পেজ দেখতে পাচ্ছে না।",
      "This is only a preview — nobody can see this page yet.",
    ),
  },

  thanks: {
    slipKicker: pair("চানাস্তা · ধন্যবাদ-স্লিপ", "Chanasta · THANK-YOU SLIP"),
    title: pair("ধন্যবাদ!", "Thank you!"),
    body: pair(
      "আপনার বার্তা ক্রিয়েটর দেখতে পাবেন। টাকার বিষয়টি চানাস্তা যাচাই করে না — ক্রিয়েটর নিজে দেখে নিশ্চিত করবেন।",
      "The creator will see your note. Chanasta does not verify the money — the creator checks their own app and confirms.",
    ),
    yourMessage: pair("আপনার বার্তা", "Your message"),
    amountLabel: pair("পরিমাণ", "Amount"),
    creatorLabel: pair("ক্রিয়েটর", "Creator"),
    methodLabel: pair("মাধ্যম", "Method"),
    timeLabel: pair("সময়", "When"),
    anonymous: pair("একজন শুভানুধ্যায়ী", "A well-wisher"),
    notReceipt: pair("এটি কোনো রসিদ বা পেমেন্ট নিশ্চিতকরণ নয়।", "This is not a receipt or a payment confirmation."),
    share: pair("পেজটি শেয়ার করুন", "Share the page"),
    back: pair("পেজে ফিরুন", "Back to the page"),
    missingTitle: pair("আপনার বার্তা দেখানো যাচ্ছে না, তবে ধন্যবাদ।", "We can't show your note, but thank you."),
    missingBody: pair(
      "টাকার বিষয়টি চানাস্তা যাচাই করে না — ক্রিয়েটর নিজে দেখে নিশ্চিত করবেন।",
      "Chanasta does not verify the money — the creator checks their own app and confirms.",
    ),
    slipStub: pair(
      "এই স্লিপটি আপনার নিজের লেখা নোটের প্রিভিউ। টাকা সরাসরি ক্রিয়েটরের অ্যাকাউন্টে গেছে কি না, তা চানাস্তা জানে না।",
      "This slip previews your own note. Chanasta cannot know whether money reached the creator's account.",
    ),
  },

  embed: {
    amountLabel: pair("পরিমাণ", "Amount"),
    scan: pair("স্ক্যান করে নিজের অ্যাপে পাঠান", "Scan and send from your own app"),
    open: pair("পেজ দেখুন", "View the page"),
    honesty: pair(
      "টাকা সোজা ক্রিয়েটরের কাছে যায়; চানাস্তা টাকা নেয় না।",
      "Money goes straight to the creator; Chanasta holds none.",
    ),
    noMethods: pair("ক্রিয়েটর এখনো কোনো পেমেন্ট তথ্য যোগ করেননি।", "The creator hasn't added payment details yet."),
    report: pair("রিপোর্ট", "Report"),
  },

  notFound: {
    kicker: pair("চা-বিল খুঁজে পাওয়া যায়নি", "BILL NOT FOUND"),
    title: pair("এই পেজটি খুঁজে পাওয়া যায়নি।", "This page wasn't found."),
    suspendedTitle: pair("এই পেজটি আপাতত বন্ধ আছে।", "This page is closed for now."),
    suspendedBody: pair(
      "পেজটি মালিক কর্তৃক বন্ধ অথবা মডারেশনে সরানো হয়েছে। কোনো টাকা নিয়ে সমস্যা হলে আপনার প্রোভাইডারের সহায়তা নিন।",
      "The page was closed by its owner or removed in moderation. For any money issue, contact your provider.",
    ),
    body: pair(
      "লিংকটি ঠিক আছে কিনা দেখুন। অথবা একটা ডেমো পাতা দেখে নিন।",
      "Check that the link is right. Or look at a demo page.",
    ),
    home: pair("হোমে ফিরুন", "Back home"),
    demo: pair("ডেমো পাতা দেখুন", "See a demo page"),
    creator: pair("আপনি ক্রিয়েটর? নিজের পেজ খুলুন", "Are you a creator? Make your own page"),
  },
} as const;

/** The subset of the supporter copy the chai receipt renders, resolved for one language. */
export interface ReceiptCopy {
  receiptKicker: string;
  receiptSample: string;
  receiptCreator: string;
  receiptPage: string;
  receiptAmount: string;
  receiptMethod: string;
  receiptReference: string;
  receiptQrName: string;
  receiptGivenName: string;
  receiptCompare: string;
  receiptScan: string;
  receiptNoQr: string;
  receiptAnyQr: string;
  receiptTearNote: string;
  anyAmount: string;
  anyAmountSub: string;
  lastUpdated: string;
  copyNumber: string;
}

export function receiptCopyFor(lang: Lang): ReceiptCopy {
  const p = pick(lang);
  const s = COPY.supporter;
  return {
    receiptKicker: p(s.receiptKicker),
    receiptSample: p(s.receiptSample),
    receiptCreator: p(s.receiptCreator),
    receiptPage: p(s.receiptPage),
    receiptAmount: p(s.receiptAmount),
    receiptMethod: p(s.receiptMethod),
    receiptReference: p(s.receiptReference),
    receiptQrName: p(s.receiptQrName),
    receiptGivenName: p(s.receiptGivenName),
    receiptCompare: p(s.receiptCompare),
    receiptScan: p(s.receiptScan),
    receiptNoQr: p(s.receiptNoQr),
    receiptAnyQr: p(s.receiptAnyQr),
    receiptTearNote: p(s.receiptTearNote),
    anyAmount: p(s.anyAmount),
    anyAmountSub: p(s.anyAmountSub),
    lastUpdated: p(s.lastUpdated),
    copyNumber: p(s.copyNumber),
  };
}

/** Type helpers for components that take a section of COPY as a parameter. */

export type LandingCopy = typeof COPY.landing;
export type SupporterCopy = typeof COPY.supporter;
export type ThanksCopy = typeof COPY.thanks;
export type EmbedCopy = typeof COPY.embed;
export type NotFoundCopy = typeof COPY.notFound;
