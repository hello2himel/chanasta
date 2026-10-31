/**
 * Creator-app copy bank: `{ bn, en }` pairs with a tiny `pick(resolve)` helper.
 *
 * Kept out of `src/lib/i18n.ts` (Lead-owned) so the creator app can be
 * re-written without touching the shared dictionary. `ctx.t` is still used for
 * shared strings (honesty lines, error messages, provider names) so the product
 * voice stays single-sourced.
 *
 * Rules baked into these strings: `আপনি` form, no emoji, no payment-processing
 * claims. Stamps read self-reported / creator confirmed — never "paid".
 */
import type { Lang } from "../lib/types.ts";

export type CopyPair = { readonly bn: string; readonly en: string };

export const appCopy = {
  // ---- shared chrome ------------------------------------------------------
  back: { bn: "পিছনে", en: "Back" },
  next: { bn: "পরের ধাপ", en: "Next" },
  save: { bn: "সংরক্ষণ করুন", en: "Save" },
  saving: { bn: "সংরক্ষণ হচ্ছে…", en: "Saving…" },
  saved: { bn: "সংরক্ষিত হয়েছে", en: "Saved" },
  cancel: { bn: "বাতিল", en: "Cancel" },
  remove: { bn: "মুছুন", en: "Remove" },
  edit: { bn: "সম্পাদনা", en: "Edit" },
  add: { bn: "যোগ করুন", en: "Add" },
  copy: { bn: "কপি", en: "Copy" },
  copied: { bn: "কপি হয়েছে", en: "Copied" },
  copyLink: { bn: "লিংক কপি", en: "Copy link" },
  copiedLink: { bn: "লিংক কপি হয়েছে", en: "Link copied" },
  copyFailed: { bn: "সিলেক্ট করে কপি করুন", en: "Select it to copy" },
  optional: { bn: "ঐচ্ছিক", en: "optional" },
  required: { bn: "এই ঘরটি লাগবে", en: "This field is required" },
  close: { bn: "বন্ধ করুন", en: "Close" },
  loading: { bn: "একটু অপেক্ষা করুন…", en: "One moment…" },
  tryAgain: { bn: "আবার চেষ্টা করুন", en: "Try again" },
  viewPage: { bn: "পাতা দেখুন", en: "View page" },
  opensNewTab: { bn: "নতুন ট্যাবে খুলবে", en: "opens in a new tab" },
  prefillLater: { bn: "পরে চালিয়ে যাব", en: "Continue later" },

  // ---- stamps / status ----------------------------------------------------
  statusPublished: { bn: "প্রকাশিত", en: "Published" },
  statusDraft: { bn: "ড্রাফট", en: "Draft" },
  statusSuspended: { bn: "বন্ধ", en: "Unavailable" },
  stampSelfReported: { bn: "স্ব-ঘোষিত", en: "Self-reported" },
  stampConfirmed: { bn: "ক্রিয়েটর নিশ্চিত করেছেন", en: "Creator confirmed" },
  stampHidden: { bn: "লুকানো · শুধু আপনি দেখছেন", en: "Hidden · only you see it" },
  stampRejected: { bn: "মডারেশনে সরানো হয়েছে", en: "Removed by moderation" },
  stampNew: { bn: "নতুন", en: "New" },
  stampDemo: { bn: "ডেমো", en: "Demo" },
  stampManual: { bn: "ম্যানুয়াল", en: "Manual" },
  stampQrVerified: { bn: "যাচাইকৃত QR", en: "Verified QR" },
  stampQrUnverified: { bn: "অযাচাইকৃত QR", en: "Unverified QR" },
  stampImageOnly: { bn: "শুধু ছবি", en: "Image only" },
  stampEnabled: { bn: "চালু", en: "On" },
  stampDisabled: { bn: "বন্ধ", en: "Off" },

  // ---- app nav ------------------------------------------------------------
  navMessages: { bn: "সাপোর্টের নোট", en: "Support notes" },
  navPayments: { bn: "পেমেন্ট মাধ্যম", en: "Payment methods" },
  navProfile: { bn: "প্রোফাইল", en: "Profile" },
  navSettings: { bn: "সেটিংস", en: "Settings" },
  navDashboard: { bn: "ড্যাশবোর্ড", en: "Dashboard" },

  // ---- dashboard: creator header -----------------------------------------
  yourPage: { bn: "আপনার পাতা", en: "Your page" },
  publish: { bn: "পাতা প্রকাশ করুন", en: "Publish page" },
  unpublish: { bn: "আনপাবলিশ করুন", en: "Unpublish" },
  needMethod: {
    bn: "প্রকাশ করতে অন্তত একটি পেমেন্ট মাধ্যম চালু থাকতে হবে।",
    en: "You need at least one payment method turned on to publish.",
  },
  noPageTitle: { bn: "এখনো আপনার পাতা তৈরি হয়নি", en: "You haven't created a page yet" },
  noPageBody: {
    bn: "তিন ধাপে পাতা বানান — নাম, এক টুকরো পরিচয়, আর আপনার নিজের পেমেন্ট তথ্য।",
    en: "Build it in three steps — a name, a short intro, and your own payment details.",
  },
  noPageCta: { bn: "পাতা তৈরি করুন", en: "Create your page" },
  demoNote: {
    bn: "এটি ডেমো মোড — পাতা, নোট আর মধ্যম সব এই ব্রাউজারে থাকে; কোনো সার্ভারে যায় না।",
    en: "This is demo mode — the page, notes and methods live in this browser only, not on a server.",
  },

  // ---- dashboard: claims ledger ------------------------------------------
  claimsHelp: {
    bn: "এগুলো সমর্থকদের নিজের জানানো নোট। “আমার অ্যাপে দেখেছি” মানে আপনি নিজের অ্যাপে টাকা আসতে দেখেছেন — এটা চানাস্তার যাচাই নয়, রসিদও নয়।",
    en: "These are supporters' own notes. “I saw it in my app” means you saw it in your own banking app — it is not a Chanasta check and not a receipt.",
  },
  filterAll: { bn: "সব", en: "All" },
  filterPending: { bn: "দেখা বাকি", en: "To review" },
  filterConfirmed: { bn: "নিশ্চিত", en: "Confirmed" },
  filterHidden: { bn: "লুকানো", en: "Hidden" },
  nothingHere: { bn: "এই ফিল্টারে কিছু নেই।", en: "Nothing in this filter." },
  noNotesTitle: { bn: "এখনো কোনো নোট আসেনি", en: "No notes yet" },
  noNotesBody: {
    bn: "লিংকটা শেয়ার করে শুরু করুন। কেউ টাকা পাঠিয়ে নোট দিলে এখানে দেখা যাবে।",
    en: "Share your link to get started. Notes show up here when someone sends money and leaves one.",
  },
  anonymous: { bn: "বেনামী", en: "Anonymous" },
  confirmAction: { bn: "আমার অ্যাপে দেখেছি", en: "I saw it in my app" },
  hideAction: { bn: "লুকান", en: "Hide" },
  restoreAction: { bn: "ফিরিয়ে আনুন", en: "Restore" },
  detailsAction: { bn: "বিস্তারিত", en: "Details" },
  detailsClose: { bn: "বিস্তারিত লুকান", en: "Hide details" },
  confirmHint: {
    bn: "নিজের অ্যাপে টাকা আসতে দেখে তারপর নিশ্চিত করুন। এটি চানাস্তার যাচাই নয়।",
    en: "Confirm only after you see the money in your own app. This is not a Chanasta check.",
  },
  hideWarning: {
    bn: "লুকালে নোটটি আপনার পাতায় আর দেখা যাবে না, তবে রেকর্ডে থাকবে।",
    en: "Hiding removes the note from your page but keeps it in your records.",
  },
  txidLabel: { bn: "লেনদেনের আইডি", en: "TxID" },
  txidPrivate: {
    bn: "শুধু আপনি দেখতে পাবেন — কখনো পাতায় দেখানো হয় না।",
    en: "Only you can see this — it is never shown on your page.",
  },
  duplicateTxid: {
    bn: "এই TxID আগেও এসেছে। মিলিয়ে দেখুন।",
    en: "This TxID has appeared before. Double-check.",
  },
  noteNewBadge: { bn: "{count}টি নতুন", en: "{count} new" },
  confirmedToast: { bn: "নিশ্চিত করা হয়েছে", en: "Confirmed" },
  hiddenToast: { bn: "লুকানো হয়েছে", en: "Hidden" },
  restoredToast: { bn: "ফিরিয়ে আনা হয়েছে", en: "Restored" },
  undo: { bn: "আগের অবস্থায়", en: "Undo" },
  atAGlance: { bn: "এক নজরে", en: "At a glance" },
  toReviewCount: { bn: "দেখা বাকি", en: "To review" },
  confirmedCount: { bn: "নিশ্চিত", en: "Confirmed" },
  hiddenCount: { bn: "লুকানো", en: "Hidden" },
  noBalanceNote: {
    bn: "কোনো ব্যালেন্স, পেআউট বা টাকা-যাচাই নেই — টাকা সরাসরি আপনার নিজের অ্যাকাউন্টে যায়। নতুন নোট এলে শুধু এখানকার সংখ্যা বাড়ে; কোনো ইমেইল বা পুশ বিজ্ঞপ্তি আসে না।",
    en: "There is no balance, no payout and no money check — money goes straight to your own account. A new note only raises the count here; no email or push notification is sent.",
  },
  amountLabel: { bn: "৳ টাকা", en: "৳ Amount" },
  whenLabel: { bn: "কখন", en: "When" },

  // ---- dashboard: share kit ----------------------------------------------
  shareTitle: { bn: "আপনার সাপোর্ট লিংক", en: "Your support link" },
  shareTextLabel: { bn: "শেয়ার টেক্সট", en: "Share text" },
  shareWhatsApp: { bn: "WhatsApp", en: "WhatsApp" },
  shareFacebook: { bn: "Facebook", en: "Facebook" },
  posterTitle: { bn: "A4 পোস্টার", en: "A4 poster" },
  posterBody: {
    bn: "ক্লাসরুম বা দোকানের দেয়ালে লাগান। QR স্ক্যান করেই সমর্থকেরা নিজের অ্যাপ থেকে পাঠাতে পারবেন।",
    en: "Put it up in a classroom or shop. Supporters scan the QR and send from their own app.",
  },
  posterDownload: { bn: "পোস্টার ডাউনলোড", en: "Download poster" },
  embedTitle: { bn: "এম্বেড কোড", en: "Embed code" },
  embedCopy: { bn: "কোড কপি", en: "Copy code" },

  // ---- dashboard: profile -------------------------------------------------
  profileTitle: { bn: "আপনার পরিচয়", en: "Your identity" },
  profileSub: {
    bn: "সমর্থকেরা পাতায় প্রথমে এটাই দেখবেন। খোলাখুলি লিখুন, জোর করে কিছু বিক্রি করতে হবে না।",
    en: "This is the first thing supporters see. Write plainly; you are not selling anything.",
  },
  avatarL: { bn: "অ্যাভাটার", en: "Avatar" },
  avatarPick: { bn: "আইকন বদলান", en: "Change icon" },
  avatarPickerLabel: { bn: "আপনার অ্যাভাটার বেছে নিন", en: "Choose your avatar" },
  nameL: { bn: "দেখানোর নাম", en: "Display name" },
  namePh: { bn: "যেমন: শাহিদুল স্যার", en: "e.g. Shahidul Sir" },
  tagL: { bn: "এক লাইনে পরিচয়", en: "Tagline" },
  tagPh: { bn: "যেমন: গণিত শিক্ষক · ঢাকা", en: "e.g. Maths teacher · Dhaka" },
  bioL: { bn: "আপনার গল্প", en: "Your story" },
  bioPh: { bn: "কী করেন, কেন করেন — দু-তিন লাইনে।", en: "What you do and why — in a few lines." },
  handleL: { bn: "হ্যান্ডেল", en: "Handle" },
  handleRule: {
    bn: "৩০ দিনে একবার বদলানো যায়। পুরোনো নাম ৯০ দিন আটকে থাকে।",
    en: "Can be changed once every 30 days. Old names stay reserved for 90 days.",
  },
  changeHandle: { bn: "হ্যান্ডেল বদলান", en: "Change handle" },
  changeHandleTitle: { bn: "নতুন হ্যান্ডেল বেছে নিন", en: "Choose a new handle" },
  changeHandleBody: {
    bn: "পুরোনো লিংক সঙ্গে সঙ্গে বন্ধ হয়ে যাবে। ৩০ দিনে একবারই বদলানো যায়।",
    en: "The old link stops working right away. You can change it only once every 30 days.",
  },
  handleChecking: { bn: "দেখা হচ্ছে…", en: "Checking…" },
  handleAvailable: { bn: "এই নামটি পাওয়া যাচ্ছে", en: "This handle is available" },
  handleTaken: { bn: "নামটি আগেই নেওয়া হয়েছে", en: "This handle is already taken" },
  handleReserved: { bn: "এই নামটি সংরক্ষিত", en: "This handle is reserved" },
  handleInvalid: {
    bn: "৩–৩০টি ছোট হাতের অক্ষর, সংখ্যা বা হাইফেন দিন",
    en: "Use 3–30 lowercase letters, digits or hyphens",
  },
  socialsTitle: { bn: "লিংক", en: "Links" },
  socialsBody: {
    bn: "চাইলে আপনার কাজের লিংক দিন — সর্বোচ্চ ছয়টি, শুধু https।",
    en: "Optionally add links to your work — up to six, https only.",
  },
  addLink: { bn: "লিংক যোগ করুন", en: "Add link" },
  linkUrl: { bn: "লিংক (https)", en: "Link (https)" },
  platformL: { bn: "প্ল্যাটফর্ম", en: "Platform" },
  defaultLang: { bn: "পাতার ডিফল্ট ভাষা", en: "Default page language" },
  noPressure: {
    bn: "টিপ: “পাঠাতেই হবে” ভাব এড়িয়ে চলুন। চানাস্তায় সাপোর্ট সবসময় স্বেচ্ছায়।",
    en: "Tip: avoid any “you must” tone. On Chanasta, support is always voluntary.",
  },
  discard: { bn: "পরিবর্তন মুছবেন?", en: "Discard changes?" },
  discardBody: { bn: "যা লিখেছেন তা মুছে যাবে।", en: "What you typed will be lost." },
  unsaved: { bn: "সংরক্ষণ করা হয়নি", en: "Unsaved" },

  // ---- dashboard: payments ------------------------------------------------
  methodsTitle: { bn: "পেমেন্ট মাধ্যম", en: "Payment methods" },
  methodsSub: {
    bn: "উপরেরটি সবার আগে দেখাবে। এই তথ্য আপনার নিজের — চানাস্তা নিজের অ্যাকাউন্ট দেখায় না।",
    en: "The top one is shown first. These are your own details — Chanasta never shows its own account.",
  },
  addMethod: { bn: "নতুন মাধ্যম", en: "Add method" },
  maxMethods: { bn: "সর্বোচ্চ ৮টি মাধ্যম", en: "Up to 8 methods" },
  methodsEmpty: {
    bn: "এখনো কোনো পেমেন্ট মাধ্যম নেই। QR, নম্বর বা ব্যাংক অ্যাকাউন্ট যোগ করুন।",
    en: "No payment methods yet. Add a QR, a number or a bank account.",
  },
  methodKind: { bn: "ধরন", en: "Type" },
  methodLabel: { bn: "নাম", en: "Label" },
  methodLabelPh: { bn: "যেমন: ব্যক্তিগত বিকাশ", en: "e.g. Personal bKash" },
  walletNum: { bn: "মোবাইল নম্বর", en: "Mobile number" },
  accName: { bn: "অ্যাকাউন্টের নাম", en: "Account name" },
  accNum: { bn: "অ্যাকাউন্ট নম্বর", en: "Account number" },
  bankName: { bn: "ব্যাংকের নাম", en: "Bank name" },
  branch: { bn: "শাখা", en: "Branch" },
  routing: { bn: "রাউটিং নম্বর", en: "Routing no." },
  addErrNumber: { bn: "০১ দিয়ে শুরু হওয়া ১১ সংখ্যার নম্বর দিন", en: "Enter an 11-digit number starting with 01" },
  addErrBank: {
    bn: "অ্যাকাউন্টের নাম, ব্যাংক ও সঠিক নম্বর দিন",
    en: "Enter the account name, bank and a valid account number",
  },
  manualHint: {
    bn: "ম্যানুয়াল নম্বরে শুধু ফরম্যাট দেখা হয়। সমর্থকদের কাছে “ম্যানুয়াল” লেখা দেখাবে।",
    en: "Manual numbers are only format-checked. Supporters see them labelled “Manual”.",
  },
  qrTab: { bn: "QR পেস্ট", en: "Paste QR" },
  shotTab: { bn: "স্ক্রিনশট", en: "Screenshot" },
  manualTab: { bn: "নম্বর / ব্যাংক", en: "Number / bank" },
  qrPasteL: { bn: "QR-এর লেখা (পেলোড)", en: "QR text (payload)" },
  qrPastePh: { bn: "000201… দিয়ে শুরু হওয়া লেখা দিন", en: "Paste text that starts with 000201…" },
  decode: { bn: "পড়ুন", en: "Read it" },
  decoding: { bn: "পড়া হচ্ছে…", en: "Reading…" },
  shotHelp: {
    bn: "বিকাশ বা নগদ অ্যাপের QR-এর স্ক্রিনশট দিন। ছবি আপনার ব্রাউজারে পড়া হয়।",
    en: "Add a screenshot of your bKash or Nagad QR. It is read in your browser.",
  },
  shotBtn: { bn: "ছবি বেছে নিন", en: "Choose image" },
  shotTypes: { bn: "PNG / JPG / WebP · সর্বোচ্চ 2MB", en: "PNG / JPG / WebP · up to 2MB" },
  decodeEmpty: { bn: "আগে QR-এর লেখা পেস্ট করুন", en: "Paste the QR text first" },
  decodeFailed: {
    bn: "এটা QR পেলোডের মতো দেখাচ্ছে না। 000201 দিয়ে শুরু হওয়া লেখা দিন।",
    en: "This doesn't look like a QR payload. Paste text that starts with 000201.",
  },
  decodeImageFailed: {
    bn: "ছবিতে QR পাওয়া যায়নি। আরেকটি স্ক্রিনশট দিন, অথবা নম্বর দিয়ে যোগ করুন।",
    en: "No QR was found in that image. Try another screenshot, or add a number instead.",
  },
  decodeImageLarge: {
    bn: "ছবিটি বড় হয়ে গেছে। ছোট একটি ছবি দিন।",
    en: "That image is too large. Please use a smaller one.",
  },
  qrReadVerified: { bn: "QR পড়া গেছে — তথ্য যাচাই করা হয়েছে", en: "QR read — data verified" },
  qrReadUnverified: { bn: "QR পড়া গেছে — এখনো যাচাই করা হয়নি", en: "QR read — not verified yet" },
  qrVerifiedNote: {
    bn: "QR-এর কাঠামো ও চেকসাম ঠিক আছে। এটি কোনো টাকার যাচাই নয়।",
    en: "The QR structure and checksum are valid. This does not verify any money.",
  },
  qrUnverifiedNote: {
    bn: "QR পড়া গেছে, তবে এই প্রোভাইডারের ফরম্যাট এখনো যাচাই করা হয়নি। সমর্থকদের কাছে “অযাচাইকৃত” দেখাবে।",
    en: "The QR was read, but this provider's format is not verified yet. Supporters will see it marked “Unverified”.",
  },
  providerL: { bn: "প্রোভাইডার", en: "Provider" },
  nameInQrL: { bn: "QR-এ থাকা নাম", en: "Name inside the QR" },
  cityL: { bn: "শহর", en: "City" },
  checksumL: { bn: "চেকসাম (CRC-16)", en: "Checksum (CRC-16)" },
  checksumOk: { bn: "ঠিক আছে", en: "Valid" },
  addQr: { bn: "এই QR যোগ করুন", en: "Add this QR" },
  addQrEdit: { bn: "QR সংরক্ষণ করুন", en: "Save QR" },
  addedMethods: { bn: "যোগ করা মাধ্যম", en: "Added methods" },
  addedEmpty: {
    bn: "এখনো কিছু যোগ হয়নি। পাতা প্রকাশ করতে অন্তত একটি দরকার।",
    en: "Nothing added yet. You need at least one to publish.",
  },
  moveUp: { bn: "উপরে তুলুন", en: "Move up" },
  moveDown: { bn: "নিচে নামান", en: "Move down" },
  removeMethodTitle: { bn: "এই মাধ্যমটি মুছবেন?", en: "Remove this method?" },
  removeMethodBody: {
    bn: "পাতা থেকে এই পেমেন্ট তথ্য সরে যাবে।",
    en: "This payment detail will be removed from your page.",
  },
  methodSaved: { bn: "মাধ্যম সংরক্ষিত হয়েছে", en: "Method saved" },
  methodRemoved: { bn: "মাধ্যম মুছে ফেলা হয়েছে", en: "Method removed" },
  lastMethodOff: {
    bn: "শেষ চালু মাধ্যমটি বন্ধ করলে পাতা প্রকাশ করা যাবে না।",
    en: "If you turn off the last enabled method, the page can't stay published.",
  },
  unsavedMethodTitle: { bn: "লেখা বাতিল করবেন?", en: "Discard what you typed?" },
  unsavedMethodBody: { bn: "না সংরক্ষণ করা তথ্য মুছে যাবে।", en: "The unsaved method details will be lost." },

  // ---- dashboard: settings ------------------------------------------------
  settingsTitle: { bn: "সেটিংস", en: "Settings" },
  settingsSub: { bn: "ভাষা, চেহারা আর সেশন — সব এক জায়গায়।", en: "Language, appearance and session — all in one place." },
  appearance: { bn: "চেহারা", en: "Appearance" },
  appearanceBody: {
    bn: "সিস্টেম হলে আপনার ফোনের সেটিংস অনুযায়ী হালকা বা গাঢ় হবে।",
    en: "System follows your phone's light or dark setting.",
  },
  themeChoice: { bn: "থিম বেছে নিন", en: "Choose a theme" },
  themeSystem: { bn: "সিস্টেম", en: "System" },
  themeLight: { bn: "হালকা", en: "Light" },
  themeDark: { bn: "গাঢ়", en: "Dark" },
  languageL: { bn: "ভাষা", en: "Language" },
  sessionL: { bn: "সেশন", en: "Session" },
  loggedInAs: { bn: "{email} দিয়ে ঢাকা আছে", en: "Signed in as {email}" },
  localSession: {
    bn: "ডেমো মোড — কোনো অ্যাকাউন্ট বা সেশন নেই।",
    en: "Demo mode — no account or session.",
  },
  logout: { bn: "লগ আউট", en: "Log out" },
  legalL: { bn: "আইনি", en: "Legal" },
  terms: { bn: "শর্তাবলি", en: "Terms" },
  privacy: { bn: "গোপনীয়তা", en: "Privacy" },
  howItWorks: { bn: "কীভাবে কাজ করে", en: "How it works" },
  dangerT: { bn: "পাতা মুছে ফেলুন", en: "Delete your page" },
  dangerBody: {
    bn: "পাতাটি সঙ্গে সঙ্গে সবার কাছ থেকে লুকিয়ে যাবে এবং আপনার নামটি ৯০ দিন আটকে থাকবে। নোট, লেনদেন আইডি ও বাকি তথ্য নির্ধারিত সময় পরে মুছে যাবে।",
    en: "Your page disappears for everyone right away and your handle stays reserved for 90 days. Notes, transaction IDs and the rest are purged after the retention period.",
  },
  delBtn: { bn: "পাতা মুছে ফেলুন…", en: "Delete page…" },
  delConfirmTitle: { bn: "সত্যিই মুছে ফেলবেন?", en: "Delete this page for real?" },
  delConfirmBody: {
    bn: "সমর্থকেরা আর আপনার লিংক খুলতে পারবেন না। নিশ্চিত করতে আপনার হ্যান্ডেল লিখুন।",
    en: "Supporters will no longer be able to open your link. Type your handle to confirm.",
  },
  delConfirmHint: { bn: "নিশ্চিত করতে লিখুন: @{slug}", en: "Type to confirm: @{slug}" },
  delYes: { bn: "হ্যাঁ, মুছে ফেলুন", en: "Yes, delete" },
  delDone: { bn: "আপনার পাতা মুছে ফেলা হয়েছে", en: "Your page has been deleted" },
  delDemoOff: {
    bn: "ডেমো মোডে পাতা মোছা হয় না। সার্ভার মোডে এই কাজটি কাজ করবে।",
    en: "Page deletion is disabled in demo mode. It works in server mode.",
  },
  footerNote: {
    bn: "চানাস্তা টাকা প্রক্রিয়া করে না এবং আপনার টাকার কোনো ভাগ নেয় না।",
    en: "Chanasta does not process money and takes no cut of it.",
  },

  // ---- onboarding ---------------------------------------------------------
  onboardingTitle: { bn: "আপনার সাপোর্ট পাতা বানান", en: "Create your support page" },
  onboardingSub: {
    bn: "এক কাপ চা খাওয়ানোর একটা লিংক — আপনার নিজের অ্যাকাউন্টের তথ্য নিয়ে।",
    en: "One link for people to buy you a cup of tea — carrying your own account details.",
  },
  stepAccount: { bn: "লিংক", en: "Link" },
  stepPayment: { bn: "পেমেন্ট", en: "Payments" },
  stepProfile: { bn: "পরিচয়", en: "Identity" },
  stepPublish: { bn: "প্রকাশ", en: "Publish" },
  stepOf: { bn: "ধাপ {current} / {total}", en: "Step {current} / {total}" },
  accountSignedIn: { bn: "এই অ্যাকাউন্টে ঢাকা আছে", en: "Signed in to this account" },
  accountLocal: {
    bn: "ডেমো মোড — লগইন ছাড়াই পাতা বানাতে পারবেন।",
    en: "Demo mode — you can build a page without signing in.",
  },
  handleChooseTitle: { bn: "একটা নাম বেছে নিন", en: "Choose your handle" },
  handleChooseSub: { bn: "এটাই আপনার সাপোর্ট লিংকের শেষ অংশ।", en: "This is the end of your support link." },
  yourLink: { bn: "আপনার লিংক", en: "Your link" },
  paymentTitle: { bn: "আপনার পেমেন্ট তথ্য যোগ করুন", en: "Add your payment details" },
  paymentSub: {
    bn: "এই তথ্য আপনার নিজের। সমর্থকেরা সরাসরি আপনার অ্যাকাউন্টে পাঠাবেন — চানাস্তা মাঝখানে নেই।",
    en: "These are your own details. Supporters send straight to your account — Chanasta is not in the middle.",
  },
  profileStepTitle: { bn: "আপনার পরিচয়", en: "Tell people who you are" },
  profileStepSub: { bn: "সমর্থকেরা প্রথমে এটাই দেখবেন।", en: "This is the first thing supporters see." },
  publishTitle: { bn: "প্রিভিউ ও প্রকাশ", en: "Preview and publish" },
  publishSub: { bn: "দুই ভাষাতেই একবার দেখে নিন।", en: "Take a look in both languages." },
  previewL: { bn: "প্রিভিউ", en: "Preview" },
  checkHandle: { bn: "নাম বেছে নেওয়া হয়েছে", en: "Handle chosen" },
  checkMethod: { bn: "কমপক্ষে একটি পেমেন্ট মাধ্যম চালু আছে", en: "At least one payment method is on" },
  checkName: { bn: "দেখানোর নাম দেওয়া হয়েছে", en: "Display name added" },
  publishCta: { bn: "পাতা প্রকাশ করুন", en: "Publish page" },
  publishBlocked: {
    bn: "প্রকাশ করতে অন্তত একটি পেমেন্ট মাধ্যম চালু থাকতে হবে।",
    en: "Turn on at least one payment method to publish.",
  },
  publishBlockedLink: { bn: "পেমেন্টে যান", en: "Go to payments" },
  liveTitle: { bn: "আপনার পাতা তৈরি!", en: "Your page is live!" },
  liveSub: { bn: "লিংকটা ভাগ করুন — বাকিটা সমর্থকদের হাতে।", en: "Share the link — the rest is up to your supporters." },
  toDashboard: { bn: "ড্যাশবোর্ডে যান", en: "Go to dashboard" },
  draftSaved: { bn: "খসড়া সংরক্ষিত হয়েছে", en: "Draft saved" },
  needLogin: { bn: "পাতা তৈরি করতে লগইন করুন।", en: "Log in to create your page." },
  continueLater: { bn: "পরে চালিয়ে যাব", en: "Continue later" },

  // ---- login --------------------------------------------------------------
  loginTitle: { bn: "লগইন করুন", en: "Log in" },
  loginIntro: {
    bn: "পাসওয়ার্ড লাগবে না। ইমেইলে একটি লিংক পাঠাব, ক্লিক করলেই ঢুকে যাবেন।",
    en: "No password. We email you a link — click it and you're in.",
  },
  emailL: { bn: "আপনার ইমেইল", en: "Your email" },
  emailErr: { bn: "সঠিক ইমেইল লিখুন", en: "Enter a valid email" },
  sendLink: { bn: "লিংক পাঠান", en: "Send link" },
  sending: { bn: "পাঠানো হচ্ছে…", en: "Sending…" },
  linkSentTitle: { bn: "লিংক পাঠানো হয়েছে", en: "Link sent" },
  linkSentBody: { bn: "ইনবক্স দেখুন:", en: "Check the inbox of" },
  linkSentHelp: { bn: "লিংক না পেলে স্প্যাম ফোল্ডার দেখুন।", en: "If it doesn't arrive, check your spam folder." },
  linkShort: { bn: "লিংকটি কিছুক্ষণের জন্য কাজ করবে।", en: "The link works for a short while." },
  linkExpired: { bn: "এই লিংকটির মেয়াদ শেষ। আবার লিংক পাঠান।", en: "This link has expired. Send a new one." },
  demoLoginTitle: { bn: "ডেমো মোডে লগইন লাগে না", en: "No login in demo mode" },
  demoLoginBody: {
    bn: "এই ব্রাউজারেই আপনার পাতা বানাতে ও চালাতে পারবেন। কিছুই কোনো সার্ভারে যায় না।",
    en: "You can build and run your page right in this browser. Nothing goes to a server.",
  },
  openDashboard: { bn: "ড্যাশবোর্ড খুলুন", en: "Open the dashboard" },
  signedInAlready: { bn: "আপনি এই অ্যাকাউন্টে ঢাকা আছেন", en: "You're already signed in" },
  backHome: { bn: "পাতা তৈরি করতে ফিরে যান", en: "Back to the home page" },
  loginRateLimited: { bn: "একটু বেশি বার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।", en: "Too many attempts. Try again a little later." },
  loginFailed: { bn: "লগইন করা যায়নি। আবার চেষ্টা করুন।", en: "Couldn't sign in. Please try again." },
  loginDemoNote: {
    bn: "ডেমোতে কোনো আসল ইমেইল পাঠানো হয় না; লগইন ছাড়াই ড্যাশবোর্ড দেখা যায়।",
    en: "Demo mode sends no real email; the dashboard opens without logging in.",
  },

  // ---- legal --------------------------------------------------------------
  legalDraft: { bn: "খসড়া — আইনি পর্যালোচনার অপেক্ষায়", en: "Draft — pending legal review" },
  legalUpdated: { bn: "সর্বশেষ হালনাগাদ", en: "Last updated" },
  legalToc: { bn: "এই পাতায়", en: "On this page" },
  legalBack: { bn: "হোমে ফিরুন", en: "Back home" },
  legalPlain: {
    bn: "এই লেখা এখনো খসড়া। আইনি পর্যালোচনার আগে এটিকে চূড়ান্ত শর্ত হিসেবে ধরবেন না।",
    en: "This text is still a draft. Don't treat it as final terms before legal review.",
  },
} as const satisfies Record<string, CopyPair>;

export type AppCopy = typeof appCopy;
export type ResolvedAppCopy = { -readonly [Key in keyof AppCopy]: string };

export function pick(lang: Lang, pair: CopyPair): string {
  return lang === "en" ? pair.en : pair.bn;
}

/** Resolve the whole copy bank for a language (cheap; pages call it once). */
export function appCopyFor(lang: Lang): ResolvedAppCopy {
  const resolved = {} as ResolvedAppCopy;
  for (const key of Object.keys(appCopy) as Array<keyof AppCopy>) {
    resolved[key] = pick(lang, appCopy[key]);
  }
  return resolved;
}

/** Tiny `{var}` interpolation for the resolved copy (same convention as i18n). */
export function fill(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) out = out.split(`{${key}}`).join(String(value));
  return out;
}
