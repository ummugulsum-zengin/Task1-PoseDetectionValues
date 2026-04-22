import React, { useRef, useState, useEffect } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";


const EXERCISE_CONFIGS = {
  SQUAT: {
    joints: [23, 25, 27], // Kalça - Diz - Bilek
    targetAngle: 90,
    type: "LOWER_BODY"
  },
  PUSH_UP: {
    joints: [11, 13, 15], // Omuz - Dirsek - Bilek
    targetAngle: 70,
    type: "UPPER_BODY"
  },
  BICEP_CURL: {
    joints: [11, 13, 15],
    targetAngle: 40,
    type: "ISOLATION"
  }
};


function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<PoseLandmarker | null>(null);
  
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [sequence, setSequence] = useState<any[]>([]); // ✅ State artık içeride
  const [userProfile, setUserProfile] = useState({
    kneeMin: 80,
    kneeMax: 170,
    idealDepth: 90,
  });

  const [feedback, setFeedback] = useState("Harekete Hazırlan...");
const [statusColor, setStatusColor] = useState("green");
// Referans verisi (Daha önce profesyonelden aldığın açı dizisi gibi düşün)
const referenceRef = useRef([175, 160, 130, 90, 130, 160, 175]);

  const baselineRef = useRef<any>(null);

  const connections = [
    [11, 13], [13, 15], [12, 14], [14, 16], [11, 12],
    [11, 23], [12, 24], [23, 25], [25, 27], [24, 26], [26, 28],
  ];

  // ---------------- Yardımcı Fonksiyonlar ----------------
  const distance = (a: any, b: any) => {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  };

  const calculate3DAngle = (p1: any, p2: any, p3: any) => {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);
    let cosTheta = dot / (mag1 * mag2);
    cosTheta = Math.max(-1, Math.min(1, cosTheta));
    return (Math.acos(cosTheta) * 180) / Math.PI;
  };

  const checkSquatQuality = (currentAngle, config) => {
  // config içindeki idealDepth (örneğin 90) ile karşılaştırıyoruz
  const diff = currentAngle - config.idealDepth;

  if (currentAngle > config.kneeMax) {
    return { status: "WAITING", message: "Harekete başla!" };
  }
  
  if (diff > 20) {
    return { status: "IN_PROGRESS", message: "Daha derin eğil!" };
  } 
  
  if (currentAngle < config.kneeMin) {
    return { status: "WARNING", message: "Çok derin! Dizlerine yük biniyor." };
  }

  return { status: "SUCCESS", message: "Harika! Bu derinlik ideal." };
};
 
  // ---------------- INIT MODEL ----------------
  useEffect(() => {
    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );
      detectorRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
          delegate: "GPU"
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

    if (!video || !canvas || !detector || video.paused) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const result = detector.detectForVideo(video, performance.now());

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result.worldLandmarks && result.worldLandmarks.length > 0 && result.landmarks.length > 0) {
      const worldLM = result.worldLandmarks[0];
      const landmarks = result.landmarks[0];

      // 1. Analiz
      const kneeAngle = calculate3DAngle(worldLM[23], worldLM[25], worldLM[27]);
      const kneeShift = Math.sqrt(
        Math.pow(worldLM[25].x - worldLM[31].x, 2) + 
        Math.pow(worldLM[25].z - worldLM[31].z, 2)
      );

      
// Kalite kontrolü yapalım
const quality = checkSquatQuality(kneeAngle, {
  ...userProfile,
  kneeMax: 165 // Hareketi başlatmak için küçük bir tolerans
});

      // Ekrana mesajı ve rengi basalım
setFeedback(quality.message);
const currentColor = quality.status === "SUCCESS" ? "#00FF00" : 
                     quality.status === "WARNING" ? "#FF0000" : "#FFFF00";
setStatusColor(currentColor);

 // ... Çizim kısmında ctx.strokeStyle yerine currentColor kullan ...
connections.forEach(([i, j]) => {
  const a = landmarks[i];
  const b = landmarks[j];
  if (a && b) {
    ctx.beginPath();
    ctx.strokeStyle = currentColor; // Dinamik renk
    ctx.lineWidth = 4;
    ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
    ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
    ctx.stroke();
  }
      });

      // 3. Çizim - Points
      landmarks.forEach((lm) => {
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
      });
    }

    requestAnimationFrame(processFrame);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoSrc(URL.createObjectURL(file));
  };

  return (
  <div style={{ textAlign: "center", padding: 20, backgroundColor: "#1a1a1a", color: "white", minHeight: "100vh" }}>
    <h2>AI Fitness Coach: Squat Analysis</h2>
    
    {/* Geri Bildirim Paneli */}
    <div style={{ 
      margin: "10px auto", 
      padding: "15px", 
      width: "360px", 
      borderRadius: "10px", 
      backgroundColor: statusColor, 
      color: "black",
      fontWeight: "bold",
      fontSize: "1.2rem",
      transition: "all 0.3s"
    }}>
      {feedback}
    </div>

    <input type="file" accept="video/*" onChange={handleFileChange} style={{ margin: "20px" }} />

    {videoSrc && (
      <div style={{ position: "relative", width: 360, height: 640, margin: "0 auto", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
        <video
          ref={videoRef}
          src={videoSrc}
          width={360}
          height={640}
          controls
          onPlay={processFrame}
          style={{ borderRadius: '10px' }}
        />
        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        />
      </div>
    )}
  </div>
);
}

export default App;