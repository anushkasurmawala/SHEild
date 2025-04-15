import { useState, useRef, useEffect } from 'react';
import { Phone, X } from 'lucide-react';

export function FakeCall() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [timer, setTimer] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Use local ringtone file
    audioRef.current = new Audio('/sound.mp3');
    audioRef.current.loop = true;
    
    // Preload the audio
    if (audioRef.current) {
      audioRef.current.load();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const startFakeCall = () => {
    setIsCallActive(true);
    
    // Start audio with better error handling
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
        console.error('Error playing audio:', error);
          // Fallback to default ringtone if custom one fails
          audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
          audioRef.current.loop = true;
          audioRef.current.play().catch(err => {
            console.error('Error playing fallback audio:', err);
          });
        });
      }
    }

    // Start timer
    timerRef.current = window.setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    // Auto end call after 30 seconds
    setTimeout(() => {
      endCall();
    }, 30000);
  };

  const endCall = () => {
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsCallActive(false);
    setTimer(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-xl font-semibold">Fake Call</h3>
      {isCallActive ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
              <Phone className="w-12 h-12 text-purple-400 animate-pulse" />
            </div>
            <h4 className="text-xl font-semibold">Incoming Call</h4>
            <p className="text-gray-400">{formatTime(timer)}</p>
          </div>
          <button
            onClick={endCall}
            className="neon-button w-full flex items-center justify-center gap-2 !bg-red-500/20"
          >
            <X className="w-5 h-5" />
            End Call
          </button>
        </div>
      ) : (
        <button
          onClick={startFakeCall}
          className="neon-button w-full flex items-center justify-center gap-2"
        >
          <Phone className="w-5 h-5" />
          Simulate Call
        </button>
      )}
    </div>
  );
}