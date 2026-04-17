/*import { useEffect, useRef } from "react";

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    async function start() {
      const video = videoRef.current;
      if (!video) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        console.log("stream ok");

        video.srcObject = stream;

        // 🔥 EN KRİTİK FIX
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });

        console.log("metadata ready");

        await video.play().catch((e) => {
          console.log("play blocked:", e);
        });

        console.log("camera playing");
      } catch (err) {
        console.error("CAMERA FAIL:", err);
      }
    }

    start();
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Camera Test ONLY</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: 640,
          height: 480,
          background: "black",
        }}
      />
    </div>
  );
}
  */


import { useEffect, useRef } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let poseLandmarker: PoseLandmarker;
    let lastVideoTime = -1;

    async function start() {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const drawingUtils = new DrawingUtils(ctx);

      // 🔥 MODEL YÜKLE
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      console.log("MODEL READY");

      // 🔥 KAMERA
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      await video.play();
      console.log("CAMERA READY");

      // 🔥 LOOP
      async function detect() {
        const now = performance.now();

        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;

          const result = poseLandmarker.detectForVideo(video, now);

          // ✅ SENİN İSTEDİĞİN LOG
          console.log("LANDMARKS:", result.landmarks);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          for (const landmarks of result.landmarks) {
            drawingUtils.drawLandmarks(landmarks);
            drawingUtils.drawConnectors(
              landmarks,
              PoseLandmarker.POSE_CONNECTIONS
            );
          }
        }

        requestAnimationFrame(detect);
      }

      detect();
    }

    start();
  }, []);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width={640}
        height={480}
        style={{ position: "absolute" }}
      />

      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ position: "absolute" }}
      />
    </div>
  );
}