"use client"

import React, { useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import Link from 'next/link';
import { useGetPublicPolicyContext } from './context';

export function Header() {
    const { eventName, policyId } = useGetPublicPolicyContext();
    const { address } = useAccount();
    const { disconnect } = useDisconnect();
    const { connect, connectors } = useConnect();

    // https://nextjs.org/docs/messages/react-hydration-error
    // Avoid Next.js hydration mismatch error
    const [isClient, setIsClient] = React.useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);
    const walletIsLoaded = isClient && address;

    return (
        <nav className="bg-blue-600 p-4 text-white">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-semibold">
                    <Link href={`/${policyId}`}>{eventName}</Link>
                </h1>

                {walletIsLoaded ? (
                    <div className="flex items-center">
                        <span className="mr-4">{address}</span>
                        <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={() => disconnect()}>
                            Logout
                        </button>
                    </div>
                ) : (
                    <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onClick={() => connect({ connector: connectors[0] })}> Login with 🦊 </button>
                )}
            </div>
        </nav>
    )
}
