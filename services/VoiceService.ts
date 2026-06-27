// VoiceService — STT (expo-speech-recognition) + TTS (expo-speech)
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import type { VoiceConfig } from '@/types';

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
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
}

export function startListening(lang = 'ru-RU'): void {
  ExpoSpeechRecognitionModule.start({
    lang,
    interimResults: true,
    continuous: false,
  });
}

export function stopListening(): void {
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
