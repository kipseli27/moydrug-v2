// VoiceService — STT (expo-speech-recognition) + TTS (edge-tts via server → expo-av)
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import type { VoiceConfig } from '@/types';

const API_URL = 'http://46.103.38.189';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = (_event: string, _cb: any) => {};
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // not available in Expo Go
}

let _currentSound: Audio.Sound | null = null;

function pickVoice(config: VoiceConfig): string {
  if (config.language?.startsWith('ru')) return 'ru-RU-SvetlanaNeural';
  return 'en-US-AriaNeural';
}

export async function speak(
  text: string,
  config: VoiceConfig,
  onDone?: () => void
): Promise<void> {
  const cleanText = text.replace(/[\p{Emoji}]/gu, '').trim();
  if (!cleanText) { onDone?.(); return; }

  // Stop previous
  if (_currentSound) {
    try { await _currentSound.stopAsync(); await _currentSound.unloadAsync(); } catch {}
    _currentSound = null;
  }

  try {
    // Fetch TTS from server
    const resp = await fetch(`${API_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, voice: pickVoice(config) }),
    });
    if (!resp.ok) throw new Error('TTS server error');
    const { audio } = await resp.json() as { audio: string };

    // Write base64 MP3 to temp file (data: URIs unreliable on Android)
    const fileUri = (FileSystem.cacheDirectory ?? '') + 'tts_audio.mp3';
    await FileSystem.writeAsStringAsync(fileUri, audio, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Set audio mode (play through speaker, not earpiece)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // Load and play
    const { sound } = await Audio.Sound.createAsync(
      { uri: fileUri },
      { shouldPlay: true, volume: 1.0 }
    );
    _currentSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        _currentSound = null;
        onDone?.();
      }
    });
  } catch (e) {
    // Fallback to device TTS if server unavailable
    console.warn('edge-tts failed, falling back to expo-speech:', e);
    try {
      const Speech = require('expo-speech');
      Speech.speak(cleanText, {
        language: config.language ?? 'ru-RU',
        onDone,
        onError: () => { onDone?.(); },
      });
    } catch {
      onDone?.();
    }
  }
}

export async function stopSpeaking(): Promise<void> {
  if (_currentSound) {
    try { await _currentSound.stopAsync(); await _currentSound.unloadAsync(); } catch {}
    _currentSound = null;
  }
  try {
    const Speech = require('expo-speech');
    await Speech.stop();
  } catch {}
}

export function isSpeaking(): Promise<boolean> {
  return Promise.resolve(_currentSound !== null);
}

export async function requestSpeechPermission(): Promise<boolean> {
  if (!ExpoSpeechRecognitionModule) return false;
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
}

export function startListening(lang = 'ru-RU'): void {
  if (!ExpoSpeechRecognitionModule) return;
  ExpoSpeechRecognitionModule.start({ lang, interimResults: true, continuous: false });
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
    onError(event.error ?? 'Recognition error');
  });
}
