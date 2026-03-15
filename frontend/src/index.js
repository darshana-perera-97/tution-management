import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress camera/QR scanner play() errors so they don't trigger the React error overlay.
// Must run before React mounts so we catch the event before the overlay's listeners.

// Wrap HTMLVideoElement.play so interrupted play() never rejects (avoids unhandled rejection).
if (typeof HTMLVideoElement !== 'undefined' && HTMLVideoElement.prototype.play) {
  const originalPlay = HTMLVideoElement.prototype.play;
  HTMLVideoElement.prototype.play = function play() {
    return originalPlay.apply(this, arguments).catch(() => {});
  };
}

function isCameraPlayError(msg) {
  if (msg == null) return false;
  const m = String(msg).toLowerCase();
  return (
    m.includes('play() request was interrupted') ||
    m.includes('new load request') ||
    m.includes('goo.gl') ||
    m.includes('ldlk22') ||
    m.includes('interrupted by a call to pause') ||
    m.includes('interrupted by new load') ||
    m.includes('onabort') ||
    m.includes('video surface onabort') ||
    m.includes('renderedcameraimpl') ||
    m.includes('abort') ||
    m.includes('notallowederror') ||
    m.includes('notreadableerror')
  );
}

function shouldSuppressError(event) {
  const msg = (event.message || event.error?.message || event.error?.toString() || '').toLowerCase();
  if (isCameraPlayError(msg)) return true;
  return false;
}

function shouldSuppressRejection(event) {
  const reason = event.reason;
  const msg = (reason?.message ?? reason?.toString?.() ?? '').toLowerCase();
  if (isCameraPlayError(msg)) return true;
  // DOMException / AbortError from video (play() interrupted by pause() often reports as AbortError)
  if (reason?.name === 'AbortError' || reason?.name === 'NotAllowedError' || reason?.name === 'NotReadableError') return true;
  return false;
}

window.addEventListener(
  'error',
  (event) => {
    if (shouldSuppressError(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return true;
    }
  },
  true
);

window.addEventListener(
  'unhandledrejection',
  (event) => {
    if (shouldSuppressRejection(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return true;
    }
  },
  true
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
