// Eleven Labs Voice Service for Text-to-Speech

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string;
  settings?: VoiceSettings;
}

export interface VoiceSettings {
  stability: number; // 0-1, higher = more consistent
  similarity_boost: number; // 0-1, higher = more similar to original
  style?: number; // 0-1, for v2 voices only
  use_speaker_boost?: boolean;
}

export interface TextToSpeechOptions {
  voice_id: string;
  model_id?: 'eleven_monolingual_v1' | 'eleven_multilingual_v1' | 'eleven_multilingual_v2';
  voice_settings?: VoiceSettings;
  optimize_streaming_latency?: number; // 0-4
  output_format?: 'mp3_44100' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100';
}

export interface GeneratedAudio {
  audio_url: string;
  audio_blob: Blob;
  duration_estimate?: number;
  char_count: number;
  voice_id: string;
}

export interface StreamingOptions extends TextToSpeechOptions {
  chunk_size?: number;
  onChunk?: (audioChunk: ArrayBuffer) => void;
  onProgress?: (progress: number) => void;
}

class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Default voice (Sarah)

  // Predefined voices for different teaching styles
  private teacherVoices = {
    'friendly_female': 'EXAVITQu4vr4xnSDxMaL', // Sarah
    'professional_male': '5Q0t7uMcjvnagumLfvZi', // Arnold
    'encouraging_female': 'MF3mGyEYCl7XYWbV9V6O', // Emily
    'calm_male': 'TxGEqnHWrfWFTfGW9XjX', // Josh
    'energetic_female': 'jsCqWAovK2LkecY7zXl4', // Bella
    'patient_male': 'onwK4e9ZLuTAKqWW03F9' // Daniel
  };

  constructor() {
    // Get API key from environment variables
    this.apiKey = import.meta.env.VITE_ELEVEN_LABS_API_KEY || '';
  }

  // Initialize with API key
  initialize(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  // Check if service is configured
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // Get list of available voices
  async getVoices(): Promise<Voice[]> {
    if (!this.isConfigured()) {
      // Return mock voices for development
      return this.getMockVoices();
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      return data.voices;
    } catch (error) {
      console.error('Error fetching voices:', error);
      return this.getMockVoices();
    }
  }

  // Get recommended teacher voices
  getTeacherVoices(): Record<string, string> {
    return this.teacherVoices;
  }

  // Convert text to speech
  async textToSpeech(
    text: string,
    options?: TextToSpeechOptions
  ): Promise<GeneratedAudio> {
    if (!this.isConfigured()) {
      // Return mock audio for development
      return this.generateMockAudio(text, options?.voice_id);
    }

    try {
      const voiceId = options?.voice_id || this.defaultVoiceId;
      const modelId = options?.model_id || 'eleven_multilingual_v2';

      const requestBody = {
        text,
        model_id: modelId,
        voice_settings: options?.voice_settings || {
          stability: 0.5,
          similarity_boost: 0.75
        }
      };

      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail?.message || 'Text-to-speech failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Estimate duration (rough calculation)
      const wordsPerMinute = 150;
      const wordCount = text.split(/\s+/).length;
      const durationEstimate = (wordCount / wordsPerMinute) * 60;

      return {
        audio_url: audioUrl,
        audio_blob: audioBlob,
        duration_estimate: durationEstimate,
        char_count: text.length,
        voice_id: voiceId
      };
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  }

  // Stream text-to-speech for real-time playback
  async streamTextToSpeech(
    text: string,
    options: StreamingOptions
  ): Promise<void> {
    if (!this.isConfigured()) {
      // Simulate streaming for development
      return this.simulateStreaming(text, options);
    }

    try {
      const voiceId = options.voice_id || this.defaultVoiceId;
      const modelId = options.model_id || 'eleven_multilingual_v2';

      const requestBody = {
        text,
        model_id: modelId,
        voice_settings: options.voice_settings || {
          stability: 0.5,
          similarity_boost: 0.75
        },
        optimize_streaming_latency: options.optimize_streaming_latency || 2
      };

      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error('Streaming failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let totalBytes = 0;
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        totalBytes += value.length;

        if (options.onChunk) {
          options.onChunk(value.buffer);
        }

        if (options.onProgress && total > 0) {
          options.onProgress(totalBytes / total);
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
  }

  // Generate audio for conversation response
  async generateConversationAudio(
    text: string,
    conversationStyle: 'formal' | 'casual' | 'encouraging' | 'challenging' = 'encouraging'
  ): Promise<GeneratedAudio> {
    // Select appropriate voice based on style
    let voiceId = this.defaultVoiceId;
    let voiceSettings: VoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75
    };

    switch (conversationStyle) {
      case 'formal':
        voiceId = this.teacherVoices.professional_male;
        voiceSettings.stability = 0.7;
        break;
      case 'casual':
        voiceId = this.teacherVoices.friendly_female;
        voiceSettings.stability = 0.4;
        voiceSettings.similarity_boost = 0.6;
        break;
      case 'encouraging':
        voiceId = this.teacherVoices.encouraging_female;
        voiceSettings.stability = 0.5;
        break;
      case 'challenging':
        voiceId = this.teacherVoices.energetic_female;
        voiceSettings.stability = 0.3;
        voiceSettings.similarity_boost = 0.8;
        break;
    }

    return this.textToSpeech(text, {
      voice_id: voiceId,
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings
    });
  }

  // Generate pronunciation example
  async generatePronunciationExample(
    word: string,
    language: string = 'en'
  ): Promise<GeneratedAudio> {
    // Use a clear, slow voice for pronunciation
    const voiceSettings: VoiceSettings = {
      stability: 0.8, // High stability for clear pronunciation
      similarity_boost: 0.5,
      style: 0.0 // Neutral style
    };

    // Add pauses and emphasis for clarity
    const text = `${word}... ${word}`;

    return this.textToSpeech(text, {
      voice_id: this.teacherVoices.patient_male,
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings
    });
  }

  // Clone voice (for teachers to create custom voices)
  async cloneVoice(
    name: string,
    audioFiles: File[],
    description?: string
  ): Promise<Voice> {
    if (!this.isConfigured()) {
      throw new Error('Voice cloning requires API key');
    }

    try {
      const formData = new FormData();
      formData.append('name', name);

      if (description) {
        formData.append('description', description);
      }

      audioFiles.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });

      const response = await fetch(`${this.baseUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Voice cloning failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Voice cloning error:', error);
      throw error;
    }
  }

  // Get usage information
  async getUsage(): Promise<{
    character_count: number;
    character_limit: number;
    remaining_characters: number;
  }> {
    if (!this.isConfigured()) {
      return {
        character_count: 0,
        character_limit: 10000,
        remaining_characters: 10000
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage');
      }

      const data = await response.json();
      return {
        character_count: data.subscription.character_count,
        character_limit: data.subscription.character_limit,
        remaining_characters: data.subscription.character_limit - data.subscription.character_count
      };
    } catch (error) {
      console.error('Error fetching usage:', error);
      return {
        character_count: 0,
        character_limit: 0,
        remaining_characters: 0
      };
    }
  }

  // Mock functions for development
  private getMockVoices(): Voice[] {
    return [
      {
        voice_id: 'mock_friendly',
        name: 'Sarah (Friendly)',
        category: 'conversational',
        description: 'Friendly and encouraging female voice',
        settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        voice_id: 'mock_professional',
        name: 'James (Professional)',
        category: 'professional',
        description: 'Professional male voice for formal contexts',
        settings: {
          stability: 0.7,
          similarity_boost: 0.6
        }
      },
      {
        voice_id: 'mock_patient',
        name: 'Emily (Patient)',
        category: 'educational',
        description: 'Patient and clear voice for education',
        settings: {
          stability: 0.8,
          similarity_boost: 0.5
        }
      }
    ];
  }

  private async generateMockAudio(text: string, voiceId?: string): Promise<GeneratedAudio> {
    // Create a mock audio blob
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 440; // A4 note
    gainNode.gain.value = 0.1;

    const duration = Math.min(text.length * 0.05, 5); // Mock duration based on text length

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);

    // Create a silent blob as placeholder
    const silentBuffer = new ArrayBuffer(44100 * 2); // 1 second of silence
    const audioBlob = new Blob([silentBuffer], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);

    return {
      audio_url: audioUrl,
      audio_blob: audioBlob,
      duration_estimate: duration,
      char_count: text.length,
      voice_id: voiceId || 'mock_voice'
    };
  }

  private async simulateStreaming(text: string, options: StreamingOptions): Promise<void> {
    // Simulate streaming by sending chunks
    const chunkSize = options.chunk_size || 1024;
    const totalSize = text.length * 100; // Arbitrary size
    let sentBytes = 0;

    while (sentBytes < totalSize) {
      const chunk = new ArrayBuffer(Math.min(chunkSize, totalSize - sentBytes));

      if (options.onChunk) {
        options.onChunk(chunk);
      }

      sentBytes += chunk.byteLength;

      if (options.onProgress) {
        options.onProgress(sentBytes / totalSize);
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Calculate estimated cost
  estimateCost(characterCount: number): number {
    // Eleven Labs pricing (approximate)
    // Free tier: 10,000 characters/month
    // Starter: $5/month for 30,000 characters
    // Creator: $22/month for 100,000 characters
    const costPerChar = 0.00022; // $22 / 100,000
    return characterCount * costPerChar;
  }
}

export const elevenLabsService = new ElevenLabsService();