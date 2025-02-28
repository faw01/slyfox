// Import the ElectronAPI from the electron.d.ts file
import { ElectronAPI } from './electron';

// Declare the global window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  } 
} 