
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../types';

interface WishingBallProps {
  onReached: () => void;
}

const WishingBall: React.FC<WishingBallProps> = ({ onReached }) => {
  const ballRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  
  // Random start position from below/side
  const [start] = useState(() => new THREE.Vector3(
    (Math.random() - 0.5) * 6, 
    -5, 
    (Math.random() - 0.5) * 4
  ));
  
  const [target] = useState(new THREE.Vector3(0, 1.8, 0)); // Tree top
  const [progress, setProgress] = useState(0);

  useFrame((_, delta) => {
    if (progress < 1) {
      const nextProgress = progress + delta * 0.45; // Speed of the wish
      setProgress(nextProgress);
      
      if (ballRef.current) {
        // Smooth lerp for position
        ballRef.current.position.lerpVectors(start, target, nextProgress);
        
        // Add a vertical arc effect
        const arc = Math.sin(nextProgress * Math.PI) * 2;
        ballRef.current.position.y += arc;
        
        // Pulse scale
        const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;
        ballRef.current.scale.setScalar((1 - nextProgress * 0.5) * pulse);
      }
    } else {
      onReached();
    }
  });

  return (
    <group>
      <mesh ref={ballRef}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color={THEME.wishCore} 
          emissive={THEME.wishCore} 
          emissiveIntensity={15} 
          toneMapped={false} 
        />
        <pointLight ref={glowRef} color={THEME.wishCore} intensity={2} distance={5} />
      </mesh>
    </group>
  );
};

export default WishingBall;
