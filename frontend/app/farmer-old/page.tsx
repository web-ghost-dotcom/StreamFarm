'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FarmerRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 to-gray-900">
            <div className="text-white text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
                <p className="text-emerald-200">Redirecting to dashboard...</p>
            </div>
        </div>
    );
}
