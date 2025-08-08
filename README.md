## Detailed Design Document

[Design (PDF)](Design.pdf)

## Download & Installation

1. **Download**  
   - [Packet.Analyzer-1.0.0-arm64.dmg](https://github.com/jjenkins2004/trace-analyzer/releases/download/v1/Packet.Analyzer-1.0.0-arm64.dmg).  

2. **Install**  
   - Open the `.dmg`, then drag into your **Applications** folder.

3. **Mac Security**
   - When opening the application, it will say that app is untrusted.
   - To run the app go to System Settings → Privacy & Security → Scroll down to the **Security** section, find “Packet Analyzer was blocked to protect your Mac,” and click **Open Anyway**.

## If macOS Automatically Deletes the App (Malware Detection)

If macOS immediately removes the app after download you can build it locally from source:

1. **Download Source Code**
   - [Source Code](https://github.com/jjenkins2004/trace-analyzer/archive/refs/tags/v1.zip)

2. **Install Node.js + npm**
   - If you don’t have them installed, download Node.js (which includes npm) from [nodejs.org](https://nodejs.org) or install via Homebrew.

3. **Install dependencies**
   - Open terminal inside of the downloaded directory and run `npm install`.

4. **Build app**
   - Run `npm run build` in terminal after installing dependencies.

5. **Run Application**
   - The application will be `dist/mac-arm64`, you can drag the application into your application folder.
