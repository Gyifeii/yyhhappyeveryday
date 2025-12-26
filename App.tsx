
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppStage, THEME, ActiveWish, WishResponse } from './types';
import ParticleTree from './components/ParticleTree';
import WishingBall from './components/WishingBall';
import Snow from './components/Snow';
import { getMagicalResponse } from './services/geminiService';
import { Send, Sparkles, Heart, ChevronRight, Camera as CameraIcon, CameraOff, Volume2, VolumeX, ArrowRight } from 'lucide-react';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

function SceneContent({ stage, activeWishes, onWishReached, isBurst, gestureScale, isHandOpen, mouseRotation, zoomLevel }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((state, delta) => {
    if (groupRef.current) {
      const currentScale = groupRef.current.scale.x;
      const target = gestureScale;
      const nextScale = currentScale + (target - currentScale) * 0.1;
      groupRef.current.scale.set(nextScale, nextScale, nextScale);
      groupRef.current.rotation.y += (mouseRotation.current - groupRef.current.rotation.y) * 0.05;
    }
    if (camera) {
      camera.position.z += (zoomLevel.current - camera.position.z) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <ParticleTree isTree={stage === 'MAIN' && !isHandOpen} gestureScale={1} />
      {activeWishes.map((wish: any) => (
        <WishingBall key={wish.id} onReached={() => onWishReached(wish.id)} />
      ))}
      {stage === 'MAIN' && (
        <mesh position={[0, 2.3, 0]}>
          <octahedronGeometry args={[0.15, 0]} />
          <meshStandardMaterial 
            color={THEME.gold} 
            emissive={THEME.gold} 
            emissiveIntensity={isBurst ? 50 : 5} 
            toneMapped={false}
          />
          <pointLight color={THEME.gold} intensity={isBurst ? 10 : 2} distance={10} />
        </mesh>
      )}
    </group>
  );
}

export default function App() {
  const [stage, setStage] = useState<AppStage>('INTRO');
  const [activeWishes, setActiveWishes] = useState<ActiveWish[]>([]);
  const [inputText, setInputText] = useState("");
  const [isBurst, setIsBurst] = useState(false);
  const [lastAIResponse, setLastAIResponse] = useState<WishResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [gestureScale, setGestureScale] = useState(1);
  const [isHandOpen, setIsHandOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsInstance = useRef<any>(null);
  const cameraInstance = useRef<any>(null);
  const isMPReady = useRef(false);

  const mouseRotation = useRef(0);
  const zoomLevel = useRef(7);
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);

  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 使用《圣诞快乐劳伦斯先生》钢琴曲，契合思念与冬日的氛围
    const audio = new Audio('https://ia801602.us.archive.org/3/items/ryuichi-sakamoto-merry-christmas-mr.-lawrence/Ryuichi%20Sakamoto%20-%20Merry%20Christmas%20Mr.%20Lawrence.mp3'); 
    audio.loop = true;
    audio.volume = 0.45;
    audioRef.current = audio;
    return () => { audio.pause(); };
  }, []);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(() => {});
        setIsMuted(false);
      } else {
        audioRef.current.pause();
        setIsMuted(true);
      }
    }
  };

  const showLetter = () => {
    setStage('LETTER');
    if (audioRef.current && !isMuted) {
      audioRef.current.play().catch(() => {});
    }
  };

  const startExperience = () => {
    setStage('MAIN');
  };

  useEffect(() => {
    let isMounted = true;

    const cleanup = async () => {
      isMPReady.current = false;
      if (cameraInstance.current) {
        try { await cameraInstance.current.stop(); } catch(e) {}
        cameraInstance.current = null;
      }
      if (handsInstance.current) {
        try { await handsInstance.current.close(); } catch(e) {}
        handsInstance.current = null;
      }
    };

    if (!cameraEnabled) {
      cleanup();
      return;
    }

    const init = async () => {
      try {
        if (!window.Hands || !window.Camera) return;

        const hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results: any) => {
          if (!isMounted || !isMPReady.current) return;
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const wrist = landmarks[0];
            const dist = (p1: any, p2: any) => Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
            const handOpenness = (dist(landmarks[8], wrist) + dist(landmarks[12], wrist) + dist(landmarks[16], wrist)) / 3;
            const isOpen = handOpenness > 0.28;
            setIsHandOpen(isOpen);
            setGestureScale(isOpen ? 3 : 1);
            mouseRotation.current = -(wrist.x - 0.5) * 4;
          } else {
            setGestureScale(1);
            setIsHandOpen(false);
          }
        });

        if (videoRef.current) {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (isMounted && isMPReady.current && handsInstance.current && videoRef.current) {
                try {
                  await handsInstance.current.send({ image: videoRef.current });
                } catch (e) {}
              }
            },
            width: 640,
            height: 480
          });
          
          handsInstance.current = hands;
          cameraInstance.current = camera;
          
          await camera.start();
          if (isMounted) isMPReady.current = true;
        }
      } catch (err) {
        console.error("MP Init Fail:", err);
        if (isMounted) setCameraEnabled(false);
      }
    };

    init();
    return () => {
      isMounted = false;
      cleanup();
    };
  }, [cameraEnabled]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouseX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastMouseX.current;
    mouseRotation.current += deltaX * 0.01;
    lastMouseX.current = e.clientX;
  };

  const handleMouseUp = () => { isDragging.current = false; };
  const handleWheel = (e: React.WheelEvent) => {
    zoomLevel.current = Math.max(3, Math.min(15, zoomLevel.current + e.deltaY * 0.005));
  };

  const triggerWish = async () => {
    if (!inputText.trim() || isProcessing) return;
    setIsProcessing(true);
    const wishId = Date.now();
    setActiveWishes(prev => [...prev, { id: wishId, text: inputText }]);
    const currentInput = inputText;
    setInputText("");
    const response = await getMagicalResponse(currentInput);
    setLastAIResponse(response);
    setIsProcessing(false);
  };

  const onWishReached = useCallback((id: number) => {
    setActiveWishes(prev => prev.filter(w => w.id !== id));
    setIsBurst(true);
    setTimeout(() => setIsBurst(false), 1500);
  }, []);

  return (
    <div 
      className="relative w-screen h-screen bg-[#020202] text-white overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <video ref={videoRef} className="hidden" playsInline muted />

      <div className="absolute top-6 right-6 z-50 pointer-events-auto flex gap-3">
        <button 
          onClick={toggleMusic}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-[#D4AF37]/40 bg-black/40 text-[#D4AF37] backdrop-blur-md hover:bg-[#D4AF37]/10 transition-all shadow-lg"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
        </button>
        <button 
          onClick={() => setCameraEnabled(!cameraEnabled)}
          className={`flex items-center gap-2 px-5 py-2 rounded-full border backdrop-blur-md transition-all shadow-lg group ${
            cameraEnabled ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-[#D4AF37]/40 bg-black/40 text-[#D4AF37]'
          }`}
        >
          {cameraEnabled ? <CameraOff className="w-4 h-4" /> : <CameraIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />}
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase hidden md:inline">
            {cameraEnabled ? 'Disable Tracking' : 'Enable Camera'}
          </span>
        </button>
      </div>

      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}>
          <color attach="background" args={[THEME.bg]} />
          <PerspectiveCamera makeDefault fov={50} />
          <ambientLight intensity={0.4} />
          <pointLight position={[0, 5, 5]} intensity={1} color={THEME.gold} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Snow />
          <SceneContent 
            stage={stage} 
            activeWishes={activeWishes} 
            onWishReached={onWishReached} 
            isBurst={isBurst} 
            gestureScale={gestureScale}
            isHandOpen={isHandOpen}
            mouseRotation={mouseRotation}
            zoomLevel={zoomLevel}
          />
          <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={1.2} intensity={1.2} mipmapBlur luminanceSmoothing={0.5} />
            <NuttyNoise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Canvas>
      </div>

      <div className="absolute inset-0 pointer-events-none z-10">
        {stage === 'INTRO' && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 bg-gradient-to-b from-black/20 via-black/40 to-black/60 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-1000">
            <h1 className="font-dancing text-6xl md:text-8xl text-[#D4AF37] text-center drop-shadow-[0_0_20px_rgba(212,175,55,0.4)] px-4 leading-tight">
              Merry Christmas,<br />Miss Yan
            </h1>
            <p className="text-gray-300 text-lg md:text-xl tracking-widest uppercase font-light">
              Send your heart to the stars
            </p>
            <button 
              onClick={showLetter}
              className="mt-8 px-12 py-4 border border-[#D4AF37] text-[#D4AF37] rounded-full hover:bg-[#D4AF37] hover:text-black transition-all duration-500 tracking-[0.4em] text-xs group flex items-center gap-4 bg-black/20"
            >
              ILLUMINATE
              <ChevronRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        )}

        {stage === 'LETTER' && (
          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-black/20 via-black/40 to-black/60 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-1000 overflow-y-auto pt-20 pb-10">
            <div className="max-w-2xl w-[90%] mx-auto bg-black/40 backdrop-blur-lg border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="relative">
                <div className="absolute -top-4 -left-4"><Heart className="text-[#FFB6C1] w-6 h-6 fill-[#FFB6C1]/20 opacity-60" /></div>
                <div className="text-gray-100 text-base md:text-lg leading-relaxed font-light text-left tracking-wide">
                  <span className="block mb-6 font-bold text-[#D4AF37] text-xl">TO：严易禾</span>
                  这棵树本该在昨天与你见面，但笨拙的代码像我改不掉的拖延症一样，让这份礼物迟到了。以前总是让你等待，而你总是温柔包容。<br /><br />
                  在北京的日子，我总是格外想念你们，只是怕打扰你新生活的节奏，才把这份想念藏在心底。虽然我无法跨越距离去拥抱你，但我为你种下了一棵永不凋零的“粒子圣诞树”。<br /><br />
                  迟到的圣诞快乐，无论距离多远，我永远是你最好的朋友，永远在你身后。照顾好自己。<br />
                  <span className="block text-right font-bold text-[#D4AF37] text-xl mt-4">—— 龚依菲</span>
                </div>
                <div className="absolute -bottom-4 -right-4"><Sparkles className="text-[#D4AF37] w-6 h-6 opacity-60" /></div>
              </div>
            </div>

            <button 
              onClick={startExperience}
              className="mt-12 px-12 py-4 border border-[#D4AF37] text-[#D4AF37] rounded-full hover:bg-[#D4AF37] hover:text-black transition-all duration-500 tracking-[0.4em] text-xs group flex items-center gap-4 bg-black/40 backdrop-blur-sm shadow-[0_0_20px_rgba(212,175,55,0.2)]"
            >
              ENTER MAGICAL WORLD
              <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        )}

        {stage === 'MAIN' && (
          <div className="relative h-full w-full flex flex-col justify-between p-8">
            <header className="flex justify-between items-start">
              <div className="flex flex-col">
                <h2 className="font-dancing text-3xl text-[#D4AF37]">Merry Christmas</h2>
                <div className="h-px w-24 bg-gradient-to-r from-[#D4AF37] to-transparent mt-1" />
              </div>
              <Sparkles className="text-[#D4AF37] opacity-50 animate-pulse" />
            </header>

            {lastAIResponse && !isBurst && (
              <div className="max-w-md mx-auto pointer-events-auto animate-in slide-in-from-bottom-10 duration-700">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-7 rounded-2xl shadow-2xl relative">
                  <div className="absolute -top-3 -left-3"><Heart className="text-[#FFB6C1] w-5 h-5 fill-[#FFB6C1]/20 animate-pulse" /></div>
                  <p className="text-lg leading-relaxed text-gray-200 font-light italic">"{lastAIResponse.message}"</p>
                  <p className="mt-5 text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] font-bold text-right">— {lastAIResponse.magicalNote}</p>
                </div>
              </div>
            )}

            <div className="max-w-lg w-full mx-auto pointer-events-auto pb-12">
              <div className="relative group">
                <input 
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && triggerWish()}
                  placeholder="Whisper your Christmas wish..."
                  className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-8 py-5 pr-16 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all text-gray-200 placeholder:text-gray-500 shadow-2xl"
                  disabled={isProcessing}
                />
                <button 
                  onClick={triggerWish}
                  disabled={!inputText.trim() || isProcessing}
                  className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-[#D4AF37] rounded-full text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-center mt-5 text-[9px] tracking-[0.3em] text-gray-500 uppercase font-medium">
                {cameraEnabled ? "Open your palm to explode the tree into magic" : "Click and drag to rotate • Scroll to zoom"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to fix the Noise component name in EffectComposer if needed
const NuttyNoise = Noise as any;
