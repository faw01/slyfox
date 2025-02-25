# Slyfox

An invisible desktop application that will help you pass your technical interviews based on [Interview Coder](https://www.interviewcoder.co). 

## Invisibility Compatibility

The application is invisible to:

- Zoom versions below 6.1.6 (inclusive)
- All browser-based screen recording software
- All versions of Discord
- Mac OS _screenshot_ functionality (Command + Shift + 3/4)

Note: The application is **NOT** invisible to:

- Zoom versions 6.1.6 and above
  - https://zoom.en.uptodown.com/mac/versions (link to downgrade Zoom if needed)
- Mac OS native screen _recording_ (Command + Shift + 5)

## Features

- 🎯 99% Invisibility: Undetectable window that bypasses most screen capture methods
- 📸 Smart Screenshot Capture: Capture both question text and code separately for better analysis
- 🤖 AI-Powered Analysis: Automatically extracts and analyzes coding problems
- 💡 Solution Generation: Get detailed explanations and solutions
- 🔧 Real-time Debugging: Debug your code with AI assistance
- 🎨 Window Management: Freely move and position the window anywhere on screen

## Building

```
node scripts/manual-notarize.js "release/Interview-Coder-x64.dmg" && xcrun stapler staple "release/Interview-Coder-x64.dmg"
node scripts/manual-notarize.js "release/Interview-Coder-arm64.dmg" && xcrun stapler staple "release/Interview-Coder-arm64.dmg"
```