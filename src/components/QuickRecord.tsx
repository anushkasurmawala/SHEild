import { useState, useRef } from 'react';
import { Video, Mic, StopCircle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function QuickRecord() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'video' | 'audio' | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  
  const startRecording = async (type: 'video' | 'audio') => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (type === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { 
          type: type === 'video' ? 'video/webm' : 'audio/webm' 
        });
        setRecordedBlob(blob);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingType(type);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const saveRecording = async () => {
    if (!recordedBlob) return;
    
    setIsSaving(true);
    try {
      if (!user) return;
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(recordedBlob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Content = base64data.split(',')[1];

        // Save recording to database
        const { error: dbError } = await supabase
          .from('recordings')
          .insert({
            user_id: user.id,
            type: recordingType,
            data: base64Content,
            name: `recording_${new Date().toISOString()}`,
            mime_type: recordedBlob.type
          });

        if (dbError) throw dbError;

        setRecordedBlob(null);
        setRecordingType(null);
      };
    } catch (error) {
      console.error('Error saving recording:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-xl font-semibold">Quick Record</h3>
      <p className="text-gray-400">Quickly record video or audio in emergency situations</p>
      
      {isRecording ? (
        <div className="space-y-4">
          {recordingType === 'video' && (
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video 
                ref={videoRef} 
                className="w-full h-48 object-cover" 
                muted 
              />
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                <span className="mr-1 h-2 w-2 rounded-full bg-white animate-pulse"></span>
                REC {formatTime(recordingTime)}
              </div>
            </div>
          )}
          
          {recordingType === 'audio' && (
            <div className="flex items-center justify-center h-24 glass-card">
              <div className="flex flex-col items-center">
                <Mic className="h-8 w-8 text-red-500 animate-pulse" />
                <p className="mt-2 font-medium">Recording Audio: {formatTime(recordingTime)}</p>
              </div>
            </div>
          )}
          
          <button 
            className="neon-button w-full flex items-center justify-center gap-2 !bg-red-500/20"
            onClick={stopRecording}
          >
            <StopCircle className="h-5 w-5" />
            Stop Recording
          </button>
        </div>
      ) : recordedBlob ? (
        <div className="space-y-4">
          {recordingType === 'video' && (
            <video 
              src={URL.createObjectURL(recordedBlob)} 
              className="w-full rounded-lg" 
              controls 
            />
          )}
          
          {recordingType === 'audio' && (
            <audio 
              src={URL.createObjectURL(recordedBlob)} 
              className="w-full" 
              controls 
            />
          )}
          
          <div className="flex space-x-2">
            <button 
              className="neon-button flex-1"
              onClick={() => {
                setRecordedBlob(null);
                setRecordingType(null);
              }}
            >
              Discard
            </button>
            <button 
              className="neon-button flex-1 flex items-center justify-center gap-2"
              onClick={saveRecording}
              disabled={isSaving}
            >
              <Send className="h-5 w-5" />
              {isSaving ? 'Saving...' : 'Save Recording'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <button 
            className="neon-button h-24 flex flex-col items-center justify-center"
            onClick={() => startRecording('video')}
          >
            <Video className="h-8 w-8 mb-2" />
            Record Video
          </button>
          <button 
            className="neon-button h-24 flex flex-col items-center justify-center"
            onClick={() => startRecording('audio')}
          >
            <Mic className="h-8 w-8 mb-2" />
            Record Audio
          </button>
        </div>
      )}
    </div>
  );
}