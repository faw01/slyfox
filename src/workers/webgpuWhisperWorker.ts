// This must be a separate file to run in a web worker context
// It handles WebGPU Whisper transcription using transformers.js

// We use dynamic imports to load the transformers.js library
import type * as Transformers from '@huggingface/transformers';

// Define types for the transformers.js APIs we'll use
type TokenizerType = any;
type ProcessorType = any;
type ModelType = any;
type TextStreamerType = any;
type EnvType = any;
type HfTransformers = typeof Transformers & {
  AutoTokenizer: { from_pretrained: (modelId: string, options?: any) => Promise<TokenizerType> };
  AutoProcessor: { from_pretrained: (modelId: string, options?: any) => Promise<ProcessorType> };
  WhisperForConditionalGeneration: { from_pretrained: (modelId: string, options?: any) => Promise<ModelType> };
  TextStreamer: { new(tokenizer: TokenizerType, options?: any): TextStreamerType };
  full: (shape: number[], value: number) => any;
  env: EnvType;
};

// These will be initialized when the module is loaded
let transformers: HfTransformers;
let AutoTokenizer: HfTransformers['AutoTokenizer'];
let AutoProcessor: HfTransformers['AutoProcessor'];
let WhisperForConditionalGeneration: HfTransformers['WhisperForConditionalGeneration'];
let TextStreamer: any;
let full: HfTransformers['full'];
let env: HfTransformers['env'];

// Max number of tokens to generate
const MAX_NEW_TOKENS = 64;

// For TypeScript to ignore the dynamic import
declare const importShim: (url: string) => Promise<any>;

/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 */
class AutomaticSpeechRecognitionPipeline {
    static model_id: string | null = null;
    static tokenizer: TokenizerType | null = null;
    static processor: ProcessorType | null = null;
    static model: ModelType | null = null;

    static async getInstance(progress_callback: ((progress: any) => void) | null = null) {
        if (!this.model_id) {
            throw new Error('Model ID not set. Call setModelId first.');
        }

        this.tokenizer ??= await AutoTokenizer.from_pretrained(this.model_id, {
            progress_callback,
        });
        this.processor ??= await AutoProcessor.from_pretrained(this.model_id, {
            progress_callback,
        });

        this.model ??= await WhisperForConditionalGeneration.from_pretrained(this.model_id, {
            dtype: this.model_id.includes('large-v3-turbo') ? {
                encoder_model: 'fp16',
                decoder_model_merged: 'q4',
            } : {
                encoder_model: 'fp32',
                decoder_model_merged: 'fp32',
            },
            device: 'webgpu',
            progress_callback,
        });

        return Promise.all([this.tokenizer, this.processor, this.model]);
    }

    static setModelId(modelId: string) {
        // Reset everything if the model ID changes
        if (this.model_id !== modelId) {
            this.model_id = modelId;
            this.tokenizer = null;
            this.processor = null;
            this.model = null;
        }
    }
}

// Flag to prevent multiple processing at once
let processing = false;

async function generate({ audio, language }: { audio: Float32Array, language: string }) {
    if (processing) return;
    processing = true;

    // Tell the main thread we are starting
    self.postMessage({ status: 'start' });

    // Retrieve the text-generation pipeline.
    const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance();

    let startTime: number | undefined;
    let numTokens = 0;
    const callback_function = (output: string) => {
        startTime ??= performance.now();

        let tps;
        if (numTokens++ > 0) {
            tps = numTokens / (performance.now() - startTime) * 1000;
        }
        self.postMessage({
            status: 'update',
            output, tps, numTokens,
        });
    }

    const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function,
    });

    const inputs = await processor(audio);

    const outputs = await model.generate({
        ...inputs,
        max_new_tokens: MAX_NEW_TOKENS,
        language,
        streamer,
    });

    const outputText = tokenizer.batch_decode(outputs, { skip_special_tokens: true });

    // Send the output back to the main thread
    self.postMessage({
        status: 'complete',
        output: outputText,
    });
    processing = false;
}

async function load(modelId: string) {
    // Dynamically import transformers.js using ES modules
    try {
        // @ts-ignore - TypeScript doesn't understand dynamic imports from URLs
        const module = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.18/+esm');
        transformers = module as unknown as HfTransformers;
        
        // Assign the imported objects
        AutoTokenizer = transformers.AutoTokenizer;
        AutoProcessor = transformers.AutoProcessor;
        WhisperForConditionalGeneration = transformers.WhisperForConditionalGeneration;
        TextStreamer = transformers.TextStreamer;
        full = transformers.full;
        env = transformers.env;
        
        self.postMessage({
            status: 'loading',
            data: 'Library loaded, loading model...'
        });
    } catch (error) {
        console.error('Failed to load transformers.js library:', error);
        self.postMessage({
            status: 'error',
            data: `Failed to load transformers.js: ${error instanceof Error ? error.message : String(error)}`
        });
        return;
    }
    
    // Log cache location and settings
    const cacheInfo = {
        location: 'Browser IndexedDB (transformers-cache)',
        useBrowserCache: env.useBrowserCache,
        cacheVersion: env.cacheVersion,
        localModelPath: env.localModelPath || 'Not set',
        environment: env.isElectron ? 'Electron' : 'Browser'
    };
    
    console.log('WebGPU Whisper cache info:', cacheInfo);
    self.postMessage({
        status: 'cache_info',
        data: cacheInfo
    });

    // Set the model ID before loading the pipeline
    AutomaticSpeechRecognitionPipeline.setModelId(modelId);

    // Load the pipeline and save it for future use.
    try {
        const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance(x => {
            // We also add a progress callback to the pipeline so that we can
            // track model loading.
            console.log('Loading:', x);
            self.postMessage(x);
        });

        self.postMessage({
            status: 'loading',
            data: 'Compiling shaders and warming up model...'
        });

        // Run model with dummy input to compile shaders
        await model.generate({
            input_features: full([1, 80, 3000], 0.0),
            max_new_tokens: 1,
        });
        self.postMessage({ status: 'ready' });
    } catch (error) {
        console.error('Error loading model:', error);
        self.postMessage({
            status: 'error',
            data: `Error loading model: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (e: MessageEvent) => {
    const { type, data, model } = e.data;

    switch (type) {
        case 'load':
            load(model);
            break;

        case 'generate':
            generate(data);
            break;
    }
}); 