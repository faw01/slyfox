import React, { useState, useEffect, useRef } from 'react'
import CustomDesktopPickerDropdown from './CustomDesktopPickerDropdown'
import { CustomDropdown } from './CustomDropdown'

// WebGPU type augmentation
declare global {
  interface Navigator {
    gpu?: {
      requestAdapter: () => Promise<any>;
    };
  }
}

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
  const [transcript, setTranscript] = useState<string>('')
  const [transcriptChunks, setTranscriptChunks] = useState<string[]>([])
  
  // Separate transcripts for microphone and system audio
  const [micTranscript, setMicTranscript] = useState<string>('')
  const [systemTranscript, setSystemTranscript] = useState<string>('')
  const [micTranscriptChunks, setMicTranscriptChunks] = useState<string[]>([])
  const [systemTranscriptChunks, setSystemTranscriptChunks] = useState<string[]>([])
  
  const [micEnabled, setMicEnabled] = useState(true)
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false)
  const [appAudioEnabled, setAppAudioEnabled] = useState(false)
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState<boolean | null>(null) // Start with null (unknown)
  const [selectedSystemAudioSource, setSelectedSystemAudioSource] = useState<string | null>(null)
  const [isElectronAvailable, setIsElectronAvailable] = useState(true) // Default to true for UI
  const [systemAudioBlackHoleAvailable, setSystemAudioBlackHoleAvailable] = useState(false)
  const [openAIApiKey, setOpenAIApiKey] = useState<string | null>(null)
  const [apiKeyLoading, setApiKeyLoading] = useState(true)
  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'processing' | 'error'>('idle')
  const [transcriptError, setTranscriptError] = useState<string | null>(null)
  
  // WebGPU experimental options
  const [webGpuEnabled, setWebGpuEnabled] = useState(false)
  const [webGpuAvailable, setWebGpuAvailable] = useState(false)
  const [webGpuLoaded, setWebGpuLoaded] = useState(false)
  const [webGpuLoading, setWebGpuLoading] = useState(false)
  const [webGpuLoadingProgress, setWebGpuLoadingProgress] = useState<any[]>([])
  const [webGpuTps, setWebGpuTps] = useState<number | null>(null)
  const [webGpuCacheInfo, setWebGpuCacheInfo] = useState<any>(null)
  const [webGpuModel, setWebGpuModel] = useState<'base' | 'large'>('base')
  
  // Refs for audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const webGpuWorkerRef = useRef<Worker | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // In the component, add this state for screen selection
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null)
  const [selectedScreenName, setSelectedScreenName] = useState<string>('')

  // Add a state for showing BlackHole setup instructions
  const [showBlackHoleSetupHelp, setShowBlackHoleSetupHelp] = useState(false)

  // Add these state variables at the top with other state declarations
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioInputId, setSelectedAudioInputId] = useState<string>('')

  // Add separate state variables for mic and system audio
  const [micInputDeviceId, setMicInputDeviceId] = useState<string>('')
  const [systemAudioDeviceId, setSystemAudioDeviceId] = useState<string>('')

  // Request microphone permissions and load API key on mount
  useEffect(() => {
    if (isOpen) {
      checkMicrophonePermission()
      loadApiKey()
      checkBlackHoleAvailability()
      loadAudioDevices()
    }
    
    // Cleanup on unmount/close
    return () => {
      cleanupRecording()
    }
  }, [isOpen])

  // Combine transcript chunks into a single string whenever chunks change
  useEffect(() => {
    setTranscript(transcriptChunks.join(' '))
  }, [transcriptChunks])
  
  // Update separate transcripts for mic and system audio
  useEffect(() => {
    setMicTranscript(micTranscriptChunks.join(' '))
  }, [micTranscriptChunks])
  
  useEffect(() => {
    setSystemTranscript(systemTranscriptChunks.join(' '))
  }, [systemTranscriptChunks])

  // Load the OpenAI API key
  const loadApiKey = async () => {
    setApiKeyLoading(true)
    try {
      // Check if window.electronAPI is available
      if (window.electronAPI && window.electronAPI.getApiKeys) {
        const apiKeys = await window.electronAPI.getApiKeys()
        const key = apiKeys?.openai || ''
        setOpenAIApiKey(key)
        console.log(`OpenAI API key ${key ? 'loaded' : 'not found'}`)
          } else {
        console.error('electronAPI.getApiKeys is not available')
        setOpenAIApiKey(null)
      }
    } catch (error) {
      console.error('Failed to load API key:', error)
      setOpenAIApiKey(null)
    } finally {
      setApiKeyLoading(false)
    }
  }

  // Function to check and request microphone permission
  const checkMicrophonePermission = async () => {
    try {
      // Check if navigator.mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('MediaDevices API is not supported in this browser/environment')
        setMicrophonePermissionGranted(false)
        return false
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      // Permission granted, stop all tracks to release the microphone
      stream.getTracks().forEach(track => track.stop())
      
      setMicrophonePermissionGranted(true)
      console.log('Microphone permission granted')
      return true
    } catch (error) {
      console.error('Microphone permission denied:', error)
      setMicrophonePermissionGranted(false)
      return false
    }
  }

  // Function to explicitly request microphone permissions
  const requestMicrophonePermission = async () => {
    const granted = await checkMicrophonePermission()
  }

  // Check for WebGPU availability
  useEffect(() => {
    if (navigator.gpu) {
      setWebGpuAvailable(true);
      console.log('WebGPU is available in this browser');
    } else {
      setWebGpuAvailable(false);
      console.log('WebGPU is not available in this browser');
    }
  }, []);

  // Initialize WebGPU worker
  useEffect(() => {
    if (webGpuEnabled && webGpuAvailable && !webGpuWorkerRef.current) {
      try {
        // Create worker
        const worker = new Worker(new URL('../../workers/webgpuWhisperWorker.ts', import.meta.url), { type: 'module' });
        webGpuWorkerRef.current = worker;
        
        // Setup message handler
        worker.addEventListener('message', handleWebGpuWorkerMessage);
        
        // Initialize loading
        setWebGpuLoading(true);
        worker.postMessage({ 
          type: 'load',
          model: webGpuModel === 'base' ? 'onnx-community/whisper-base' : 'onnx-community/whisper-large-v3-turbo'
        });
        
        console.log('Initializing WebGPU Whisper model');
    } catch (error) {
        console.error('Failed to initialize WebGPU worker:', error);
        setWebGpuEnabled(false);
      }
      
      // Cleanup function
      return () => {
        if (webGpuWorkerRef.current) {
          webGpuWorkerRef.current.removeEventListener('message', handleWebGpuWorkerMessage);
          webGpuWorkerRef.current.terminate();
          webGpuWorkerRef.current = null;
        }
      };
    }
  }, [webGpuEnabled, webGpuAvailable, webGpuModel]);
  
  // Handle messages from the WebGPU worker
  const handleWebGpuWorkerMessage = (e: MessageEvent) => {
    const { status, data, output, tps, source = 'mic' } = e.data;
    
    switch (status) {
      case 'loading':
        setWebGpuLoading(true);
        break;
        
      case 'initiate':
        setWebGpuLoadingProgress(prev => [...prev, e.data]);
        break;
        
      case 'progress':
        setWebGpuLoadingProgress(prev => 
          prev.map(item => {
            if (item.file === e.data.file) {
              return { ...item, ...e.data };
            }
            return item;
          })
        );
        break;
        
      case 'done':
        setWebGpuLoadingProgress(prev => 
          prev.filter(item => item.file !== e.data.file)
        );
        // If this was the last file, mark loading as complete
        if (e.data.file.includes('decoder_model_merged')) {
          setWebGpuLoaded(true);
          setWebGpuLoading(false);
          console.log('WebGPU Whisper model loaded successfully');
        }
        break;
        
      case 'ready':
        setWebGpuLoaded(true);
        setWebGpuLoading(false);
        setWebGpuLoadingProgress([]);
        console.log('WebGPU Whisper model loaded successfully');
        break;
        
      case 'start':
        setIsProcessing(true);
        break;
        
      case 'update':
        if (tps) {
          setWebGpuTps(tps);
        }
        break;
        
      case 'complete':
        setIsProcessing(false);
        if (output && Array.isArray(output) && output.length > 0) {
          const newTranscription = output[0].trim();
          
          if (newTranscription) {
            // Update the appropriate transcript based on source
            if (source === 'mic') {
              setMicTranscriptChunks(prev => {
              if (prev.length > 0) {
                const lastChunk = prev[prev.length - 1];
                const needsSpace = !lastChunk.match(/[.,!?]$/);
                return [...prev, needsSpace ? ` ${newTranscription}` : newTranscription];
              }
              return [...prev, newTranscription];
            });
            } else if (source === 'system') {
              setSystemTranscriptChunks(prev => {
                if (prev.length > 0) {
                  const lastChunk = prev[prev.length - 1];
                  const needsSpace = !lastChunk.match(/[.,!?]$/);
                  return [...prev, needsSpace ? ` ${newTranscription}` : newTranscription];
                }
                return [...prev, newTranscription];
              });
            }
          }
        }
        break;
        
      case 'error':
        setWebGpuLoading(false);
        setWebGpuLoaded(false);
        console.error('WebGPU Error:', data?.message || 'An error occurred while processing audio');
        break;
    }
  };
  
  // Function to process audio with WebGPU
  const processAudioWithWebGpu = async (audioBlob: Blob, source: 'mic' | 'system' = 'mic') => {
    if (!webGpuWorkerRef.current || !webGpuLoaded) return;
    
    try {
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      }
      
      // Decode audio
      const audioData = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const audioArray = audioData.getChannelData(0);
      
      // Send data to worker
      webGpuWorkerRef.current.postMessage({
        type: 'generate',
        data: {
          audio: audioArray,
          language: 'en',
          source: source // Pass the source to identify in the response
        }
      });
      
    } catch (error) {
      console.error('Error processing audio with WebGPU:', error);
      if (transcriptionStatus !== 'error') {
        setTranscriptionStatus('error');
        setTranscriptError(`WebGPU Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // Transcribe audio chunk using OpenAI Whisper API or local Whisper CLI
  const transcribeChunk = async (audioBlob: Blob, source: 'mic' | 'system' = 'mic'): Promise<string> => {
    // Use WebGPU processing if enabled
    if (webGpuEnabled && webGpuLoaded) {
      await processAudioWithWebGpu(audioBlob, source);
      return '';
    }
    
    // Check if we're using a local model or API
    const isLocalModel = currentSTTModel.startsWith('local:');
    
    if (isLocalModel) {
      return await transcribeWithLocalWhisper(audioBlob, source);
    }
    
    // Existing API implementation
    if (!openAIApiKey) {
      console.error('OpenAI API key is not available')
      return '';
      }
      
      setIsProcessing(true)
      
    const formData = new FormData()
    formData.append('file', audioBlob, `chunk${Date.now()}.wav`)
    formData.append('model', 'whisper-1')
    
    // Add optimizations for English transcription
    formData.append('language', 'en')
    formData.append('response_format', 'verbose_json')
    
    // Add prompt to improve formatting and reduce hallucinations
    const prompt = "The following is a clear, properly punctuated English transcription with minimal filler words and no hallucinations:"
    formData.append('prompt', prompt)
    
    // Add temperature to reduce hallucinations
    formData.append('temperature', '0.0')
    
    try {
      const response = await fetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAIApiKey}`,
          },
          body: formData,
        }
      )
      
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`API Error: ${response.status} - ${errorData}`)
      }
      
      const data = await response.json()
      
      // Handle verbose_json response format
      if (data.text && data.text.trim()) {
        console.log('Transcription received:', data.text)
        
        // Clean up the text by removing excessive spaces and normalizing punctuation
        const cleanedText = data.text
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\s+([.,!?])/g, '$1')
        
        // Update the appropriate transcript chunks based on source
        if (source === 'mic') {
          setMicTranscriptChunks(prev => {
            // If there are previous chunks, ensure proper spacing
            if (prev.length > 0) {
              const lastChunk = prev[prev.length - 1]
              // Add space only if the last chunk doesn't end with punctuation
              const needsSpace = !lastChunk.match(/[.,!?]$/)
              return [...prev, needsSpace ? ` ${cleanedText}` : cleanedText]
            }
            return [...prev, cleanedText]
          })
        } else if (source === 'system') {
          setSystemTranscriptChunks(prev => {
            // If there are previous chunks, ensure proper spacing
            if (prev.length > 0) {
              const lastChunk = prev[prev.length - 1]
              // Add space only if the last chunk doesn't end with punctuation
              const needsSpace = !lastChunk.match(/[.,!?]$/)
              return [...prev, needsSpace ? ` ${cleanedText}` : cleanedText]
            }
            return [...prev, cleanedText]
          })
        }
        
        // Also update the combined transcript for backward compatibility
        setTranscriptChunks(prev => {
          // If there are previous chunks, ensure proper spacing
          if (prev.length > 0) {
            const lastChunk = prev[prev.length - 1]
            // Add space only if the last chunk doesn't end with punctuation
            const needsSpace = !lastChunk.match(/[.,!?]$/)
            return [...prev, needsSpace ? ` ${cleanedText}` : cleanedText]
          }
          return [...prev, cleanedText]
        })
        
        return cleanedText;
      }
      
      return '';
    } catch (error) {
      console.error('Error during transcription:', error)
      return '';
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Toggle recording with permission check
  const toggleRecording = async () => {
    // If we're stopping the recording, just stop
    if (isRecording) {
      stopRecording()
      return
    }
    
    // Check permission before starting
    if (microphonePermissionGranted !== true) {
      const permissionGranted = await checkMicrophonePermission()
      if (!permissionGranted) {
            return
      }
    }
    
    // Check if we're using a local model
    const isLocalModel = currentSTTModel.startsWith('local:')
    
    // Check if API key is available (only for API models)
    if (!isLocalModel && !openAIApiKey) {
      return
    }
      
    // Start recording
    startRecording()
  }

  // Start recording with both microphone and system audio if enabled
  const startRecording = async () => {
    // Check if WebGPU is enabled but not loaded
    if (webGpuEnabled && !webGpuLoaded) {
      console.error('WebGPU Not Ready: Please wait for the WebGPU model to load');
      return;
    }
    
    // Check if we're using a local model
    const isLocalModel = currentSTTModel.startsWith('local:')
      
    // Verify we have the API key (only for API models)
    if (!webGpuEnabled && !isLocalModel && !openAIApiKey) {
      console.error('API Key Missing: Please add your OpenAI API key in settings');
      return;
    }
      
    // Reset transcripts for new recording
    setTranscriptChunks([])
    setTranscript('')
    setMicTranscriptChunks([])
    setSystemTranscriptChunks([])
    setMicTranscript('')
    setSystemTranscript('')
    setTranscriptionStatus('idle')
    setTranscriptError(null)
    setIsRecording(true)
    
    try {
      let micStream: MediaStream | null = null;
      let systemStream: MediaStream | null = null;
      let micRecorder: MediaRecorder | null = null;
      let systemRecorder: MediaRecorder | null = null;
      
      // Try to get microphone if enabled
      if (micEnabled && micInputDeviceId) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: micInputDeviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
          
          if (micStream.getAudioTracks().length > 0) {
            console.log('Successfully accessed microphone for recording');
            
            // Create microphone recorder
            micRecorder = new MediaRecorder(micStream);
            micRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                if (webGpuEnabled && webGpuLoaded) {
                  processAudioWithWebGpu(event.data, 'mic');
                } else if (isLocalModel) {
                  transcribeWithLocalWhisper(event.data, 'mic').then(result => {
                    if (result) {
                      setMicTranscriptChunks(prev => {
                        if (prev.length > 0) {
                          return [...prev, ` ${result}`];
                        }
                        return [...prev, result];
                      });
                    }
                  });
                } else {
                  transcribeChunk(event.data, 'mic').then(result => {
                    if (result) {
                      setMicTranscriptChunks(prev => {
                        if (prev.length > 0) {
                          const lastChunk = prev[prev.length - 1];
                          const needsSpace = !lastChunk.match(/[.,!?]$/);
                          return [...prev, needsSpace ? ` ${result}` : result];
                        }
                        return [...prev, result];
                      });
                    }
                  });
                }
              }
            };
            
            // Start microphone recording
            micRecorder.start();
          }
        } catch (micError) {
          console.error('Microphone access error:', micError);
        }
      }
      
      // Try to get system audio if enabled
      if (systemAudioEnabled && systemAudioDeviceId) {
        try {
          systemStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: systemAudioDeviceId }
            }
          });
          
          if (systemStream.getAudioTracks().length > 0) {
            console.log('Successfully accessed system audio for recording');
            
            // Create system audio recorder
            systemRecorder = new MediaRecorder(systemStream);
            systemRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                if (webGpuEnabled && webGpuLoaded) {
                  processAudioWithWebGpu(event.data, 'system');
                } else if (isLocalModel) {
                  transcribeWithLocalWhisper(event.data, 'system').then(result => {
                    if (result) {
                      setSystemTranscriptChunks(prev => {
                        if (prev.length > 0) {
                          return [...prev, ` ${result}`];
                        }
                        return [...prev, result];
                      });
                    }
                  });
                } else {
                  transcribeChunk(event.data, 'system').then(result => {
                    if (result) {
                      setSystemTranscriptChunks(prev => {
                        if (prev.length > 0) {
                          const lastChunk = prev[prev.length - 1];
                          const needsSpace = !lastChunk.match(/[.,!?]$/);
                          return [...prev, needsSpace ? ` ${result}` : result];
                        }
                        return [...prev, result];
                      });
                    }
                  });
                }
              }
            };
            
            // Start system audio recording
            systemRecorder.start();
          }
        } catch (systemError) {
          console.error('System audio access error:', systemError);
        }
      }
      
      // If no streams were obtained, throw an error
      if (!micStream && !systemStream) {
        throw new Error('No audio sources could be accessed. Check your device permissions.');
      }
      
      // Store references for cleanup
      streamRef.current = micStream || systemStream;
      mediaRecorderRef.current = micRecorder || systemRecorder;
      
      // Set up interval to create chunks every 3 seconds
      intervalRef.current = setInterval(() => {
        if (micRecorder && micRecorder.state === 'recording') {
          micRecorder.stop();
          micRecorder.start();
        }
        if (systemRecorder && systemRecorder.state === 'recording') {
          systemRecorder.stop();
          systemRecorder.start();
        }
      }, 3000);
      
      // Determine source type for logging
      let sourceType = 'None';
      if (micStream && systemStream) {
        sourceType = 'Microphone + System Audio';
      } else if (micStream) {
        sourceType = 'Microphone';
      } else if (systemStream) {
        sourceType = 'System Audio';
      }
      
      console.log(`Started recording from ${sourceType}`);
    } catch (error) {
      console.error('Recording error:', error);
      
      // Specific handling for OverconstrainedError
      if (error instanceof OverconstrainedError || (error as any).name === 'OverconstrainedError') {
        console.error('Device Error: The selected audio device has constraints that cannot be satisfied');
      }
      
      setIsRecording(false);
    }
  }

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false)
    cleanupRecording()
    console.log('Stopped recording')
  }

  // Cleanup recording resources
  const cleanupRecording = () => {
    // Stop all MediaRecorders
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Clear interval for API chunking
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Clear timeout for local model auto-stop
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Stop and release all media streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Also check for any other active streams in the DOM and stop them
    document.querySelectorAll('audio, video').forEach(element => {
      const mediaElement = element as HTMLMediaElement;
      if (mediaElement.srcObject) {
        const stream = mediaElement.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        mediaElement.srcObject = null;
      }
    });
  }

  // Simplified toggle source functions
  const toggleSource = (source: 'mic' | 'system' | 'app') => {
    if (source === 'mic') {
      setMicEnabled(!micEnabled)
    }
    else if (source === 'system') {
      const newState = !systemAudioEnabled
      setSystemAudioEnabled(newState)
      if (newState) setAppAudioEnabled(false)
    }
    else if (source === 'app') {
      const newState = !appAudioEnabled
      setAppAudioEnabled(newState)
      if (newState) setSystemAudioEnabled(false)
    }
  }

  // Update the handleScreenSelect function to be functional
  const handleScreenSelect = (sourceId: string, sourceName: string) => {
    setSelectedScreenId(sourceId)
    setSelectedScreenName(sourceName)
    setSelectedSystemAudioSource(sourceId)
    console.log(`Selected "${sourceName}" for system audio capture`)
  }

  const handleAppSelect = (sourceId: string, sourceName: string) => {
    setSelectedApp(sourceId)
    console.log(`Selected "${sourceName}"`)
  }

  // Helper function to get permission status text and color
  const getPermissionStatusInfo = () => {
    if (microphonePermissionGranted === null) {
      return { text: 'Checking...', bgColor: 'bg-yellow-500', textColor: 'text-white' }
    } else if (microphonePermissionGranted === true) {
      return { text: 'Mic ✓', bgColor: 'bg-green-500', textColor: 'text-white' }
          } else {
      return { text: 'Mic ✗', bgColor: 'bg-red-500', textColor: 'text-white' }
    }
  }
  
  // Helper function to get API key status text and color
  const getApiKeyStatusInfo = () => {
    if (apiKeyLoading) {
      return { text: 'API: Loading...', bgColor: 'bg-yellow-500', textColor: 'text-white' }
    } else if (openAIApiKey) {
      return { text: 'API ✓', bgColor: 'bg-green-500', textColor: 'text-white' }
          } else {
      return { text: 'API ✗', bgColor: 'bg-red-500', textColor: 'text-white' }
    }
  }

  // Update transcription status handling
  useEffect(() => {
    // Map transcriptionStatus to isProcessing for backwards compatibility
    if (transcriptionStatus === 'processing') {
      setIsProcessing(true);
      } else {
      setIsProcessing(false);
    }

    // Show toast for errors
    if (transcriptionStatus === 'error' && transcriptError) {
      console.error('Transcription Error:', transcriptError);
    }
  }, [transcriptionStatus, transcriptError]);

  // Update the transcribeWithLocalWhisper function to return the transcription
  const transcribeWithLocalWhisper = async (audioBlob: Blob, source: 'mic' | 'system' = 'mic'): Promise<string> => {
    let tempFilePath = null;
    
    try {
      // Only set processing status if not already processing
      if (transcriptionStatus !== 'processing') {
        setTranscriptionStatus('processing');
      }
      
      // Check if the blob is too small to contain meaningful audio
      if (audioBlob.size < 1000) {
        console.log(`Skipping transcription for small audio chunk (${audioBlob.size} bytes)`);
        return '';
      }
      
      // Save the audio blob to a temporary file
      tempFilePath = await window.electronAPI.saveTempAudio(audioBlob);
      
      // Get the model name from the currentSTTModel
      const modelName = currentSTTModel.replace('local:', '').trim();
      
      console.log(`Processing ${audioBlob.size} bytes with local Whisper model: ${modelName}`);
      
      // Run the Whisper CLI on the temporary file
      const transcription = await window.electronAPI.runWhisperCLI(tempFilePath, modelName);
      
      // Clean up temporary files if needed (the server now also cleans up)
      if (tempFilePath) {
        try {
          await window.electronAPI.cleanupTempFile(tempFilePath);
        } catch (cleanupError) {
          console.warn('Error cleaning up temp file:', cleanupError);
        }
      }
      
      if (transcription && transcription.trim()) {
        console.log('Received local transcription:', transcription);
        
        // Update the transcript with proper spacing
        setTranscriptChunks(prev => {
          // If there are previous chunks, add a space before adding the new one
          if (prev.length > 0) {
            return [...prev, ` ${transcription.trim()}`];
          }
          return [...prev, transcription.trim()];
        });
        
        setTranscriptionStatus('idle');
        return transcription.trim();
      }
      
      setTranscriptionStatus('idle');
      return '';
    } catch (error) {
      console.error('Error in local Whisper transcription:', error);
      
      // Try to clean up if we have a file path and an error occurred
      if (tempFilePath) {
        try {
          await window.electronAPI.cleanupTempFile(tempFilePath);
        } catch (cleanupError) {
          console.warn('Error cleaning up temp file after error:', cleanupError);
        }
      }
      
      // Don't spam with error toasts for every chunk
      // Only set error status if we're not already in an error state
      if (transcriptionStatus !== 'error') {
        setTranscriptionStatus('error');
        setTranscriptError(`Error with local Whisper: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      return '';
    }
  };

  // Check for BlackHole audio device availability and ensure it's actually accessible
  const checkBlackHoleAvailability = async () => {
    // Use type assertion to access the getSystemAudioSources method
    const api = window.electronAPI as any;
    
    if (api && typeof api.getSystemAudioSources === 'function') {
      try {
        const sources = await api.getSystemAudioSources();
        
        // Filter audio sources for BlackHole
        const blackholeSource = sources.find(
          (source: { name: string; type: string; id: string }) => 
            source.name.includes('BlackHole') && source.type === 'audio'
        );
        
        if (blackholeSource) {
          console.log('Found BlackHole audio device:', blackholeSource);
          
          // Try to actually access the device to verify it's available
          try {
            // Test access to the device without actually using it
            const testStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { exact: blackholeSource.id }
              }
            });
            
            // If we got here, the device is actually accessible
            // Stop the test stream immediately
            testStream.getTracks().forEach(track => track.stop());
            
            setSystemAudioBlackHoleAvailable(true);
            setSelectedSystemAudioSource(blackholeSource.id);
            console.log('BlackHole device verified and accessible');
          } catch (accessError) {
            console.error('BlackHole device found but not accessible:', accessError);
            setSystemAudioBlackHoleAvailable(false);
          }
        } else {
          console.log('BlackHole audio device not found');
          setSystemAudioBlackHoleAvailable(false);
        }
      } catch (error) {
        console.error('Error checking BlackHole availability:', error);
        setSystemAudioBlackHoleAvailable(false);
      }
    }
  }

  // Function to open setup instructions
  const showBlackHoleSetupInstructions = () => {
    setShowBlackHoleSetupHelp(true)
  }

  // Function to close setup instructions
  const hideBlackHoleSetupInstructions = () => {
    setShowBlackHoleSetupHelp(false)
  }

  // Update the loadAudioDevices function to handle both device types
  const loadAudioDevices = async () => {
    try {
      // Get list of audio input devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')
      setAudioInputDevices(audioInputs)
      
      // Find BlackHole device for system audio
      const blackholeDevice = audioInputs.find(device => 
        device.label.includes('BlackHole')
      )
      
      // Default microphone (first non-BlackHole device)
      const defaultMic = audioInputs.find(device => 
        !device.label.includes('BlackHole')
      )
      
      // Set defaults
      if (defaultMic) {
        setMicInputDeviceId(defaultMic.deviceId)
      } else if (audioInputs.length > 0) {
        setMicInputDeviceId(audioInputs[0].deviceId)
      }
      
      if (blackholeDevice) {
        setSystemAudioDeviceId(blackholeDevice.deviceId)
        setSelectedSystemAudioSource(blackholeDevice.deviceId)
      } else if (audioInputs.length > 0) {
        setSystemAudioDeviceId(audioInputs[0].deviceId)
      }
    } catch (error) {
      console.error('Error loading audio devices:', error)
    }
  }

  // Add these helper functions before the component
  const formatAudioDevicesForDropdown = (devices: MediaDeviceInfo[], type: 'microphone' | 'system') => {
    const filteredDevices = devices.filter(device => {
      if (type === 'microphone') {
        return !device.label.includes('BlackHole');
      } else {
        return device.label.includes('BlackHole');
      }
    });

    return [{
      label: type === 'microphone' ? 'Microphone Devices' : 'System Audio Devices',
      options: filteredDevices.map(device => ({
        value: device.deviceId,
        label: device.label || `Audio Device ${device.deviceId.substring(0, 4)}`,
        title: device.label
      }))
    }];
  };

  const webGpuModelOptions = [{
    label: 'Whisper Models',
    options: [
      {
        value: 'base',
        label: 'Whisper Base (faster, less accurate)',
        title: 'Optimized for speed with reasonable accuracy'
      },
      {
        value: 'large',
        label: 'Whisper Large V3 Turbo (slower, more accurate)',
        title: 'Best accuracy but requires more processing power'
      }
    ]
  }];

  if (!isOpen) return null

  const permissionStatus = getPermissionStatusInfo()
  const apiKeyStatus = getApiKeyStatusInfo()

  return (
    <div 
      className="absolute top-full left-0 mt-2 w-80 transform -translate-x-[calc(50%-12px)]"
      style={{ zIndex: 100 }}
      onClick={e => e.stopPropagation()}
    >
      {/* Add transparent bridge */}
      <div className="absolute -top-2 left-0 w-full h-2" />
      <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-white/90">
              Teleprompter
            </h3>
          </div>
          
          {/* WebGPU toggle switch and model selector if available */}
          {webGpuAvailable && (
            <div className="space-y-2">
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
                    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                    <rect x="9" y="9" width="6" height="6"></rect>
                    <line x1="9" y1="2" x2="9" y2="4"></line>
                    <line x1="15" y1="2" x2="15" y2="4"></line>
                    <line x1="9" y1="20" x2="9" y2="22"></line>
                    <line x1="15" y1="20" x2="15" y2="22"></line>
                    <line x1="20" y1="9" x2="22" y2="9"></line>
                    <line x1="20" y1="14" x2="22" y2="14"></line>
                    <line x1="2" y1="9" x2="4" y2="9"></line>
                    <line x1="2" y1="14" x2="4" y2="14"></line>
                  </svg>
                  <span>
                    WebGPU
                    {webGpuLoading && <span className="text-xs text-white/50"> (Loading...)</span>}
                  </span>
                </div>
                <button 
                  onClick={() => setWebGpuEnabled(!webGpuEnabled)}
                  disabled={webGpuLoading || isRecording || isProcessing}
                  className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    webGpuEnabled ? 'bg-green-500/50' : 'bg-gray-500/30'
                  } ${(webGpuLoading || isRecording || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span 
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      webGpuEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </button>
              </div>
              
              {/* Model selector dropdown */}
              {webGpuEnabled && (
                <CustomDropdown
                  value={webGpuModel}
                  onChange={(value) => {
                    if (webGpuWorkerRef.current) {
                      webGpuWorkerRef.current.terminate();
                      webGpuWorkerRef.current = null;
                    }
                    setWebGpuModel(value as 'base' | 'large');
                    setWebGpuLoaded(false);
                    setWebGpuLoading(false);
                    setWebGpuLoadingProgress([]);
                  }}
                  options={webGpuModelOptions}
                  placeholder="Select Whisper model"
                  className="w-full"
                />
              )}
            </div>
          )}
          
          {/* Audio Source Toggles */}
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
                <span>Microphone</span>
              </div>
              <button 
                onClick={() => toggleSource('mic')}
                disabled={isRecording || isProcessing}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  micEnabled ? 'bg-green-500/50' : 'bg-gray-500/30'
                } ${(isRecording || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span 
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    micEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>
            
            {/* Audio input device selector for microphone */}
            {micEnabled && (
              <div className="mt-1">
                <CustomDropdown
                  value={micInputDeviceId}
                  onChange={setMicInputDeviceId}
                  options={formatAudioDevicesForDropdown(audioInputDevices, 'microphone')}
                  placeholder="Select microphone device"
                  className="w-full"
                />
              </div>
            )}
            
            {/* Separator */}
            <div className="my-2 border-t border-white/10"></div>
            
            {/* Share Entire Screen Toggle */}
            <div className={`flex items-center justify-between ${!isElectronAvailable ? 'opacity-50' : ''}`}>
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
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                </svg>
                <span>
                  System Audio
                  {!isElectronAvailable && <span className="text-xs text-white/50"> (Requires Electron)</span>}
                </span>
              </div>
              <button 
                onClick={() => toggleSource('system')}
                disabled={!isElectronAvailable || isRecording || isProcessing}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  systemAudioEnabled ? 'bg-green-500/50' : 'bg-gray-500/30'
                } ${(!isElectronAvailable || isRecording || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span 
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    systemAudioEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>
            
            {/* Audio input device selector for system audio */}
            {systemAudioEnabled && (
              <div className="mt-1">
                <CustomDropdown
                  value={systemAudioDeviceId}
                  onChange={(value) => {
                    setSystemAudioDeviceId(value);
                    setSelectedSystemAudioSource(value);
                  }}
                  options={formatAudioDevicesForDropdown(audioInputDevices, 'system')}
                  placeholder="Select system audio device"
                  className="w-full"
                />
              </div>
            )}
          </div>
          
          {/* Transcription Area - Exact implementation from webgpu-whisper */}
          <div className="space-y-2">
            {/* Microphone Transcription */}
            {micEnabled && (
              <div className="space-y-1">
            <div className="flex justify-between items-center">
                  <p className="text-xs text-white/70">Microphone Transcription:</p>
            </div>
                <div className="relative">
                  <p className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere border border-gray-700 rounded-lg p-2 bg-black/50 text-white/90">
                    {micTranscript || (isRecording ? "Listening to microphone..." : "")}
                  </p>
                </div>
            </div>
            )}
            
            {/* System Audio Transcription */}
            {systemAudioEnabled && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-white/70">System Audio Transcription:</p>
                </div>
                <div className="relative">
                  <p className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere border border-gray-700 rounded-lg p-2 bg-black/50 text-white/90">
                    {systemTranscript || (isRecording ? "Listening to system audio..." : "")}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* WebGPU loading indicator */}
          {webGpuLoading && (
            <div className="text-xs text-white/70">
              <p>Loading WebGPU Whisper model... Please wait.</p>
              {webGpuCacheInfo && (
                <p className="mt-1 text-xs text-blue-300">
                  Caching to: {webGpuCacheInfo.location} 
                  {webGpuCacheInfo.environment === 'Electron' ? ' (in Electron)' : ''}
                </p>
              )}
              {webGpuLoadingProgress.map((item, index) => (
                <div key={index} className="mt-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-white/70">{item.file.split('/').pop()}</span>
                    {item.progress && (
                      <span className="text-xs text-green-400">
                        {Math.round(item.progress * 100)}%
                      </span>
                    )}
                  </div>
                  {item.progress && (
                    <div className="h-1 bg-gray-700 rounded overflow-hidden mt-1">
                      <div 
                        className="bg-green-400 h-full" 
                        style={{ width: `${Math.round(item.progress * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
              {webGpuTps && (
                <div className="text-right mt-1">
                  <span className="text-xs text-green-400">{webGpuTps.toFixed(2)} tok/s</span>
                </div>
              )}
            </div>
          )}
          
          {/* Controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {isRecording && (
                <div className="flex items-center gap-1.5 text-red-400">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span className="text-xs font-medium">Listening</span>
                </div>
              )}
              
              {/* Request Permission Button */}
              {microphonePermissionGranted === false && (
                <button
                  onClick={requestMicrophonePermission}
                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  title="Request Microphone Permission"
                >
                  Allow Mic
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {/* Recording button */}
                <button
                onClick={toggleRecording}
                disabled={microphonePermissionGranted === false || isProcessing || microphonePermissionGranted === null || (!openAIApiKey && !apiKeyLoading) || apiKeyLoading}
                className={`
                  py-2 px-4 rounded-lg flex items-center gap-2 transition-colors
                  ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                  ${(microphonePermissionGranted === false || isProcessing || microphonePermissionGranted === null || (!openAIApiKey && !apiKeyLoading) || apiKeyLoading) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? (
                  <>
                    {/* White square for stop button */}
                    <div className="w-3 h-3 bg-white"></div>
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                    <span>Start Listening</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default STTPanel 