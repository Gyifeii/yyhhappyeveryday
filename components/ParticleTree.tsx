
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { THEME } from '../types';

interface ParticleTreeProps {
  isTree: boolean;
  gestureScale: number;
}

const ParticleTree: React.FC<ParticleTreeProps> = ({ isTree, gestureScale }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 6000;

  const [scattered, treePositions, colors] = useMemo(() => {
    const s = new Float32Array(count * 3);
    const t = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 8 + Math.random() * 4;
      s.set([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ], i * 3);

      const h = Math.random() * 4.5;
      const angle = Math.random() * Math.PI * 2;
      const tProgress = h / 4.5;
      const baseRadius = 1.8;
      const radius = (1 - tProgress) * baseRadius * Math.sqrt(Math.random());
      
      t.set([
        Math.cos(angle) * radius,
        h - 2.2,
        Math.sin(angle) * radius
      ], i * 3);

      const rand = Math.random();
      let colorStr = THEME.emerald; 
      if (rand > 0.94) colorStr = THEME.festiveRed;
      else if (rand > 0.82) colorStr = THEME.gold;
      
      const color = new THREE.Color(colorStr);
      c.set([color.r, color.g, color.b], i * 3);
    }
    return [s, t, c];
  }, []);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points || !points.geometry) return;
    
    const attr = points.geometry.attributes.position as THREE.BufferAttribute;
    if (!attr || !attr.array) return;

    const target = isTree ? treePositions : scattered;
    const lerpFactor = isTree ? 0.04 : 0.02;
    const posArray = attr.array as Float32Array;
    
    if (posArray.length !== target.length) return;

    for (let i = 0; i < posArray.length; i++) {
      posArray[i] += (target[i] - posArray[i]) * lerpFactor;
    }
    attr.needsUpdate = true;

    points.rotation.y += delta * 0.1;
    points.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;

    const s = THREE.MathUtils.lerp(points.scale.x, gestureScale, 0.1);
    points.scale.set(s, s, s);
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={count} 
          array={scattered} 
          itemSize={3} 
        />
        <bufferAttribute 
          attach="attributes-color" 
          count={count} 
          array={colors} 
          itemSize={3} 
        />
      </bufferGeometry>
      <PointMaterial 
        vertexColors
        transparent 
        size={0.035} 
        sizeAttenuation={true} 
        depthWrite={false} 
        blending={THREE.AdditiveBlending}
        opacity={0.8}
      />
    </points>
  );
};

export default ParticleTree;
