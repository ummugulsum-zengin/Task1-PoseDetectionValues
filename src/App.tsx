import React, { useRef, useState, useEffect } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detectorRef = useRef<PoseLandmarker | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // ---------------- INIT MODEL ----------------
  useEffect(() => {
    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );

      detectorRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      console.log("🚀 Model loaded");
    };

    init();
  }, []);

  // ---------------- PROCESS FRAME ----------------
  const processFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const detector = detectorRef.current;

    if (!video || !canvas || !detector) {
      requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const result = detector.detectForVideo(video, performance.now());

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];

      // draw points
      landmarks.forEach((lm) => {
        ctx.beginPath();
        ctx.arc(
          lm.x * canvas.width,
          lm.y * canvas.height,
          4,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = "red";
        ctx.fill();
      });
    }

    if (!video.paused) {
      requestAnimationFrame(processFrame);
    }
  };

  // ---------------- FILE ----------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoSrc(URL.createObjectURL(file));
  };

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>MediaPipe Pose (NEW VERSION)</h2>

      <input type="file" accept="video/*" onChange={handleFileChange} />

      {videoSrc && (
        <div
          style={{
            position: "relative",
            width: 360,
            height: 640,
            margin: "0 auto",
          }}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            width={360}
            height={640}
            controls
            onPlay={processFrame}
            style={{ position: "absolute", top: 0, left: 0 }}
          />

          <canvas
            ref={canvasRef}
            width={360}
            height={640}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;