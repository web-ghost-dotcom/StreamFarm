'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Stars } from '@react-three/drei'
import { useRef, useMemo, useState } from 'react'
import * as THREE from 'three'

// Simple rotating leaf for testing
function TestLeaf() {
    const meshRef = useRef<THREE.Mesh>(null)

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
        }
    })

    return (
        <mesh ref={meshRef} position={[0, 0, 0]}>
            <boxGeometry args={[1, 2, 0.1]} />
            <meshStandardMaterial color="#16a34a" />
        </mesh>
    )
}

// Leaf shape component
interface LeafProps {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    color: string;
}

function Leaf({ position, rotation, scale, color }: LeafProps) {
    const meshRef = useRef<THREE.Mesh>(null)

    // Create leaf shape using bezier curve
    const leafShape = useMemo(() => {
        const shape = new THREE.Shape()
        shape.moveTo(0, 0)
        shape.bezierCurveTo(0.3, 0.5, 0.5, 1, 0, 1.5)
        shape.bezierCurveTo(-0.5, 1, -0.3, 0.5, 0, 0)
        return shape
    }, [])

    return (
        <Float
            speed={1.5}
            rotationIntensity={0.6}
            floatIntensity={0.8}
        >
            <mesh
                ref={meshRef}
                position={position}
                rotation={rotation}
                scale={scale}
            >
                <shapeGeometry args={[leafShape]} />
                <meshStandardMaterial
                    color={color}
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0.7}
                    roughness={0.4}
                    metalness={0.1}
                />
            </mesh>
        </Float>
    )
}

// Plant stem component
interface PlantStemProps {
    position: [number, number, number];
    scale: number;
}

function PlantStem({ position, scale }: PlantStemProps) {
    return (
        <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
            <group position={position}>
                {/* Stem */}
                <mesh position={[0, 0, 0]} scale={scale}>
                    <cylinderGeometry args={[0.05, 0.08, 2, 8]} />
                    <meshStandardMaterial color="#2d5016" roughness={0.8} />
                </mesh>

                {/* Top leaves */}
                <Leaf
                    position={[0.3, 0.8, 0]}
                    rotation={[0, 0, Math.PI / 6]}
                    scale={0.4}
                    color="#4ade80"
                />
                <Leaf
                    position={[-0.3, 0.6, 0]}
                    rotation={[0, 0, -Math.PI / 6]}
                    scale={0.35}
                    color="#86efac"
                />
                <Leaf
                    position={[0, 1, 0.2]}
                    rotation={[Math.PI / 6, 0, 0]}
                    scale={0.3}
                    color="#22c55e"
                />
            </group>
        </Float>
    )
}

// Floating particles
function Particles() {
    const count = 150
    const particlesRef = useRef<THREE.Points>(null)

    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 50
            pos[i * 3 + 1] = (Math.random() - 0.5) * 50
            pos[i * 3 + 2] = (Math.random() - 0.5) * 30
        }
        return pos
    })

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        return geo
    }, [positions])

    return (
        <points ref={particlesRef} geometry={geometry}>
            <pointsMaterial
                size={0.15}
                color="#86efac"
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    )
}

// Main scene
function Scene() {
    // Generate random positions for leaves
    const [leaves] = useState(() => {
        const leafCount = 25
        return Array.from({ length: leafCount }, () => ({
            position: [
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
            ] as [number, number, number],
            rotation: [
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI,
            ] as [number, number, number],
            scale: Math.random() * 0.5 + 0.3,
            color: ['#166534', '#15803d', '#16a34a', '#14532d'][Math.floor(Math.random() * 4)],
        }))
    })

    // Generate random positions for plants
    const [plants] = useState(() => {
        const plantCount = 12
        return Array.from({ length: plantCount }, () => ({
            position: [
                (Math.random() - 0.5) * 35,
                (Math.random() - 0.5) * 15 - 3,
                (Math.random() - 0.5) * 25,
            ] as [number, number, number],
            scale: Math.random() * 0.6 + 0.4,
        }))
    })

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={0.8} color="#d4d4d8" />
            <pointLight position={[-10, -10, -5]} intensity={0.5} color="#16a34a" />

            {/* Test leaf - visible for debugging */}
            <TestLeaf />

            {/* Background stars */}
            <Stars
                radius={100}
                depth={50}
                count={3000}
                factor={4}
                saturation={0}
                fade
                speed={0.5}
            />

            {/* Floating leaves */}
            {leaves.map((leaf, i) => (
                <Leaf key={`leaf-${i}`} {...leaf} />
            ))}

            {/* Plant stems */}
            {plants.map((plant, i) => (
                <PlantStem key={`plant-${i}`} {...plant} />
            ))}

            {/* Particles */}
            <Particles />
        </>
    )
}

export function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 w-full h-screen">
            <Canvas
                camera={{ position: [0, 0, 15], fov: 60 }}
                style={{
                    width: '100%',
                    height: '100vh',
                    background: 'linear-gradient(to bottom, #0a0f1a 0%, #0f1419 40%, #0d2818 70%, #0a1f1a 100%)'
                }}
                gl={{ alpha: false, antialias: true }}
                dpr={[1, 2]}
            >
                <Scene />
            </Canvas>
        </div>
    )
}
