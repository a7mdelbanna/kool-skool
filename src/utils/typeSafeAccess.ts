
/**
 * Utility function for safely accessing properties from objects
 * that might be null or undefined. This is especially useful
 * when working with database results.
 * 
 * @param obj The object to access properties from
 * @param key The property key to access
 * @returns The property value or undefined if not accessible
 */
export const safeAccess = <T extends Record<string, any>, K extends string>(
  obj: T | null | undefined,
  key: K
): any => {
  if (!obj) return undefined;
  if (typeof obj !== 'object') return undefined;
  if (!(key in obj)) return undefined;
  return obj[key as keyof T];
};

/**
 * Type guard to check if an object has a specific property
 * 
 * @param obj The object to check
 * @param prop The property to check for
 * @returns Boolean indicating if the property exists on the object
 */
export const hasProperty = <T>(obj: any, prop: string): obj is T => {
  return obj && typeof obj === 'object' && prop in obj;
};

/**
 * Safely converts an unknown value to a string
 * 
 * @param value The value to convert to string
 * @returns A string representation or empty string if null/undefined
 */
export const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

/**
 * Checks if an array-like object has entries
 * 
 * @param arr The array-like object to check
 * @returns True if the array exists and has items
 */
export const hasEntries = (arr: any): boolean => {
  return !!arr && Array.isArray(arr) && arr.length > 0;
};
