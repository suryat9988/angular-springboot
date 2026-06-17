export interface FirebaseEnvironmentConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const PLACEHOLDER_MARKERS = [
  'YOUR_API_KEY',
  'YOUR_PROJECT_ID',
  'YOUR_MESSAGING_SENDER_ID',
  'YOUR_APP_ID'
] as const;

export function isFirebaseConfigured(config: FirebaseEnvironmentConfig): boolean {
  return !PLACEHOLDER_MARKERS.some((marker) => Object.values(config).includes(marker));
}

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code: string }).code)
    : '';

  switch (code) {
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key':
      return 'Firebase is not configured yet. Add your Firebase web app keys in environment.ts.';
    case 'auth/unauthorized-domain':
      return 'This website domain is not authorized in Firebase. Add innovatedquantum.com under Authentication > Settings > Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is disabled in Firebase. Enable Google under Authentication > Sign-in method.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase. Check your internet connection and try again.';
    default:
      break;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to sign in with Gmail right now. Please try again.';
}
