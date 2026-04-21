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

  const [userProfile, setUserProfile] = useState({
  kneeMin: 80,
  kneeMax: 170,
  idealDepth: 90,
});

  //We store “ideal posture” once
  const baselineRef = useRef<any>(null);


  // -----------------Skeleton connections----------------
  const connections = [
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 12], // shoulders
  [11, 23], [12, 24], // hips
  [23, 25], [25, 27], // left leg
  [24, 26], [26, 28], // right leg
];

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

     if (!baselineRef.current && result.landmarks.length > 0) {
  baselineRef.current = result.landmarks[0];
  console.log("Baseline captured");
}

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawSkeleton = (landmarks: any, ctx: any, w: number, h: number) => {
  const baseline = baselineRef.current;

connections.forEach(([i, j]) => {
  const a = landmarks[i];
  const b = landmarks[j];

  const ba = baseline?.[i];
  const bb = baseline?.[j];

  if (!a || !b || !ba || !bb) return;

  const error =
    distance(a, ba) + distance(b, bb);

  ctx.strokeStyle = error < 0.15 ? "green" : "yellow";

  ctx.beginPath();
  ctx.moveTo(a.x * w, a.y * h);
  ctx.lineTo(b.x * w, b.y * h);
  ctx.stroke();
});
 
};

    if (result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];

      // draw skeleton
    drawSkeleton(
    landmarks,
    ctx,
    canvas.width,
    canvas.height
  );
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
  
  //---------------- Feedback logic for squats----------------
  const getSquatFeedback = (kneeAngle, profile) => {
  if (kneeAngle < profile.idealDepth) {
    return "Good depth for your body";
  }

  if (kneeAngle < profile.kneeMin) {
    return "Too deep, be careful";
  }

  if (kneeAngle > profile.kneeMax) {
    return "Start bending your knees";
  }

  return "Go a bit lower";
};
//------------------ posture error detection ----------------
const checkAlignment = (current, baseline) => {
  let totalError = 0;

  for (let i = 0; i < current.length; i++) {
    totalError += distance(current[i], baseline[i]);
  }

  return totalError;
};

//------------------ Yellow correction logic ---------------- 
const distance = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};
  //---------------- calculate angle between 3 points----------------
  const calculateAngle = (a: any, b: any, c: any) => {
  const AB = { x: a.x - b.x, y: a.y - b.y };
  const CB = { x: c.x - b.x, y: c.y - b.y };

  const dot = AB.x * CB.x + AB.y * CB.y;
  const magAB = Math.sqrt(AB.x * AB.x + AB.y * AB.y);
  const magCB = Math.sqrt(CB.x * CB.x + CB.y * CB.y);

  const angleRad = Math.acos(dot / (magAB * magCB));
  const angleDeg = (angleRad * 180) / Math.PI;

  return angleDeg;
};
  //----------------- RENDER ----------------
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