// LoadingScreen.tsx
// React TypeScript component for Electron or any React-based app using Tailwind CSS and Lucide icons.

import React from "react";
import { Loader } from "lucide-react";

export interface LoadingScreenProps {
  text?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ text = "" }) => (
  <div className="w-full h-full flex flex-col items-center justify-center">
    <Loader className="w-16 h-16 text-primary animate-spin mb-4" />
    {text && <div className="text-lg text-text-muted">{text}</div>}
  </div>
);

export default LoadingScreen;
