/**
 * Client-side audio conversion utility.
 * Decodes recorded audio (e.g. WebM/Opus, MP4/AAC, OGG) using Web Audio API,
 * resamples to 16,000 Hz Mono, and encodes into a valid 16-bit PCM WAV Blob.
 */

/**
 * Encodes Float32Array PCM samples into a standard 16-bit PCM WAV ArrayBuffer.
 *
 * @param {Float32Array} samples - Audio samples normalized between -1.0 and 1.0
 * @param {number} sampleRate - Sample rate in Hz (e.g. 16000)
 * @returns {ArrayBuffer}
 */
export function encodePcmWav(samples, sampleRate = 16000) {
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize: 36 + SubChunk2Size
  writeString(8, 'WAVE');

  // "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size: 16 for PCM
  view.setUint16(20, 1, true); // AudioFormat: 1 = PCM
  view.setUint16(22, numChannels, true); // NumChannels: 1
  view.setUint32(24, sampleRate, true); // SampleRate: 16000
  view.setUint32(28, byteRate, true); // ByteRate: 32000
  view.setUint16(32, blockAlign, true); // BlockAlign: 2
  view.setUint16(34, bitsPerSample, true); // BitsPerSample: 16

  // "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true); // SubChunk2Size: data length in bytes

  // Write 16-bit signed integer PCM samples (clamped to [-1.0, 1.0])
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Converts any browser-recorded audio Blob into a 16kHz Mono 16-bit PCM WAV Blob.
 *
 * @param {Blob} audioBlob - Raw audio blob from MediaRecorder
 * @param {number} targetSampleRate - Target sample rate (defaults to 16000 Hz)
 * @returns {Promise<Blob>}
 */
export async function convertBlobToWav(audioBlob, targetSampleRate = 16000) {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Recording is empty');
  }

  const startTime = performance.now();
  console.log(`[VOICE] WAV conversion started, input size: ${audioBlob.size} bytes`);

  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const arrayBuffer = await audioBlob.arrayBuffer();

  // Create temporary AudioContext to decode audio data
  const audioCtx = new AudioCtxClass();
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      // ignore
    }
  }

  let audioBuffer;
  try {
    // Decode with 6-second timeout to prevent indefinite hangs
    audioBuffer = await Promise.race([
      new Promise((resolve, reject) => {
        const promise = audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
        if (promise && typeof promise.then === 'function') {
          promise.then(resolve).catch(reject);
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Audio decoding timed out after 6 seconds')), 6000)
      )
    ]);
  } catch (decodeErr) {
    console.error('Audio decoding failed:', decodeErr);
    throw new Error('Failed to decode recorded audio format.');
  } finally {
    if (audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Decoded audio stream contains no samples.');
  }

  // Resample and mix down to 16,000 Hz Mono
  let monoSamples;
  let finalSampleRate = targetSampleRate;

  const OfflineCtxClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (OfflineCtxClass) {
    try {
      const targetLength = Math.max(1, Math.ceil(audioBuffer.duration * targetSampleRate));
      const offlineCtx = new OfflineCtxClass(1, targetLength, targetSampleRate);

      const bufferSource = offlineCtx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(offlineCtx.destination);
      bufferSource.start(0);

      // Resample with 6-second timeout
      const renderedBuffer = await Promise.race([
        offlineCtx.startRendering(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Audio resampling timed out after 6 seconds')), 6000)
        )
      ]);
      monoSamples = renderedBuffer.getChannelData(0);
      finalSampleRate = targetSampleRate;
    } catch (offlineErr) {
      console.warn('OfflineAudioContext resampling fallback to manual mix:', offlineErr);
    }
  }

  // Fallback: mix down channels to mono if OfflineAudioContext was skipped/failed
  if (!monoSamples) {
    finalSampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    monoSamples = new Float32Array(length);

    for (let c = 0; c < numChannels; c++) {
      const channelData = audioBuffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        monoSamples[i] += channelData[i] / numChannels;
      }
    }
  }

  // Encode PCM samples into standard 16-bit PCM WAV
  const wavArrayBuffer = encodePcmWav(monoSamples, finalSampleRate);
  const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
  const duration = (performance.now() - startTime).toFixed(1);
  console.log(`[VOICE] WAV conversion completed in ${duration}ms, WAV size: ${wavBlob.size} bytes`);
  return wavBlob;
}
