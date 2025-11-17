/**
 * Data Sanitization Utility
 * Removes PII (Personally Identifiable Information) from text before sending to LLMs
 */

interface SanitizationResult {
  sanitizedText: string;
  removedData: {
    emails: string[];
    phones: string[];
    addresses: string[];
    names: string[];
    ssn: string[];
    creditCards: string[];
  };
}

/**
 * Sanitizes text by removing PII and replacing with placeholders
 */
export function sanitizeText(text: string): SanitizationResult {
  const removedData = {
    emails: [] as string[],
    phones: [] as string[],
    addresses: [] as string[],
    names: [] as string[],
    ssn: [] as string[],
    creditCards: [] as string[],
  };

  let sanitized = text;

  // Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex) || [];
  emails.forEach((email) => {
    if (!removedData.emails.includes(email)) {
      removedData.emails.push(email);
    }
  });
  sanitized = sanitized.replace(emailRegex, '[EMAIL_REDACTED]');

  // Phone numbers (various formats)
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
  const phones = text.match(phoneRegex) || [];
  phones.forEach((phone) => {
    if (!removedData.phones.includes(phone)) {
      removedData.phones.push(phone);
    }
  });
  sanitized = sanitized.replace(phoneRegex, '[PHONE_REDACTED]');

  // SSN (Social Security Numbers)
  const ssnRegex = /\b\d{3}-?\d{2}-?\d{4}\b/g;
  const ssns = text.match(ssnRegex) || [];
  ssns.forEach((ssn) => {
    if (!removedData.ssn.includes(ssn)) {
      removedData.ssn.push(ssn);
    }
  });
  sanitized = sanitized.replace(ssnRegex, '[SSN_REDACTED]');

  // Credit card numbers
  const creditCardRegex = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
  const creditCards = text.match(creditCardRegex) || [];
  creditCards.forEach((card) => {
    if (!removedData.creditCards.includes(card)) {
      removedData.creditCards.push(card);
    }
  });
  sanitized = sanitized.replace(creditCardRegex, '[CARD_REDACTED]');

  // Common address patterns
  const addressRegex = /\b\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir)\b/gi;
  const addresses = text.match(addressRegex) || [];
  addresses.forEach((address) => {
    if (!removedData.addresses.includes(address)) {
      removedData.addresses.push(address);
    }
  });
  sanitized = sanitized.replace(addressRegex, '[ADDRESS_REDACTED]');

  // Common name patterns (this is a simple heuristic - may need refinement)
  // Look for capitalized words that might be names (excluding common words)
  const commonWords = new Set([
    'The', 'A', 'An', 'And', 'Or', 'But', 'In', 'On', 'At', 'To', 'For',
    'Of', 'With', 'By', 'From', 'As', 'Is', 'Was', 'Are', 'Were', 'Be',
    'Been', 'Have', 'Has', 'Had', 'Do', 'Does', 'Did', 'Will', 'Would',
    'Could', 'Should', 'May', 'Might', 'Must', 'Can', 'This', 'That',
    'These', 'Those', 'I', 'You', 'He', 'She', 'It', 'We', 'They',
    'Company', 'Corporation', 'Inc', 'LLC', 'Ltd', 'University', 'College',
    'School', 'Institute', 'Department', 'Office', 'Manager', 'Director',
    'Engineer', 'Developer', 'Designer', 'Analyst', 'Specialist', 'Coordinator',
  ]);

  // Simple name detection: capitalized words that aren't common words
  // This is a basic implementation - in production, use a proper NER library
  const words = sanitized.split(/\s+/);
  const potentialNames: string[] = [];
  
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i].replace(/[^\w]/g, '');
    const word2 = words[i + 1].replace(/[^\w]/g, '');
    
    if (
      word1.length > 1 &&
      word2.length > 1 &&
      word1[0] === word1[0].toUpperCase() &&
      word2[0] === word2[0].toUpperCase() &&
      !commonWords.has(word1) &&
      !commonWords.has(word2) &&
      !word1.match(/^\d/) &&
      !word2.match(/^\d/)
    ) {
      const fullName = `${word1} ${word2}`;
      if (!potentialNames.includes(fullName) && !removedData.names.includes(fullName)) {
        potentialNames.push(fullName);
        removedData.names.push(fullName);
      }
    }
  }

  // Replace potential names
  potentialNames.forEach((name) => {
    const nameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    sanitized = sanitized.replace(nameRegex, '[NAME_REDACTED]');
  });

  return {
    sanitizedText: sanitized,
    removedData,
  };
}

/**
 * Restores original PII into sanitized text
 */
export function restorePII(sanitizedText: string, removedData: SanitizationResult['removedData']): string {
  let restored = sanitizedText;

  // Restore in reverse order to avoid conflicts
  removedData.names.forEach((name) => {
    restored = restored.replace(/\[NAME_REDACTED\]/g, name);
  });

  removedData.addresses.forEach((address) => {
    restored = restored.replace(/\[ADDRESS_REDACTED\]/g, address);
  });

  removedData.creditCards.forEach((card) => {
    restored = restored.replace(/\[CARD_REDACTED\]/g, card);
  });

  removedData.ssn.forEach((ssn) => {
    restored = restored.replace(/\[SSN_REDACTED\]/g, ssn);
  });

  removedData.phones.forEach((phone) => {
    restored = restored.replace(/\[PHONE_REDACTED\]/g, phone);
  });

  removedData.emails.forEach((email) => {
    restored = restored.replace(/\[EMAIL_REDACTED\]/g, email);
  });

  return restored;
}

