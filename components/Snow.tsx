
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Snow: React.FC = () => {
  const count = 10000; // High density for heavy snowfall
  const pointsRef = useRef<THREE.Points>(null);

  // Pre-calculate positions, drift speeds, and random sizes
  const [positions, driftSpeeds, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const drift = new Float32Array(count);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.set([
        (Math.random() - 0.5) * 40, // Extra wide spread
        (Math.random() - 0.5) * 30, // Taller spawn area
        (Math.random() - 0.5) * 35  // Deep Z-range for layers
      ], i * 3);
      drift[i] = Math.random() * 1.5 + 0.5;
      sz[i] = Math.random() * 0.08 + 0.02; // Larger range of sizes
    }
    return [pos, drift, sz];
  }, []);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points || !points.geometry) return;
    
    const attr = points.geometry.attributes.position as THREE.BufferAttribute;
    if (!attr || !attr.array) return;

    const posArray = attr.array as Float32Array;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      // 1. Vertical fall (varied speeds for realism)
      posArray[i * 3 + 1] -= delta * (0.5 + driftSpeeds[i] * 0.3); 
      
      // 2. Horizontal sway (gentle winter wind)
      posArray[i * 3] += Math.sin(time * 0.4 + driftSpeeds[i]) * 0.004;

      // 3. Looping reset when flakes fall below view
      if (posArray[i * 3 + 1] < -15) {
        posArray[i * 3 + 1] = 15;
        // Keep some randomness in the reset spread
        posArray[i * 3] = (Math.random() - 0.5) * 40;
      }
    }
    attr.needsUpdate = true;
    
    // Twinkling shimmer effect
    if (points.material instanceof THREE.PointsMaterial) {
      points.material.opacity = 0.6 + Math.sin(time * 1.5) * 0.2;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={count} 
          array={positions} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        color="#FFFDF5" // Warm "Starry" White
        size={0.06}    // Larger base size
        transparent 
        opacity={0.7} 
        sizeAttenuation 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default Snow;
