/**
 * Masks Personally Identifiable Information (PII) before text is sent to LLM providers or logs.
 * 
 * Rules:
 * 1. Email addresses -> [EMAIL]
 * 2. Indian PAN numbers (5 letters, 4 digits, 1 letter) -> [PAN]
 * 3. 12-digit Aadhaar-like numbers -> [ID]
 * 4. 10-digit Phone numbers (optional +91 or 0 prefix) -> [PHONE]
 * 5. Any remaining sequence of 9+ digits (card/account/ref numbers) -> [NUM]
 * 
 * @param {string} text 
 * @returns {string} Sanitized string
 */
export function piiMask(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let masked = text;

  // 1. Email pattern
  masked = masked.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    '[EMAIL]'
  );

  // 2. PAN card: 5 uppercase letters, 4 digits, 1 uppercase letter
  masked = masked.replace(
    /\b[A-Za-z]{5}[0-9]{4}[A-Za-z]\b/g,
    '[PAN]'
  );

  // 3. Aadhaar: 12 digits, often formatted as XXXX XXXX XXXX or XXXXXXXXXXXX
  masked = masked.replace(
    /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    '[ID]'
  );

  // 4. Phone numbers: 10 digits, optional (+91, 91, or 0) prefix
  masked = masked.replace(
    /(?:\+91[\s-]?|\b0[\s-]?|\b91[\s-]?)?[6-9]\d{9}\b/g,
    '[PHONE]'
  );

  // 5. Any digit run of 9+ digits (bank account, debit card, reference numbers)
  masked = masked.replace(
    /\b\d{9,}\b/g,
    '[NUM]'
  );

  return masked;
}

export default piiMask;
