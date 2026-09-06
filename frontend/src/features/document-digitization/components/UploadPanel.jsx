// frontend/src/features/document-digitization/components/UploadPanel.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";

// Accepted file types for gallery / drag-drop upload
const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXT = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

function validateFile(file) {
  if (!file) return "No file selected.";
  if (!ACCEPTED_MIME.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
    return "Unsupported file type. Please upload a PDF or image (JPG, PNG, WEBP).";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is 20 MB.`;
  }
  return null;
}

export default function UploadPanel({ onFileUpload, isProcessing }) {
  // mode: "idle" | "camera" | "preview"
  const [mode, setMode] = useState("idle");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null); // "image" | "pdf"
  const [validationError, setValidationError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraSupported] = useState(
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  );

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Revoke object URL on change or unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Stop any active camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  const setPreviewFromFile = useCallback(
    (file) => {
      const isImage = file.type.startsWith("image/");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = isImage ? URL.createObjectURL(file) : null;
      setPreviewUrl(url);
      setPreviewType(isImage ? "image" : "pdf");
      setSelectedFile(file);
      setMode("preview");
      setValidationError(null);
      setCameraError(null);
    },
    [previewUrl]
  );

  const goIdle = useCallback(() => {
    stopCamera();
    setMode("idle");
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewType(null);
    setValidationError(null);
    setCameraError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [stopCamera, previewUrl]);

  // ── Gallery upload ──────────────────────────────────────────────
  const handleGalleryChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setValidationError(err);
      e.target.value = "";
      return;
    }
    setValidationError(null);
    setPreviewFromFile(file);
  };

  // ── Camera ──────────────────────────────────────────────────────
  const openCamera = async () => {
    setCameraError(null);
    setMode("camera");
    setIsCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setIsCameraReady(true);
      }
    } catch (err) {
      let msg = "Camera unavailable.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission denied. Please allow camera access in your browser settings and try again.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No camera detected on this device. Use Gallery upload instead.";
      } else if (err.name === "NotReadableError") {
        msg = "Camera is in use by another application. Close it and try again.";
      }
      setCameraError(msg);
      setMode("idle");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !isCameraReady) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const file = new File([blob], `scan_${timestamp}.jpg`, { type: "image/jpeg" });
        stopCamera();
        setPreviewFromFile(file);
      },
      "image/jpeg",
      0.92
    );
  };

  const cancelCamera = () => {
    stopCamera();
    setMode("idle");
    setCameraError(null);
  };

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!selectedFile || isProcessing) return;
    onFileUpload(selectedFile);
  };

  // ══════════════════════ RENDER ══════════════════════════════════

  if (mode === "idle") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center shadow-sm hover:border-teal-400 transition-colors">
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M4 16V6a2 2 0 012-2h8l5 5v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
          </svg>
        </div>

        <h3 className="text-base font-bold text-slate-800 mb-1">Upload or Scan Document</h3>
        <p className="text-xs text-slate-500 mb-5">Lab reports, prescriptions &middot; PDF, JPG, PNG &middot; Max 20 MB</p>

        {/* Validation error */}
        {validationError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold text-left flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0">⚠️</span>
            <span>{validationError}</span>
          </div>
        )}

        {/* Camera permission/error */}
        {cameraError && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold text-left flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0">📷</span>
            <span>{cameraError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Gallery / file upload */}
          <label className="flex-1 cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXT}
              className="hidden"
              onChange={handleGalleryChange}
            />
            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 transition-colors select-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L9 7m3-3l3 3" />
              </svg>
              Gallery / Files
            </div>
          </label>

          {/* Camera */}
          {isCameraSupported ? (
            <button
              type="button"
              onClick={openCamera}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-300 bg-white text-slate-700 rounded-xl font-semibold text-sm hover:border-teal-400 hover:text-teal-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Use Camera
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-100 bg-slate-50 text-slate-400 rounded-xl text-sm select-none cursor-not-allowed">
              📷 Camera not available
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === "camera") {
    return (
      <div className="rounded-2xl border-2 border-slate-700 bg-slate-900 overflow-hidden shadow-lg">
        {/* Viewfinder */}
        <div className="relative bg-black" style={{ minHeight: "200px" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-64 object-cover"
          />

          {/* Loading overlay */}
          {!isCameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
              <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4L9 9l3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              <span className="text-white text-xs font-semibold">Starting camera…</span>
            </div>
          )}

          {/* Scan guide */}
          {isCameraReady && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-white/40 rounded-xl w-4/5 h-3/4 flex items-end justify-center pb-2">
                <span className="text-white/50 text-xs font-semibold tracking-wide">Position document inside the frame</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
          <button
            type="button"
            onClick={cancelCamera}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </button>

          {/* Shutter */}
          <button
            type="button"
            onClick={capturePhoto}
            disabled={!isCameraReady}
            title="Capture photo"
            className="w-16 h-16 rounded-full border-4 border-white bg-white hover:bg-teal-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-xl"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600" />
          </button>

          {/* Spacer to balance Cancel button */}
          <div style={{ width: "88px" }} />
        </div>
      </div>
    );
  }

  if (mode === "preview") {
    return (
      <div className="rounded-2xl border-2 border-teal-200 bg-white shadow-sm overflow-hidden">
        {/* Document preview */}
        <div className="p-4 border-b border-slate-100">
          {previewType === "image" && previewUrl ? (
            <img
              src={previewUrl}
              alt="Document preview"
              className="w-full max-h-52 object-contain rounded-xl border border-slate-100 bg-slate-50"
            />
          ) : (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414A2 2 0 0018.414 8l-5.414-5.414A2 2 0 0012 2H7a2 2 0 00-2 2v15a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{selectedFile?.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">PDF Document</p>
              </div>
            </div>
          )}
        </div>

        {/* File meta row */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{selectedFile?.name}</p>
            <p className="text-xs text-slate-400">
              {selectedFile ? (selectedFile.size / 1024).toFixed(1) + " KB" : ""}
              {" · "}
              {previewType === "image" ? "Image" : "PDF"}
            </p>
          </div>
          <span className="flex-shrink-0 text-xs bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full">
            ✓ Ready
          </span>
        </div>

        {/* Processing state */}
        {isProcessing ? (
          <div className="px-4 py-4 flex items-center gap-3">
            <svg className="w-4 h-4 text-teal-600 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4L9 9l3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <p className="text-sm font-semibold text-teal-700 animate-pulse">Processing document…</p>
          </div>
        ) : (
          <div className="px-4 py-3 flex gap-2">
            <button
              type="button"
              onClick={goIdle}
              className="flex-1 py-2.5 border-2 border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-semibold hover:border-rose-300 hover:text-rose-600 transition-colors"
            >
              ✕ Remove
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing}
              className="flex-[2] py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              🔍 Analyse Document
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}