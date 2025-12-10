import { useAuthRequest, makeRedirectUri, ResponseType } from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo } from 'react';

// Ensure the web browser auth session completes on native
WebBrowser.maybeCompleteAuthSession();

// Helper to decode a JWT id_token payload safely
const decodeIdToken = (idToken) => {
  try {
    const [, payload] = idToken.split('.');
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded =
      typeof atob !== 'undefined'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('binary');
    const json = decodeURIComponent(
      decoded
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to decode id_token', err);
    return null;
  }
};

/**
 * Hook that returns a `signInWithGoogle` function compatible with:
 * - Expo Go (uses Expo proxy) via the Web client ID
 * - Standalone Android/iOS builds via native client IDs
 *
 * Required env vars:
 * - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     (Web client)
 * - EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (Android OAuth client)
 * - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     (iOS OAuth client)
 *
 * Also add the Expo proxy redirect to the Web client in GCP:
 *   https://auth.expo.io/@<owner>/<slug>
 */
export const useGoogleAuth = () => {
  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        useProxy: true, // Expo Go & dev builds
        native: 'com.anonymous.Sahara:/redirect', // standalone native
      }),
    []
  );

  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.IdToken,
      clientId:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
        '',
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: false, // implicit id_token flow
      extraParams: { nonce: Math.random().toString(36).slice(2) },
    },
    {
      useProxy: true,
    }
  );

  const signInWithGoogle = async () => {
    if (!request) {
      return { success: false, error: 'Google auth is not ready yet.' };
    }
    const result = await promptAsync({ useProxy: true });

    if (result.type !== 'success' || !result.params?.id_token) {
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: false, error: 'Google sign-in was cancelled' };
      }
      return { success: false, error: result.error || 'Google sign-in failed' };
    }

    const payload = decodeIdToken(result.params.id_token);
    if (!payload) {
      return { success: false, error: 'Failed to decode Google token' };
    }

    return {
      success: true,
      user: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        idToken: result.params.id_token,
      },
    };
  };

  // Optional: log errors for debugging
  useEffect(() => {
    if (response?.type === 'error') {
      console.error('Google auth error:', response);
    }
  }, [response]);

  return { signInWithGoogle, request, response };
};
