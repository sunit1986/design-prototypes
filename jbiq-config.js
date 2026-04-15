/**
 * JBIQ Configuration — Change API keys here, all pages in this folder will use them.
 *
 * Chat (Claude): Browser → CHAT_PROXY (Cloudflare Worker) → Anthropic API.
 *   The Worker holds ANTHROPIC_API_KEY; the page never calls api.anthropic.com directly.
 *
 * TTS (ElevenLabs): Direct browser fetch to api.elevenlabs.io often FAILS (CORS / browser blocks).
 *   JBIQ_TTS tries ElevenLabs first when TTS_PROVIDER is 'elevenlabs', then falls back to Sarvam TTS
 *   so Speak still works. For production ElevenLabs from the web, add a small /tts proxy on your Worker.
 *
 * STT (Speech-to-Text) always uses Sarvam from the browser (same key as below).
 */
window.JBIQ_CONFIG = {
  // Chat API (Anthropic via Cloudflare Worker proxy)
  CHAT_PROXY: 'https://jbiq-proxy.sunit3-sharma.workers.dev',

  // Gemini LLM (for V1 onboarding Q&A) — key inline in HTML
  GEMINI_MODEL: 'gemini-2.5-flash',

  // Text-to-Speech Provider: 'sarvam' or 'elevenlabs'
  TTS_PROVIDER: 'sarvam',  // Change to 'elevenlabs' to use ElevenLabs

  // Sarvam AI (used for STT always, TTS when TTS_PROVIDER='sarvam')
  SARVAM_KEY: 'sk_8ajz668k_7FQZo3QWwcAQ8Sm30SmTt6L4',
  SARVAM_TTS_URL: 'https://api.sarvam.ai/text-to-speech',
  SARVAM_STT_URL: 'https://api.sarvam.ai/speech-to-text',
  SARVAM_SPEAKER: 'anushka',

  // ElevenLabs (used for TTS when TTS_PROVIDER='elevenlabs')
  ELEVENLABS_KEY: 'sk_86a2daf2318ba84afa5190ff9a2c09fcc9e7f9dafea1fe79',
  ELEVENLABS_URL: 'https://api.elevenlabs.io/v1/text-to-speech',
  ELEVENLABS_VOICE: 'EXAVITQu4vr4xnSDxMaL',  // "Sarah" - female English voice
  ELEVENLABS_MODEL: 'eleven_multilingual_v2',

  // User
  USER_NAME: 'Deepa'
};

// Legacy variable names for backward compatibility (used by existing HTML files)
// SARVAM_KEY is always the Sarvam key (for STT which only works with Sarvam)
var SARVAM_KEY = window.JBIQ_CONFIG.SARVAM_KEY;
var SARVAM_API_KEY = window.JBIQ_CONFIG.SARVAM_KEY;
var CHAT_PROXY = window.JBIQ_CONFIG.CHAT_PROXY;
var VOICE_CHAT_PROXY = window.JBIQ_CONFIG.CHAT_PROXY;

/**
 * Unified TTS Function - Works with both Sarvam and ElevenLabs
 * Returns: { audio: Audio object, base64: string (for Sarvam) or null }
 * Usage: const result = await window.JBIQ_TTS(text, lang); result.audio.play();
 */
window.JBIQ_TTS = async function(text, lang) {
  const cfg = window.JBIQ_CONFIG;
  const provider = cfg.TTS_PROVIDER || 'sarvam';
  
  // Clean text for TTS
  const cleaned = text
    .replace(/[#*_`>\[\](){}|~]/g, '')
    .replace(/\bhttps?:\/\/\S+/g, '')
    .replace(/[^\w\s.,!?;:'"₹%\-\n\u0900-\u097F]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .substring(0, 500);
  
  if (!cleaned) return null;
  
  try {
    if (provider === 'elevenlabs') {
      // ElevenLabs direct (often blocked in browser — fallback below)
      try {
        const url = cfg.ELEVENLABS_URL + '/' + cfg.ELEVENLABS_VOICE;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': cfg.ELEVENLABS_KEY
          },
          body: JSON.stringify({
            text: cleaned,
            model_id: cfg.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          })
        });
        if (resp.ok) {
          const audioBlob = await resp.blob();
          const ct = (resp.headers.get('content-type') || '').toLowerCase();
          if (ct.includes('json') || audioBlob.size < 200) {
            console.warn('ElevenLabs returned non-audio; falling back to Sarvam TTS.');
          } else {
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.onended = () => URL.revokeObjectURL(audioUrl);
            return { audio: audio, base64: null, provider: 'elevenlabs' };
          }
        } else {
          console.warn('ElevenLabs TTS HTTP', resp.status, '— CORS or key issue is common in the browser. Using Sarvam TTS fallback.');
        }
      } catch (e) {
        console.warn('ElevenLabs TTS failed (often CORS from file:// or blocked origin):', e && e.message);
      }
      // Fallback: Sarvam TTS so Speak / voice still plays
      const ttsLang = (lang && lang.startsWith('hi')) ? 'hi-IN' : 'en-IN';
      const resp = await fetch(cfg.SARVAM_TTS_URL, {
        method: 'POST',
        headers: {
          'api-subscription-key': cfg.SARVAM_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: [cleaned],
          target_language_code: ttsLang,
          speaker: cfg.SARVAM_SPEAKER || 'anushka',
          model: 'bulbul:v2'
        })
      });
      if (!resp.ok) {
        console.error('Sarvam TTS fallback error:', resp.status);
        return null;
      }
      const data = await resp.json();
      if (data.audios && data.audios[0]) {
        const base64 = data.audios[0];
        const audio = new Audio('data:audio/wav;base64,' + base64);
        return { audio: audio, base64: base64, provider: 'sarvam-fallback' };
      }
      return null;
    } else {
      // Sarvam API (default)
      const ttsLang = (lang && lang.startsWith('hi')) ? 'hi-IN' : 'en-IN';
      const resp = await fetch(cfg.SARVAM_TTS_URL, {
        method: 'POST',
        headers: {
          'api-subscription-key': cfg.SARVAM_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: [cleaned],
          target_language_code: ttsLang,
          speaker: cfg.SARVAM_SPEAKER || 'anushka',
          model: 'bulbul:v2'
        })
      });
      
      if (!resp.ok) {
        console.error('Sarvam TTS error:', resp.status);
        return null;
      }
      
      const data = await resp.json();
      if (data.audios && data.audios[0]) {
        const base64 = data.audios[0];
        const audio = new Audio('data:audio/wav;base64,' + base64);
        return { audio: audio, base64: base64, provider: 'sarvam' };
      }
      return null;
    }
  } catch (e) {
    console.error('TTS error:', e);
    return null;
  }
};
