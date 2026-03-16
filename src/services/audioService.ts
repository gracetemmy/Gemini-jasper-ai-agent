/**
 * Audio processing utilities for the Gemini Live API.
 * Handles PCM encoding/decoding for 16kHz mono audio.
 */

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  private async getContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  async startRecording(onAudioData: (base64Data: string) => void) {
    const ctx = await this.getContext();
    
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = ctx.createMediaStreamSource(this.stream);
    
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.source.connect(this.analyser);

    this.processor = ctx.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.floatTo16BitPCM(inputData);
      const base64Data = this.base64Encode(pcmData);
      onAudioData(base64Data);
    };

    this.source.connect(this.processor);
    this.processor.connect(ctx.destination);
  }

  stopRecording() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.processor?.disconnect();
    this.source?.disconnect();
  }

  stopPlayback() {
    this.activeSources.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    this.activeSources = [];
    this.nextStartTime = 0;
  }

  getByteFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  async playAudioChunk(base64Data: string) {
    try {
      const ctx = await this.getContext();

      const pcmData = this.base64Decode(base64Data);
      const floatData = this.pcm16ToFloat(pcmData);
      
      // Gemini output is 24000Hz
      const buffer = ctx.createBuffer(1, floatData.length, 24000);
      buffer.getChannelData(0).set(floatData);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      // Add a tiny buffer to avoid underruns
      const scheduleTime = Math.max(currentTime + 0.05, this.nextStartTime);
      
      source.start(scheduleTime);
      this.nextStartTime = scheduleTime + buffer.duration;
      
      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== source);
      };
    } catch (err) {
      console.error("Error playing audio chunk:", err);
    }
  }

  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const buffer = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buffer;
  }

  private pcm16ToFloat(pcm16Array: Int16Array): Float32Array {
    const buffer = new Float32Array(pcm16Array.length);
    for (let i = 0; i < pcm16Array.length; i++) {
      buffer[i] = pcm16Array[i] / 32768;
    }
    return buffer;
  }

  private base64Encode(buffer: Int16Array): string {
    const uint8 = new Uint8Array(buffer.buffer);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  }

  private base64Decode(base64: string): Int16Array {
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const uint8 = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      uint8[i] = binary.charCodeAt(i);
    }
    return new Int16Array(buffer);
  }
}
