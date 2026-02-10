export const containsUrdu = (text: string): boolean => {
  if (!text) return false;
 
  const urduRegex = /[\u0600-\u06FF]/;
  return urduRegex.test(text);
};


export const getTextDirection = (text: string, currentLanguage: string): 'ltr' | 'rtl' => {
  if (currentLanguage === 'ur') {
    return 'rtl';
  }
  if (containsUrdu(text)) {
    return 'rtl';
  }
  return 'ltr';
};
