export function formatUTCToLocal(utcDateString: string): string {
  try {
    // Parse the UTC date string
    const date = new Date(utcDateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return utcDateString; // Return original if parsing fails
    }
    
    // Get browser's locale and timezone
    const userLocale = navigator.language || 'en-US';
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Format options for Korean style
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: userTimeZone
    };
    
    // Format based on locale
    if (userLocale.startsWith('ko')) {
      // Korean format: "2025년 6월 21일 토요일 오후 8시 40분 39초"
      return new Intl.DateTimeFormat('ko-KR', options).format(date);
    } else {
      // English format: "Saturday, June 21, 2025 at 8:40:39 PM"
      const formatted = new Intl.DateTimeFormat('en-US', options).format(date);
      // Adjust format to match the expected output
      return formatted.replace(/,(?=[^,]*$)/, ' at');
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return utcDateString;
  }
}

// Helper function to detect if a string contains UTC time pattern
export function containsUTCTime(text: string): boolean {
  // Pattern to match various UTC time formats
  const utcPatterns = [
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/i, // ISO format
    /\w+,\s+\w+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}:\d{2}\s+(AM|PM)\s+UTC/i, // Your format
    /\d{4}년\s+\d{1,2}월\s+\d{1,2}일.*UTC/i, // Korean format with UTC
  ];
  
  return utcPatterns.some(pattern => pattern.test(text));
}

// Function to replace all UTC times in a text with local times
export function replaceUTCTimesInText(text: string): string {
  // Pattern to match the specific format: "Saturday, June 21, 2025 at 11:40:39 AM UTC"
  const utcPattern = /(\w+,\s+\w+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}:\d{2}\s+(AM|PM))\s+UTC/gi;
  
  return text.replace(utcPattern, (_, dateTimePart) => {
    // Add UTC to make it parseable
    const utcString = dateTimePart + ' UTC';
    return formatUTCToLocal(utcString);
  });
}