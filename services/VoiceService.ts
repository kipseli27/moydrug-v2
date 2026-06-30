// VoiceService — STT + TTS (edge-tts via server + expo-av)
import { File, Paths } from 'expo-file-system/next';
import { Audio } from 'expo-av';
import type { VoiceConfig } from '@/types';

const API_URL = 'http://46.103.38.189';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = (_event: string, _cb: any) => {};
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {}

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

  if (_currentSound) {
    try { await _currentSound.stopAsync(); await _currentSound.unloadAsync(); } catch {}
    _currentSound = null;
  }

  const resp = await fetch(`${API_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: cleanText, voice: pickVoice(config) }),
  });
  if (!resp.ok) throw new Error(`TTS HTTP ${resp.status}`);

  const json = await resp.json() as { audio?: string; error?: string };
  if (!json.audio) throw new Error(`no audio: ${json.error ?? 'unknown'}`);

  // Декодируем base64 → ArrayBuffer и пишем через новый File API (expo-file-system/next)
  const binaryStr = atob(json.audio);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const audioFile = new File(Paths.cache, 'tts_audio.mp3');
  audioFile.write(bytes.buffer as ArrayBuffer);
  const fileUri = audioFile.uri;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: false });
  _currentSound = sound;
  await sound.playAsync();

  sound.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      sound.unloadAsync().catch(() => {});
      _currentSound = null;
      onDone?.();
    }
  });
}

export async function stopSpeaking(): Promise<void> {
  if (_currentSound) {
    try { await _currentSound.stopAsync(); await _currentSound.unloadAsync(); } catch {}
    _currentSound = null;
  }
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
