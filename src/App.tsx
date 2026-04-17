import React, { useState, useRef, useEffect } from "react";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const poseRef = useRef<any>(null);

  useEffect(() => {
    if (!(window as any).Pose) return;

    const pose = new (window as any).Pose({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

     pose.onResults((results: any) => {
    if (!results.poseLandmarks) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    // temizle
    ctx.clearRect(0, 0, 360, 640);

    // 🔴 noktaları çiz
    results.poseLandmarks.forEach((lm: any) => {
      ctx.beginPath();
      ctx.arc(lm.x * 360, lm.y * 640, 3, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    });

    console.log("📍 LANDMARKS:", results.poseLandmarks);
  });

    poseRef.current = pose;

    // 🔥 PRELOAD
    const preload = async () => {
      const dummyCanvas = document.createElement("canvas");
      dummyCanvas.width = 10;
      dummyCanvas.height = 10;

      await pose.send({ image: dummyCanvas });
      console.log("🚀 Model preload edildi");
    };

    preload();
  }, []);

  const processFrame = async () => {
    if (!poseRef.current) {
      console.warn("Model henüz yüklenmedi, bekleniyor...");
      requestAnimationFrame(processFrame);
      return;
    }

    if (
      videoRef.current &&
      canvasRef.current &&
      poseRef.current &&
      !videoRef.current.paused
    ) {
      const ctx = canvasRef.current.getContext("2d");

      if (ctx) {
        ctx.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );

        try {
          await poseRef.current.send({ image: canvasRef.current });
        } catch (err) {
          console.error("MediaPipe gönderim hatası:", err);
        }
      }

      requestAnimationFrame(processFrame);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setVideoSrc(URL.createObjectURL(file));
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Fitness AI: 4K Video Fix</h2>

      <input type="file" accept="video/*" onChange={handleFileChange} />

      <div style={{ marginTop: "20px" }}>
        {videoSrc && (
          <>
            <video
              ref={videoRef}
              src={videoSrc}
              width="360"
              height="640"
              controls
              onPlay={processFrame}
            />

           <canvas
  ref={canvasRef}
  width="360"
  height="640"
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
  }}
/>
          </>
        )}
      </div>
    </div>
  );
}

export default App;