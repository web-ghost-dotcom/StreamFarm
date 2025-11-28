'use client'

import dynamic from 'next/dynamic'

const AnimatedBackground = dynamic(
    () => import('./AnimatedBackground').then(mod => ({ default: mod.AnimatedBackground })),
    { ssr: false }
)

export function AnimatedBackgroundWrapper() {
    return <AnimatedBackground />
}
