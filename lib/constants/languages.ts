/**
 * Supported languages for i18n translation
 * Based on Google Translate's language support
 * Format: { code: string, name: string, label: string }
 * code: ISO 639-1 language code (used internally)
 * name: Full language name in English
 * label: Display label in UI (e.g., "中文" or "Chinese (zh)")
 */

export interface Language {
  code: string;
  name: string;
  label: string;
}

export const LANGUAGES: Language[] = [
  // East Asian Languages
  { code: "zh", name: "Chinese (Simplified)", label: "中文 (简体) (zh)" },
  { code: "zh-TW", name: "Chinese (Traditional)", label: "中文 (繁體) (zh-TW)" },
  { code: "ja", name: "Japanese", label: "日本語 (ja)" },
  { code: "ko", name: "Korean", label: "한국어 (ko)" },

  // Southeast Asian Languages
  { code: "th", name: "Thai", label: "ไทย (th)" },
  { code: "vi", name: "Vietnamese", label: "Tiếng Việt (vi)" },
  { code: "id", name: "Indonesian", label: "Bahasa Indonesia (id)" },
  { code: "ms", name: "Malay", label: "Bahasa Melayu (ms)" },
  { code: "tl", name: "Filipino", label: "Tagalog (tl)" },
  { code: "lo", name: "Lao", label: "ລາວ (lo)" },
  { code: "my", name: "Burmese", label: " Myanmar (my)" },
  { code: "km", name: "Khmer", label: "ខ្មែរ (km)" },

  // South Asian Languages
  { code: "hi", name: "Hindi", label: "हिन्दी (hi)" },
  { code: "bn", name: "Bengali", label: "বাংলা (bn)" },
  { code: "pa", name: "Punjabi", label: "ਪੰਜਾਬੀ (pa)" },
  { code: "ta", name: "Tamil", label: "தமிழ் (ta)" },
  { code: "te", name: "Telugu", label: "తెలుగు (te)" },
  { code: "kn", name: "Kannada", label: "ಕನ್ನಡ (kn)" },
  { code: "ml", name: "Malayalam", label: "മലയാളം (ml)" },
  { code: "ur", name: "Urdu", label: "اردو (ur)" },

  // Western European Languages
  { code: "en", name: "English", label: "English (en)" },
  { code: "fr", name: "French", label: "Français (fr)" },
  { code: "de", name: "German", label: "Deutsch (de)" },
  { code: "es", name: "Spanish", label: "Español (es)" },
  { code: "it", name: "Italian", label: "Italiano (it)" },
  { code: "pt", name: "Portuguese", label: "Português (pt)" },
  { code: "pt-BR", name: "Portuguese (Brazil)", label: "Português (pt-BR)" },
  { code: "nl", name: "Dutch", label: "Nederlands (nl)" },

  // Northern & Eastern European Languages
  { code: "ru", name: "Russian", label: "Русский (ru)" },
  { code: "uk", name: "Ukrainian", label: "Українська (uk)" },
  { code: "pl", name: "Polish", label: "Polski (pl)" },
  { code: "cs", name: "Czech", label: "Čeština (cs)" },
  { code: "sk", name: "Slovak", label: "Slovenčina (sk)" },
  { code: "ro", name: "Romanian", label: "Română (ro)" },
  { code: "hu", name: "Hungarian", label: "Magyar (hu)" },
  { code: "bg", name: "Bulgarian", label: "Български (bg)" },
  { code: "hr", name: "Croatian", label: "Hrvatski (hr)" },
  { code: "sr", name: "Serbian", label: "Српски (sr)" },

  // Nordic Languages
  { code: "sv", name: "Swedish", label: "Svenska (sv)" },
  { code: "da", name: "Danish", label: "Dansk (da)" },
  { code: "no", name: "Norwegian", label: "Norsk (no)" },
  { code: "fi", name: "Finnish", label: "Suomi (fi)" },

  // Other European Languages
  { code: "el", name: "Greek", label: "Ελληνικά (el)" },
  { code: "tr", name: "Turkish", label: "Türkçe (tr)" },

  // Middle Eastern & African Languages
  { code: "ar", name: "Arabic", label: "العربية (ar)" },
  { code: "he", name: "Hebrew", label: "עברית (he)" },
  { code: "fa", name: "Persian", label: "فارسی (fa)" },
  { code: "sw", name: "Swahili", label: "Kiswahili (sw)" },
  { code: "af", name: "Afrikaans", label: "Afrikaans (af)" },

  // Other Languages
  { code: "ca", name: "Catalan", label: "Català (ca)" },
  { code: "eu", name: "Basque", label: "Euskera (eu)" },
];

// Get language by code
export const getLanguageByCode = (code: string): Language | undefined => {
  return LANGUAGES.find((lang) => lang.code === code);
};

// Get all language codes
export const getLanguageCodes = (): string[] => {
  return LANGUAGES.map((lang) => lang.code);
};
