// Utility function to detect if text contains Urdu/Arabic characters
export const containsUrdu = (text: string): boolean => {
  if (!text) return false;
  // Urdu/Arabic character range
  const urduRegex = /[\u0600-\u06FF]/;
  return urduRegex.test(text);
};

// Get text direction based on language or content
export const getTextDirection = (text: string, currentLanguage: string): 'ltr' | 'rtl' => {
  if (currentLanguage === 'ur') {
    return 'rtl';
  }
  if (containsUrdu(text)) {
    return 'rtl';
  }
  return 'ltr';
};

