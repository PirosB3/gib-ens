"use client"

import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useGetPublicPolicyContext } from './frontend';

export function Header() {
    const { eventName, networkId } = useGetPublicPolicyContext();
    const { address } = useAccount();
    const { disconnect } = useDisconnect();
    const { connect, connectors } = useConnect();

    return (
        <nav className="bg-blue-600 p-4 text-white">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-semibold">{eventName}</h1>

                {address ? (
                    <div className="flex items-center">
                        <span className="mr-4">{address}</span>
                        <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={() => disconnect()}>
                            Logout
                        </button>
                    </div>
                ) : (
                    <button
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        onClick={() => connect({ connector: connectors[0] })}
                    >
                        Login with 🦊
                    </button>
                )}
            </div>
        </nav>
    )
}
