import React, { useState, useEffect, useRef } from 'react'
import { CustomDropdown } from './CustomDropdown'
import { Button } from '../ui/button'
import { Context } from '../providers/Provider'
import AudioVisualizer from './AudioVisualizer'
import { Card, CardContent } from '../ui/card'
import { Mic, Speaker, Power, StopCircle } from 'lucide-react'
import { showToast } from '../../lib/utils'

// Remove hardcoded API key - we'll get it from settings
interface STTPanelProps {
  isOpen: boolean
  onClose: () => void
  currentSTTModel: string
}

const STTPanel: React.FC<STTPanelProps> = ({
  isOpen,
  onClose,
  currentSTTModel
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [micTranscript, setMicTranscript] = useState<string>('')
  const [systemTranscript, setSystemTranscript] = useState<string>('')
  const [micEnabled, setMicEnabled] = useState(true)
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [micInputDeviceId, setMicInputDeviceId] = useState<string>('')
  const [systemAudioDeviceId, setSystemAudioDeviceId] = useState<string>('')
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState<boolean | null>(null)
  const [systemAudioLevel, setSystemAudioLevel] = useState<number>(0)
  const [micAudioLevel, setMicAudioLevel] = useState<number>(0)
  const [apiKeys, setApiKeys] = useState<Record<string, string | undefined>>({})
  
  // Add refs for system audio recording and Deepgram
  const systemAudioContextRef = useRef<AudioContext | null>(null)
  const systemAnalyserRef = useRef<AnalyserNode | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const systemAnimationFrameRef = useRef<number | null>(null)
  const systemRecorderRef = useRef<MediaRecorder | null>(null)
  const systemDeepgramSocketRef = useRef<WebSocket | null>(null)
  
  const micAudioContextRef = useRef<AudioContext | null>(null)
  const micAnalyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const micAnimationFrameRef = useRef<number | null>(null)
  const micRecorderRef = useRef<MediaRecorder | null>(null)
  const deepgramSocketRef = useRef<WebSocket | null>(null)
  
  // Add a ref to track the complete transcript
  const completeTranscriptRef = useRef<{
    mic: string;
    system: string;
  }>({
    mic: '',
    system: ''
  });
  
  // New state for AI interview assistant
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isGeneratingResponse, setIsGeneratingResponse] = useState<boolean>(false);
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState<string>('');
  
  // Transcript delay timeout ref
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add state to track question segments
  const [currentQuestionSegment, setCurrentQuestionSegment] = useState<string>('');
  
  // Load devices when panel opens
  useEffect(() => {
    if (isOpen) {
      checkMicrophonePermission();
      loadAudioDevices();
      loadApiKeys();
    }
    
    return () => {
      stopAudioMonitoring('system');
      stopAudioMonitoring('mic');
      closeDeepgramConnection('system');
      closeDeepgramConnection('mic');
      
      // Clean up timeout on component unmount
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
        transcriptTimeoutRef.current = null;
      }
    };
  }, [isOpen]);
  
  // Load API keys from electron
  const loadApiKeys = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getApiKeys) {
        const keys = await window.electronAPI.getApiKeys();
        setApiKeys(keys || {});
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  // Check microphone permission
  const checkMicrophonePermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicrophonePermissionGranted(false);
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      setMicrophonePermissionGranted(true);
      return true;
    } catch (error) {
      setMicrophonePermissionGranted(false);
      return false;
    }
  };
  
  // Load audio devices
  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const allAudioDevices = devices.filter(device => 
        device.kind === 'audioinput' || device.kind === 'audiooutput'
      );
      
      setAudioDevices(allAudioDevices);
      
      // Set default device IDs if available
      if (allAudioDevices.length > 0) {
        const firstInput = allAudioDevices.find(d => d.kind === 'audioinput');
        
        // Try to find BlackHole virtual device for system audio
        const systemAudioDevice = allAudioDevices.find(d => 
          d.kind === 'audioinput' && 
          d.label.includes('BlackHole') && 
          d.label.includes('Virtual')
        );
        
        // If BlackHole virtual device found, use it for system audio
        // Otherwise fall back to any virtual device as a second option
        // Or just use the first audio input as a last resort
        const virtualAudioDevice = allAudioDevices.find(d => 
          d.kind === 'audioinput' && 
          d.label.includes('Virtual')
        );
        
        if (firstInput) setMicInputDeviceId(firstInput.deviceId);
        
        // For system audio, prioritize BlackHole > other virtual > first device
        if (systemAudioDevice) {
          console.log('Found BlackHole virtual device for system audio:', systemAudioDevice.label);
          setSystemAudioDeviceId(systemAudioDevice.deviceId);
        } else if (virtualAudioDevice) {
          console.log('Using virtual device for system audio:', virtualAudioDevice.label);
          setSystemAudioDeviceId(virtualAudioDevice.deviceId);
        } else if (firstInput) {
          setSystemAudioDeviceId(firstInput.deviceId);
        }
      }
    } catch (error) {
      console.log('Error loading audio devices:', error);
    }
  };
  
  // Format devices for dropdowns
  const formatDevicesForDropdown = (devices: MediaDeviceInfo[], type: 'input' | 'output') => {
    const filtered = devices.filter(d => 
      type === 'input' ? d.kind === 'audioinput' : d.kind === 'audiooutput'
    );
    
    return [{
      label: '',
      options: filtered.length > 0 ? 
        filtered.map(device => ({
          value: device.deviceId,
          label: device.label || `Audio Device ${device.deviceId.substring(0, 4)}`,
        })) : 
        [{ value: 'no-device', label: 'No devices found' }]
    }];
  };

  // Toggle audio sources
  const toggleSource = (source: 'mic' | 'system') => {
    if (source === 'mic') {
      const newState = !micEnabled;
      setMicEnabled(newState);
      
      if (newState && isRecording) {
        startAudioMonitoring('mic');
        if (isDeepgramModel()) {
          startDeepgramTranscription('mic');
        }
      } else {
        stopAudioMonitoring('mic');
        closeDeepgramConnection('mic');
      }
            } else if (source === 'system') {
      const newState = !systemAudioEnabled;
      setSystemAudioEnabled(newState);
      
      if (newState && isRecording) {
        startAudioMonitoring('system');
        if (isDeepgramModel()) {
          startDeepgramTranscription('system');
        }
      } else {
        stopAudioMonitoring('system');
        closeDeepgramConnection('system');
      }
    }
  };

  // Check if current model is Deepgram
  const isDeepgramModel = () => {
    return currentSTTModel.toLowerCase().includes('deepgram');
  };

  // Extract Deepgram model name from the full model string
  const getDeepgramModelName = () => {
    // Parse out model name from "deepgram-nova-3" to get "nova-3"
    const modelMatch = currentSTTModel.match(/deepgram-(.*)/i);
    const modelName = modelMatch && modelMatch[1] ? modelMatch[1] : 'nova-3';
    console.log('Using Deepgram model:', modelName);
    return modelName;
  };

  // Get formatted model name
  const getFormattedModelName = () => {
    if (currentSTTModel.toLowerCase().includes('deepgram')) {
      return 'Deepgram';
    }
    return currentSTTModel;
  };

  // Toggle recording
  const toggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    if (newRecordingState) {
      setMicTranscript('');
      setSystemTranscript('');
      
      const isDeepgram = isDeepgramModel();
      
      if (systemAudioEnabled) {
        startAudioMonitoring('system');
        if (isDeepgram && apiKeys.deepgram) {
          startDeepgramTranscription('system');
        }
      }
      
      if (micEnabled && microphonePermissionGranted) {
        startAudioMonitoring('mic');
        if (isDeepgram && apiKeys.deepgram) {
          startDeepgramTranscription('mic');
        }
      }
    } else {
      stopAudioMonitoring('system');
      stopAudioMonitoring('mic');
      closeDeepgramConnection('system');
      closeDeepgramConnection('mic');
    }
  };
  
  // Setup Deepgram connection
  const startDeepgramTranscription = async (source: 'mic' | 'system') => {
    const deviceId = source === 'mic' ? micInputDeviceId : systemAudioDeviceId;
    if (!deviceId || !apiKeys.deepgram) return;
    
    try {
      // Close any existing connection
      closeDeepgramConnection(source);
      
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId }
        }
      });
      
      // Store stream reference
      if (source === 'mic') {
        micStreamRef.current = stream;
      } else {
        systemStreamRef.current = stream;
      }
      
      // Create media recorder
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      if (source === 'mic') {
        micRecorderRef.current = recorder;
      } else {
        systemRecorderRef.current = recorder;
      }
      
      // Get Deepgram model from model selection
      const modelName = getDeepgramModelName();
      
      // Define all options in one place
      const deepgramOptions = {
        // WebSocket-specific configuration
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
        
        // Transcription features
        model: modelName,           // Put model in options for URL generation
        smart_format: true,
        numerals: true,
        interim_results: true,
        language: 'en',
      };
      
      // Generate URL query parameters dynamically from the options
      const queryParams = Object.entries(deepgramOptions)
        .map(([key, value]) => {
          // Skip options that shouldn't be in URL
          if (['encoding', 'sample_rate', 'channels', 'interim_results'].includes(key)) {
            return null;
          }
          // Convert camelCase to snake_case if needed
          const paramKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          return `${paramKey}=${encodeURIComponent(String(value))}`;
        })
        .filter(Boolean) // Remove null entries
        .join('&');
        
      // Connect to Deepgram using API key from settings with dynamic parameters
      const deepgramApiUrl = `wss://api.deepgram.com/v1/listen?${queryParams}`;
      console.log(`Connecting to Deepgram API at: ${deepgramApiUrl}`);
      
      const socket = new WebSocket(deepgramApiUrl, [
        'token',
        apiKeys.deepgram,
      ]);
      
      if (source === 'mic') {
        deepgramSocketRef.current = socket;
      } else {
        systemDeepgramSocketRef.current = socket;
      }
      
      // Handle socket events
      socket.onopen = () => {
        console.log(`Deepgram connection established for ${source}`);
        
        // Configure Deepgram with audio-specific options
        // Only send the options that shouldn't be in the URL
        const socketOptions = {
          encoding: deepgramOptions.encoding,
          sample_rate: deepgramOptions.sample_rate,
          channels: deepgramOptions.channels,
          interim_results: deepgramOptions.interim_results,
        };
        
        // Log raw WebSocket messages for debugging
        const originalSend = socket.send;
        socket.send = function(data) {
          console.log('Sending to Deepgram:', typeof data === 'string' ? data : '[binary data]');
          return originalSend.apply(this, [data]);
        };
        
        console.log(`Configuring Deepgram with options:`, JSON.stringify(socketOptions, null, 2));
        socket.send(JSON.stringify(socketOptions));
      
    // Start recording
        recorder.start(250); // Send chunks every 250ms
      };
      
      // Handle incoming transcriptions
      socket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        
        // Debug log to see what's coming back from Deepgram
        console.debug('Deepgram message:', data);
        
        // More detailed debugging of formatting features
        if (data.type === 'Results' && data.channel?.alternatives?.length > 0) {
          const transcript = data.channel.alternatives[0].transcript;
          console.log('--- DEEPGRAM TRANSCRIPT ANALYSIS ---');
          console.log('Raw transcript:', transcript);
          console.log('Contains punctuation:', /[.!?,;:]/.test(transcript));
          console.log('Contains capitalization:', /[A-Z]/.test(transcript));
          console.log('Contains numerals formatted:', /\d+/.test(transcript));
          console.log('Contains paragraph breaks:', transcript.includes('\n'));
          
          // Log detailed model information
          if (data.metadata?.model_info) {
            console.log('Model Details:');
            console.log('  - Name:', data.metadata.model_info.name);
            console.log('  - Version:', data.metadata.model_info.version);
            console.log('  - Architecture:', data.metadata.model_info.arch);
            console.log('Expected model:', modelName);
          }
          
          console.log('Metadata:', data.metadata);
          console.log('Is final:', data.is_final);
          if (data.channel.alternatives[0].words) {
            // Log a sample of words to see if they have punctuated_word property
            const sampleWords = data.channel.alternatives[0].words.slice(0, 3);
            console.log('Word samples (first 3):', sampleWords);
            console.log('Has punctuated_word property:', sampleWords.some((w: any) => 'punctuated_word' in w));
          }
          console.log('------------------------------------');
        }
        
        // Check for Results type from Deepgram response
        if (data.type === 'Results' && 
            data.channel && 
            data.channel.alternatives && 
            data.channel.alternatives.length > 0) {
          
          const transcript = data.channel.alternatives[0].transcript;
          
          if (transcript) {
            const setTranscriptFn = source === 'mic' ? setMicTranscript : setSystemTranscript;
            const currentCompleteTranscript = completeTranscriptRef.current[source];
            
            // Check for speech_final which indicates a natural pause in speaking
            const isSpeechFinal = data.speech_final === true;
            
            if (!data.is_final) {
              // Handle interim results - show what's being transcribed currently
              setTranscriptFn(currentCompleteTranscript + (currentCompleteTranscript ? ' ' : '') + transcript);
            } else if (data.is_final) {
              // This is a final result - append it to our complete transcript
              if (transcript.trim()) { // Only if there's actual content
                const updatedTranscript = currentCompleteTranscript + 
                  (currentCompleteTranscript ? ' ' : '') + 
                  transcript;
                
                // Update our complete transcript reference
                completeTranscriptRef.current[source] = updatedTranscript;
                
                // Update the displayed transcript
                setTranscriptFn(updatedTranscript);
                
                // Log the complete transcript update
                console.log(`Updated complete transcript for ${source}:`, updatedTranscript);
              }
            }
            
            // Check for speech_final which indicates a natural pause in speaking
            if (isSpeechFinal) {
              console.log(`Speech final detected for ${source} - natural pause in speaking`);
            }
          }
        }
      };
      
      socket.onerror = (error) => {
        console.error(`Deepgram WebSocket error (${source}):`, error);
        
        // Attempt to reconnect after a delay if we encounter an error
        setTimeout(() => {
          if (isRecording) {
            console.log(`Attempting to reconnect Deepgram for ${source}...`);
            startDeepgramTranscription(source);
          }
        }, 2000);
      };
      
      socket.onclose = (event) => {
        console.log(`Deepgram connection closed for ${source}:`, event.code, event.reason);
        
        // Attempt to reconnect if the connection was closed unexpectedly and we're still recording
        if (event.code !== 1000 && isRecording) {
          console.log(`Attempting to reconnect Deepgram for ${source}...`);
          setTimeout(() => {
            startDeepgramTranscription(source);
          }, 2000);
        }
      };
      
      // Send audio data to Deepgram
      recorder.ondataavailable = (event) => {
        if (socket.readyState === WebSocket.OPEN && event.data.size > 0) {
          try {
            socket.send(event.data);
    } catch (error) {
            console.error(`Error sending audio data to Deepgram (${source}):`, error);
          }
        }
      };
      
    } catch (error) {
      console.error(`Error setting up Deepgram transcription for ${source}:`, error);
      // Display error in console
      console.error(`Failed to start Deepgram transcription`, error);
    }
  };
  
  // Close Deepgram connection
  const closeDeepgramConnection = (source: 'mic' | 'system') => {
    if (source === 'mic') {
      if (deepgramSocketRef.current) {
        if (deepgramSocketRef.current.readyState === WebSocket.OPEN) {
          deepgramSocketRef.current.close();
        }
        deepgramSocketRef.current = null;
      }
      
      if (micRecorderRef.current) {
        if (micRecorderRef.current.state !== 'inactive') {
          micRecorderRef.current.stop();
        }
        micRecorderRef.current = null;
      }
    } else {
      if (systemDeepgramSocketRef.current) {
        if (systemDeepgramSocketRef.current.readyState === WebSocket.OPEN) {
          systemDeepgramSocketRef.current.close();
        }
        systemDeepgramSocketRef.current = null;
      }
      
      if (systemRecorderRef.current) {
        if (systemRecorderRef.current.state !== 'inactive') {
          systemRecorderRef.current.stop();
        }
        systemRecorderRef.current = null;
      }
    }
  };
  
  // Start monitoring audio levels
  const startAudioMonitoring = async (source: 'mic' | 'system') => {
    if (source === 'system' && !systemAudioDeviceId) return;
    if (source === 'mic' && !micInputDeviceId) return;
    
    try {
      // Stop any existing monitoring for this source
      stopAudioMonitoring(source);
      
      // Get the appropriate device ID
      const deviceId = source === 'system' ? systemAudioDeviceId : micInputDeviceId;
      
      // Create new audio context
      const audioContext = new AudioContext();
      if (source === 'system') {
        systemAudioContextRef.current = audioContext;
          } else {
        micAudioContextRef.current = audioContext;
      }
      
      // Get the audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId }
        }
      });
      
      // Store the stream reference
      if (source === 'system') {
        systemStreamRef.current = stream;
          } else {
        micStreamRef.current = stream;
      }
      
      // Create analyzer
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      if (source === 'system') {
        systemAnalyserRef.current = analyser;
      } else {
        micAnalyserRef.current = analyser;
      }
      
      // Connect the stream to the analyzer
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(analyser);
      
      // Start the monitoring loop
      updateAudioLevel(source);
      
    } catch (error) {
      console.log(`Error starting ${source} audio monitoring:`, error);
    }
  };
  
  // Stop monitoring audio levels
  const stopAudioMonitoring = (source: 'mic' | 'system') => {
    if (source === 'system') {
      if (systemAnimationFrameRef.current) {
        cancelAnimationFrame(systemAnimationFrameRef.current);
        systemAnimationFrameRef.current = null;
      }
      
      if (systemStreamRef.current) {
        systemStreamRef.current.getTracks().forEach(track => track.stop());
        systemStreamRef.current = null;
      }
      
      if (systemAudioContextRef.current) {
        if (systemAudioContextRef.current.state !== 'closed') {
          systemAudioContextRef.current.close();
        }
        systemAudioContextRef.current = null;
      }
      
      systemAnalyserRef.current = null;
      setSystemAudioLevel(0);
          } else {
      if (micAnimationFrameRef.current) {
        cancelAnimationFrame(micAnimationFrameRef.current);
        micAnimationFrameRef.current = null;
      }
      
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      
      if (micAudioContextRef.current) {
        if (micAudioContextRef.current.state !== 'closed') {
          micAudioContextRef.current.close();
        }
        micAudioContextRef.current = null;
      }
      
      micAnalyserRef.current = null;
      setMicAudioLevel(0);
    }
  };
  
  // Update audio level in animation frame
  const updateAudioLevel = (source: 'mic' | 'system') => {
    const analyser = source === 'system' ? systemAnalyserRef.current : micAnalyserRef.current;
    
    if (!analyser) return;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average level focusing on mid-range frequencies (20%-80% of spectrum)
    const startIndex = Math.floor(dataArray.length * 0.2);
    const endIndex = Math.floor(dataArray.length * 0.8);
    let sum = 0;
    let count = 0;
    
    for (let i = startIndex; i < endIndex; i++) {
      sum += dataArray[i];
      count++;
    }
    
    const average = count > 0 ? sum / count : 0;
    const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
    
    // Apply smoothing (weighted average with previous value)
    const prevLevel = source === 'system' ? systemAudioLevel : micAudioLevel;
    const smoothedLevel = prevLevel * 0.7 + normalizedLevel * 0.3;
    
    // Update the appropriate level
    if (source === 'system') {
      setSystemAudioLevel(smoothedLevel);
      systemAnimationFrameRef.current = requestAnimationFrame(() => updateAudioLevel('system'));
        } else {
      setMicAudioLevel(smoothedLevel);
      micAnimationFrameRef.current = requestAnimationFrame(() => updateAudioLevel('mic'));
    }
  };
  
  // Audio waveform component
  const AudioWaveform = ({ audioLevel }: { audioLevel: number }) => (
    <div className="flex items-center h-4 gap-[1px]">
      {[...Array(16)].map((_, i) => {
        // Create a wave pattern using sine function
        const baseHeight = 6; // Minimum height
        const amplitude = audioLevel * 20; // Increased amplitude for more sensitivity
        const position = i / 15; // Normalized position (0-1)
        
        // Create wave effect with multiple sine waves
        const wave1 = Math.sin(position * Math.PI * 2) * amplitude;
        const wave2 = Math.sin(position * Math.PI * 4) * (amplitude * 0.5);
        const height = baseHeight + Math.abs(wave1 + wave2);
        
        return (
          <div 
            key={i}
            className="w-[2px] rounded-full"
            style={{ 
              height: `${height}px`,
              opacity: Math.min(0.3 + audioLevel * 0.7, 1), // More visible at lower levels
              backgroundColor: '#ffffff', // Always white
              transition: 'height 50ms, opacity 50ms' // Short transition for smoothness
            }}
          />
        );
      })}
    </div>
  );

  // Function to extract the most recent question from the transcript
  const extractLatestQuestion = (transcript: string): string => {
    if (!transcript || transcript.trim().length === 0) return '';
    
    // Split by common question delimiters (period, question mark, exclamation)
    const segments = transcript.split(/(?<=[.?!])\s+/);
    
    // Get the last segment that might be a question
    let lastSegment = segments[segments.length - 1].trim();
    
    // If the last segment is very short, also include the previous segment for context
    if (lastSegment.length < 15 && segments.length > 1) {
      lastSegment = segments[segments.length - 2].trim() + ' ' + lastSegment;
    }
    
    // Check if looks like a question or a request
    const isQuestion = lastSegment.endsWith('?') || 
                       /^(can you|could you|please|tell me|what|why|how|when|where|who|describe)/i.test(lastSegment);
    
    // If it looks like a question, return it. Otherwise, return the last 1-2 sentences
    if (isQuestion) {
      return lastSegment;
        } else {
      // Get the last 1-2 sentences as context
      const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [];
      if (sentences.length === 0) return transcript;
      
      if (sentences.length === 1 || sentences[sentences.length - 1].length > 50) {
        return sentences[sentences.length - 1].trim();
      } else {
        return (sentences[sentences.length - 2] + ' ' + sentences[sentences.length - 1]).trim();
      }
    }
  };
  
  // Function to generate AI response based on interviewer's question
  const generateAIResponse = async () => {
    if (!systemTranscript || systemTranscript === lastProcessedTranscript || systemTranscript.trim().length < 10) {
      return;
    }
    
    try {
      setIsGeneratingResponse(true);
      
      // Extract the latest question from the transcript
      const latestQuestion = extractLatestQuestion(systemTranscript);
      
      if (latestQuestion.trim().length < 10) {
        console.log("Latest question segment is too short, waiting for more content");
        setIsGeneratingResponse(false);
        return;
      }
      
      // Call the Teleprompter API to generate a response with just the latest question
      console.log("Calling teleprompter API with latest question:", latestQuestion.substring(0, 50) + "...");
      const result = await window.electronAPI.generateTeleprompterResponse(latestQuestion);
      
      if (result.success && result.data) {
        setAiResponse(result.data);
        setLastProcessedTranscript(systemTranscript);
      } else if (result.error) {
        console.error('Error generating AI response:', result.error);
        // Show simple error in the response area instead of leaving it blank
        setAiResponse(`I couldn't generate a response at this time. The system reported: ${result.error}`);
      }
      
      setIsGeneratingResponse(false);
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Show simple error in the response area
      setAiResponse("I couldn't generate a response due to a technical issue. Please try again later.");
      setIsGeneratingResponse(false);
    }
  };
  
  // Update the useEffect that triggers AI response generation
  // Add effect to generate AI response when system transcript changes significantly
  useEffect(() => {
    // Clear any existing timeout when transcript changes
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
      transcriptTimeoutRef.current = null;
    }
    
    if (!systemTranscript || systemTranscript === lastProcessedTranscript || systemTranscript.trim().length < 10) {
      return;
    }
    
    // Extract the latest question segment
    const latestQuestion = extractLatestQuestion(systemTranscript);
    
    // Check if transcript appears to be a question or complete statement
    const isQuestionOrStatement = /\?|\.|\!$/.test(latestQuestion.trim()) || 
      latestQuestion.toLowerCase().includes('tell me about') ||
      latestQuestion.toLowerCase().includes('what is') ||
      latestQuestion.toLowerCase().includes('how would you');
    
    // Set a delay of 2.5 seconds after last word to generate response
    transcriptTimeoutRef.current = setTimeout(() => {
      if (isQuestionOrStatement) {
        generateAIResponse();
      }
    }, 2500); // 2.5 seconds delay
    
    // Clean up timeout on component unmount
    return () => {
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
        transcriptTimeoutRef.current = null;
      }
    };
  }, [systemTranscript]);

  if (!isOpen) return null;

  const inputDevices = audioDevices.filter(d => d.kind === 'audioinput');
  const outputDevices = audioDevices.filter(d => d.kind === 'audiooutput');
  const modelName = getFormattedModelName();
  const isModelSupported = isDeepgramModel() && apiKeys.deepgram;

  return (
    <div 
      className="absolute top-full left-0 mt-2 w-80 transform -translate-x-[calc(50%-12px)]"
      style={{ zIndex: 100 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="absolute -top-2 left-0 w-full h-2" />
      <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 cursor-default select-none">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-white/90 select-none cursor-default">
              Teleprompter
            </h3>
          </div>
          
          <div className="space-y-3">
            {/* Microphone Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-white/70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <span className="text-[11px] leading-none select-none cursor-default">Microphone</span>
                {microphonePermissionGranted === false && (
                  <span className="text-xs text-red-400 ml-1 select-none cursor-default">(No permission)</span>
                )}
              </div>
              <button 
                onClick={() => toggleSource('mic')}
                disabled={isRecording || microphonePermissionGranted === false}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-default rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  micEnabled ? 'bg-green-500/50' : 'bg-gray-500/30'
                } ${isRecording || microphonePermissionGranted === false ? 'opacity-50' : ''}`}
              >
                <span 
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    micEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>
            
            {/* Microphone device selector */}
            {micEnabled && (
              <div className="mt-1">
                <CustomDropdown
                  value={micInputDeviceId}
                  onChange={setMicInputDeviceId}
                  options={formatDevicesForDropdown(audioDevices, 'input')}
                  placeholder="Select microphone"
                  className="w-full cursor-default"
                />
              </div>
            )}
            
            {/* System Audio Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-white/70"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
                <span className="text-[11px] leading-none select-none cursor-default">System Audio</span>
                {outputDevices.length === 0 && (
                  <span className="text-xs text-yellow-400 ml-1 select-none cursor-default">(No devices found)</span>
                )}
              </div>
              <button 
                onClick={() => toggleSource('system')}
                disabled={isRecording || outputDevices.length === 0}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-default rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  systemAudioEnabled ? 'bg-green-500/50' : 'bg-gray-500/30'
                } ${isRecording || outputDevices.length === 0 ? 'opacity-50' : ''}`}
              >
                <span 
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    systemAudioEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>
            
            {/* System audio device selector */}
            {systemAudioEnabled && outputDevices.length > 0 && (
              <div className="mt-1">
                <CustomDropdown
                  value={systemAudioDeviceId}
                  onChange={setSystemAudioDeviceId}
                  options={formatDevicesForDropdown(audioDevices, 'output')}
                  placeholder="Select system audio"
                  className="w-full cursor-default"
                />
              </div>
            )}
          </div>
          
          {/* Transcription Area */}
          <div className="space-y-2">
            {/* Microphone Transcription */}
            {micEnabled && (
              <div className="space-y-1">
            <div className="flex justify-between items-center">
                  <p className="text-xs text-white/70 select-none cursor-default">Microphone Transcription:</p>
                  
                  {/* Microphone Audio Level Indicator */}
                  {isRecording && <AudioWaveform audioLevel={micAudioLevel} />}
            </div>
                <div className="relative">
                  <p className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere border border-gray-700 rounded-lg p-2 bg-black/50 text-white/90 select-none cursor-default">
                    {micTranscript}
                  </p>
                </div>
            </div>
            )}
            
            {/* System Audio Transcription */}
            {systemAudioEnabled && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/70 select-none cursor-default">System Audio Transcription:</p>
                  
                  {/* System Audio Level Indicator */}
                  {isRecording && <AudioWaveform audioLevel={systemAudioLevel} />}
                </div>
                <div className="relative">
                  <p className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere border border-gray-700 rounded-lg p-2 bg-black/50 text-white/90 select-none cursor-default">
                    {systemTranscript}
                  </p>
                </div>
              </div>
            )}
            
            {/* AI Interview Assistant */}
            {systemAudioEnabled && (
              <div className="space-y-1 mt-4 border-t border-gray-700 pt-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/70 select-none cursor-default">AI Suggested Response:</p>
          </div>
          
                <div className="relative">
                  <div className="w-full h-[120px] overflow-y-auto overflow-wrap-anywhere border border-indigo-700/40 rounded-lg p-2 bg-indigo-950/30 text-white/90 select-none cursor-default">
                    {isGeneratingResponse ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex space-x-1 items-center">
                          <div className="w-1.5 h-1.5 bg-indigo-500/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-indigo-500/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-indigo-500/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          <span className="ml-2 text-sm text-indigo-300/90 select-none cursor-default">Generating response...</span>
                  </div>
                    </div>
                    ) : aiResponse ? (
                      aiResponse
                    ) : (
                      <span className="text-white/50 italic select-none cursor-default">
                        The AI assistant will suggest responses to interview questions detected from the system audio.
                      </span>
                  )}
                </div>
                </div>
            </div>
          )}
                </div>
          
          {/* Controls */}
          <div className="flex justify-center">
                <button
                onClick={toggleRecording}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors cursor-default select-none ${
                isRecording
                  ? 'bg-red-500/50 hover:bg-red-500/70'
                  : 'bg-green-500/50 hover:bg-green-500/70'
              }`}
              disabled={(!micEnabled && !systemAudioEnabled) || 
                         (micEnabled && microphonePermissionGranted === false) ||
                         (systemAudioEnabled && outputDevices.length === 0)}
              >
                {isRecording ? (
                  <>
                  <span className="block w-3 h-3 bg-red-500 rounded-sm"></span>
                  <span className="select-none cursor-default">Stop Recording</span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                    </svg>
                  <span className="select-none cursor-default">Start Recording</span>
                  </>
                )}
              </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default STTPanel 