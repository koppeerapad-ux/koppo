export class AudioRecorder {
  constructor(options = {}) {
    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.maxDuration = options.maxDuration || 20000; // 20 seconds default
    this.recordingStartTime = null;
    this.timerInterval = null;
    this.onTimeUpdate = options.onTimeUpdate || (() => {});
  }

  async startRecording() {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.audioStream);
      this.audioChunks = [];
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();

      // Timer
      this.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        this.onTimeUpdate(elapsed);

        if (elapsed >= this.maxDuration / 1000) {
          this.stopRecording();
        }
      }, 100);

      console.log('🎤 Recording started');
      return true;
    } catch (error) {
      console.error('❌ Microphone access denied:', error);
      return false;
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        resolve(null);
        return;
      }

      clearInterval(this.timerInterval);
      this.isRecording = false;

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Stop all tracks
        this.audioStream.getTracks().forEach((track) => track.stop());

        console.log('⏹️ Recording stopped');
        resolve({ blob: audioBlob, url: audioUrl });
      };

      this.mediaRecorder.stop();
    });
  }

  getAudioBlob() {
    return new Blob(this.audioChunks, { type: 'audio/webm' });
  }

  async getBlobAsBase64() {
    const blob = this.getAudioBlob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result); // data:audio/webm;base64,...
      };
      reader.readAsDataURL(blob);
    });
  }
}

export const playAudio = (audioData) => {
  const audio = new Audio(audioData);
  audio.play();
  return audio;
};

export const stopAudio = (audio) => {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
};
