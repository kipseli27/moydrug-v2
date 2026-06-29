// VoiceService — STT (expo-speech-recognition) + TTS (expo-speech)
import * as Speech from 'expo-speech';
import type { VoiceConfig } from '@/types';

// expo-speech-recognition — нативный модуль, недоступен в Expo Go
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = (event: string, cb: any) => {};
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Expo Go — голосовое распознавание недоступно
}

// ─── TTS (Text-to-Speech) ────────────────────────────────────────────────────

export async function speak(
  text: string,
  config: VoiceConfig,
  onDone?: () => void
): Promise<void> {
  // Очищаем от эмодзи для голосового режима
  const cleanText = text.replace(/[\p{Emoji}]/gu, '').trim();

  await Speech.speak(cleanText, {
    language: config.language,
    pitch: config.pitch,
    rate: config.rate,
    onDone,
    onError: (error) => {
      console.warn('TTS ошибка:', error);
      onDone?.();
    },
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

// ─── STT (Speech-to-Text) ────────────────────────────────────────────────────

export async function requestSpeechPermission(): Promise<boolean> {
  if (!ExpoSpeechRecognitionModule) return false;
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
}

export function startListening(lang = 'ru-RU'): void {
  if (!ExpoSpeechRecognitionModule) return;
  ExpoSpeechRecognitionModule.start({
    lang,
    interimResults: true,
    continuous: false,
  });
}

export function stopListening(): void {
  if (!ExpoSpeechRecognitionModule) return;
  ExpoSpeechRecognitionModule.stop();
}

/**
 * Хук для использования в компоненте VoiceSheet
 * Возвращает текущий транскрипт и статус
 */
export function useSTTEvents(
  onResult: (text: string) => void,
  onError: (error: string) => void
) {
  useSpeechRecognitionEvent('result', (event) => {
    if (event.isFinal && event.results[0]) {
      onResult(event.results[0].transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    onError(event.error ?? 'Ошибка распознавания');
  });
}
