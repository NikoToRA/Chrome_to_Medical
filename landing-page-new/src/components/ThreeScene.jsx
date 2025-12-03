import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Simple swirling particles - dark blue background
export function SwirlParticles({ count = 200 }) {
    const points = useRef()
    const velocities = useRef([])

    // Initialize particles in a spiral pattern
    const particlesPosition = new Float32Array(count * 3)
    const particlesVelocity = []

    for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const radius = (i / count) * 8
        const angle = (i / count) * Math.PI * 8

        particlesPosition[i3] = Math.cos(angle) * radius
        particlesPosition[i3 + 1] = (Math.random() - 0.5) * 10
        particlesPosition[i3 + 2] = Math.sin(angle) * radius

        particlesVelocity.push({
            angle: angle,
            radius: radius,
            speed: 0.001 + Math.random() * 0.002
        })
    }

    velocities.current = particlesVelocity

    useFrame((state) => {
        const positions = points.current.geometry.attributes.position.array

        for (let i = 0; i < count; i++) {
            const i3 = i * 3
            const vel = velocities.current[i]

            // Update angle for spiral motion
            vel.angle += vel.speed

            // Spiral motion
            positions[i3] = Math.cos(vel.angle) * vel.radius
            positions[i3 + 2] = Math.sin(vel.angle) * vel.radius

            // Gentle vertical drift
            positions[i3 + 1] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.002

            // Reset if too far
            if (positions[i3 + 1] > 5) positions[i3 + 1] = -5
            if (positions[i3 + 1] < -5) positions[i3 + 1] = 5
        }

        points.current.geometry.attributes.position.needsUpdate = true
    })

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={particlesPosition}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                color="#4A90E2"
                transparent
                opacity={0.6}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    )
}
