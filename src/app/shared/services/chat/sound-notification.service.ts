import { Injectable } from '@angular/core';

export enum SoundType {
  MessageReceived = 'message-received',
  MessageSent = 'message-sent',
  Typing = 'typing',
  Notification = 'notification',
}

@Injectable({
  providedIn: 'root',
})
export class SoundNotificationService {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private isMuted = false;
  private volume = 0.5; // Default volume (0.0 to 1.0)

  constructor() {
    this.initializeAudioContext();
    this.loadSounds();
    this.loadPreferences();
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('Web Audio API is not supported in this browser:', error);
    }
  }

  private loadPreferences(): void {
    const savedMuted = localStorage.getItem('chatSoundsMuted');
    const savedVolume = localStorage.getItem('chatSoundsVolume');

    if (savedMuted !== null) {
      this.isMuted = savedMuted === 'true';
    }

    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
  }

  private savePreferences(): void {
    localStorage.setItem('chatSoundsMuted', this.isMuted.toString());
    localStorage.setItem('chatSoundsVolume', this.volume.toString());
  }

  // Generate sounds programmatically using Web Audio API
  private async loadSounds(): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Message Received Sound - Pleasant notification beep
      this.sounds.set(
        SoundType.MessageReceived,
        await this.createTone(800, 0.1, 'sine', [
          { time: 0, frequency: 800 },
          { time: 0.05, frequency: 1000 },
        ])
      );

      // Message Sent Sound - Soft confirmation beep
      this.sounds.set(
        SoundType.MessageSent,
        await this.createTone(600, 0.08, 'sine', [
          { time: 0, frequency: 600 },
          { time: 0.04, frequency: 500 },
        ])
      );

      // Typing Sound - Subtle click
      this.sounds.set(
        SoundType.Typing,
        await this.createTone(400, 0.03, 'square')
      );

      // General Notification Sound
      this.sounds.set(
        SoundType.Notification,
        await this.createTone(900, 0.15, 'sine', [
          { time: 0, frequency: 900 },
          { time: 0.05, frequency: 1100 },
          { time: 0.1, frequency: 900 },
        ])
      );
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  }

  private async createTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    frequencyChanges?: Array<{ time: number; frequency: number }>
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const sampleRate = this.audioContext.sampleRate;
    const numberOfChannels = 1;
    const length = sampleRate * duration;

    const buffer = this.audioContext.createBuffer(
      numberOfChannels,
      length,
      sampleRate
    );

    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;

      // Calculate frequency with changes
      let currentFreq = frequency;
      if (frequencyChanges) {
        for (const change of frequencyChanges) {
          if (t >= change.time) {
            currentFreq = change.frequency;
          }
        }
      }

      // Generate waveform
      let sample = 0;
      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * currentFreq * t);
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * currentFreq * t) > 0 ? 1 : -1;
          break;
        case 'triangle':
          sample =
            2 *
              Math.abs(
                2 * (currentFreq * t - Math.floor(currentFreq * t + 0.5))
              ) -
            1;
          break;
        default:
          sample = Math.sin(2 * Math.PI * currentFreq * t);
      }

      // Apply envelope (fade in and out)
      const fadeInDuration = 0.01;
      const fadeOutDuration = 0.02;

      if (t < fadeInDuration) {
        sample *= t / fadeInDuration;
      } else if (t > duration - fadeOutDuration) {
        sample *= (duration - t) / fadeOutDuration;
      }

      channelData[i] = sample * 0.3; // Reduce amplitude
    }

    return buffer;
  }

  /**
   * Play a sound notification
   */
  play(soundType: SoundType): void {
    if (this.isMuted || !this.audioContext || !this.sounds.has(soundType)) {
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.sounds.get(soundType)!;
      gainNode.gain.value = this.volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start(0);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  /**
   * Play message received sound
   */
  playMessageReceived(): void {
    this.play(SoundType.MessageReceived);
  }

  /**
   * Play message sent sound
   */
  playMessageSent(): void {
    this.play(SoundType.MessageSent);
  }

  /**
   * Play typing sound
   */
  playTyping(): void {
    this.play(SoundType.Typing);
  }

  /**
   * Play general notification sound
   */
  playNotification(): void {
    this.play(SoundType.Notification);
  }

  /**
   * Toggle mute on/off
   */
  toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.savePreferences();
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.savePreferences();
  }

  /**
   * Get mute state
   */
  isSoundMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.savePreferences();
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Resume audio context (needed for browsers that suspend audio context)
   */
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}
