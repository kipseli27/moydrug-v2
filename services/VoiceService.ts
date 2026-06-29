// VoiceService — STT (expo-speech-recognition) + TTS (edge-tts через сервер + expo-av)
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import type { VoiceConfig } from '@/types';

const API_URL = 'http://46.103.38.189';

// expo-speech-recognition — нативный модуль, недоступен в Expo Go
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = (_event: string, _cb: any) => {};
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Expo Go — голосовое распознавание недоступно
}

// ─── Текущий звук ────────────────────────────────────────────────────────────
let _currentSound: Audio.Sound | null = null;

// ─── Голоса по языку ─────────────────────────────────────────────────────────
function pickVoice(config: VoiceConfig): string {
  if (config.language?.startsWith('ru')) return 'ru-RU-SvetlanaNeural';
  return 'en-US-AriaNeural';
}

// ─── TTS через сервер (edge-tts → MP3 → expo-av) ─────────────────────────────

export async function speak(
  text: string,
  config: VoiceConfig,
  onDone?: () => void
): Promise<void> {
  await stopSpeaking();

  const cleanText = text.replace(/[\p{Emoji}]/gu, '').trim();
  if (!cleanText) { onDone?.(); return; }

  const voice = pickVoice(config);

  try {
    // 1. Запрос к серверу
    const response = await fetch(`${API_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, voice }),
    });

    if (!response.ok) throw new Error(`TTS server error: ${response.status}`);

    const { audio } = await response.json() as { audio: string };

    // 2. Запись base64 во временный файл
    const tmpUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(tmpUri, audio, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 3. Настройка аудио сессии
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // 4. Воспроизведение
    const { sound } = await Audio.Sound.createAsync(
      { uri: tmpUri },
      { shouldPlay: false }
    );
    _currentSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {});
        _currentSound = null;
        onDone?.();
      }
    });

    await sound.playAsync();
  } catch (err) {
    console.warn('TTS ошибка:', err);
    onDone?.();
  }
}

export async function stopSpeaking(): Promise<void> {
  if (_currentSound) {
    try {
      await _currentSound.stopAsync();
      await _currentSound.unloadAsync();
    } catch {}
    _currentSound = null;
  }
}

export function isSpeaking(): boolean {
  return _currentSound !== null;
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

export function useSTTEvents(
  onResult: (text: string) => void,
  onError: (error: string) => void
) {
  useSpeechRecognitionEvent('result', (event: any) => {
    if (event.isFinal && event.results[0]) {
      onResult(event.results[0].transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event: any) => {
    onError(event.error ?? 'Ошибка распознавания');
  });
}
