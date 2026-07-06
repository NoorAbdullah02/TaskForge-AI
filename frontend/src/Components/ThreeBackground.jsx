import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function Particles({ color = '#6366f1', count = 600 }) {
  const pointsRef = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.025;
      pointsRef.current.rotation.x = clock.elapsedTime * 0.012;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.055} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

function FloatingTorus({ color = '#6366f1' }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.2) * 0.4;
      ref.current.rotation.y = clock.elapsedTime * 0.12;
    }
  });
  return (
    <mesh ref={ref} position={[4, -2, -8]}>
      <torusGeometry args={[4, 0.025, 16, 120]} />
      <meshBasicMaterial color={color} transparent opacity={0.1} />
    </mesh>
  );
}

function FloatingOctahedron({ color = '#6366f1' }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.x = clock.elapsedTime * 0.4;
      ref.current.rotation.y = clock.elapsedTime * 0.3;
      ref.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.3 - 1;
    }
  });
  return (
    <mesh ref={ref} position={[-5, -1, -6]}>
      <octahedronGeometry args={[1.5]} />
      <meshBasicMaterial color={color} transparent opacity={0.06} wireframe />
    </mesh>
  );
}

export default function ThreeBackground({ primaryColor = '#6366f1' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }} gl={{ alpha: true, antialias: true }} style={{ background: 'transparent' }}>
        <Particles color={primaryColor} count={500} />
        <FloatingTorus color={primaryColor} />
        <FloatingOctahedron color={primaryColor} />
      </Canvas>
    </div>
  );
}
