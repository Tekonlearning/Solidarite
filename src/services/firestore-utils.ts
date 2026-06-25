import { db } from '../lib/firebase/config';
import { 
  query, 
  limit, 
  startAfter, 
  getDoc, 
  doc, 
  getDocs, 
  QueryConstraint,
  Query,
  DocumentSnapshot,
  DocumentData
} from 'firebase/firestore';

/**
 * Configuration options for the retry mechanism
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: any) => boolean;
}

/**
 * Standard list of Firestore transient errors that are safe to retry.
 */
const TRANSIENT_FIRESTORE_ERRORS = [
  'aborted',
  'resource-exhausted',
  'unavailable',
  'deadline-exceeded',
  'cancelled'
];

/**
 * Utility function to determine if an error is retryable.
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  const code = error.code;
  const message = error.message || '';
  
  // Check standard firestore codes
  if (code && TRANSIENT_FIRESTORE_ERRORS.includes(code)) {
    return true;
  }
  
  // Check general network/offline messages
  if (message.includes('offline') || message.includes('network') || message.includes('unavailable')) {
    return true;
  }
  
  return false;
}

/**
 * Runs a Firestore operation with exponential backoff and randomized jitter retries.
 */
export async function runWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 300,
    maxDelayMs = 3000,
    retryOn = isRetryableError
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      
      if (attempt > maxRetries || !retryOn(error)) {
        throw error;
      }

      // Calculate exponential backoff with jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const randomizedJitter = Math.random() * 100; // adds up to 100ms jitter
      const finalDelay = Math.min(exponentialDelay + randomizedJitter, maxDelayMs);

      console.warn(
        `Firestore operation failed (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(finalDelay)}ms. Error: ${error.message || error}`
      );

      await new Promise((resolve) => setTimeout(resolve, finalDelay));
    }
  }
}

/**
 * Pagination parameters
 */
export interface PaginationOptions {
  limitSize?: number;
  startAfterDocId?: string;
  collectionName?: string;
}

/**
 * Standard envelope for paginated results
 */
export interface PaginatedResult<T> {
  data: T[];
  lastVisibleDocId?: string;
  hasMore: boolean;
}

/**
 * Utility to execute a paginated query in Firestore v9+.
 * Fetches the document snapshot of startAfterDocId if provided to use as query cursor.
 */
export async function getPaginatedQuery<T = DocumentData>(
  baseQuery: Query<DocumentData>,
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const { limitSize = 10, startAfterDocId, collectionName } = options;
  const constraints: QueryConstraint[] = [limit(limitSize + 1)];

  if (startAfterDocId && collectionName) {
    try {
      const cursorRef = doc(db, collectionName, startAfterDocId);
      const cursorSnap = await getDoc(cursorRef);
      if (cursorSnap.exists()) {
        constraints.push(startAfterAfterCursor(cursorSnap));
      }
    } catch (err) {
      console.warn('Could not retrieve cursor document for pagination, starting from beginning:', err);
    }
  }

  const paginatedQuery = query(baseQuery, ...constraints);
  const snapshot = await getDocs(paginatedQuery);
  
  const results: T[] = [];
  snapshot.forEach((d) => {
    results.push({ ...d.data(), id: d.id } as unknown as T);
  });

  const hasMore = results.length > limitSize;
  if (hasMore) {
    results.pop(); // Remove the extra element used to check hasMore
  }

  const lastDoc = snapshot.docs[results.length - 1];
  const lastVisibleDocId = lastDoc ? lastDoc.id : undefined;

  return {
    data: results,
    lastVisibleDocId,
    hasMore
  };
}

// Private helper to isolate startAfter dependency signature
function startAfterAfterCursor(docSnap: DocumentSnapshot<DocumentData>): QueryConstraint {
  return startAfter(docSnap);
}
