import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  patientId: 'patientId',
  email: 'email',
  token: 'patient_token',
  profileComplete: 'profileComplete',
  emergencyComplete: 'emergencyComplete',
} as const;

export async function getItem(key: keyof typeof KEYS) {
  return AsyncStorage.getItem(KEYS[key]);
}

export async function setItem(key: keyof typeof KEYS, value: string) {
  return AsyncStorage.setItem(KEYS[key], value);
}

export async function multiSet(entries: Partial<Record<keyof typeof KEYS, string>>) {
  const pairs = Object.entries(entries)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => [KEYS[key as keyof typeof KEYS], value as string] as const);

  if (pairs.length) {
    await AsyncStorage.multiSet(pairs);
  }
}

export async function clearSession() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
