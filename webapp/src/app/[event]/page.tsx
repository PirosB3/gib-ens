"use client";

import { redirect } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAccount, useConnect } from "wagmi";

interface HomeProps {
    params: {
        event: string;
    }
}

export default function Page({ params }: HomeProps) {
    const { address } = useAccount();
    const { connect, connectors } = useConnect();

    useEffect(() => {
        if (!address) return;
        redirect(`/${params.event}/${address}`)
    }, [params.event, address])
    const isDisconnected = true;

    const content = useMemo(() => {
        if (isDisconnected) {
            return (
                <div className="flex-row">
                    <p className="text-gray-600 mt-2 text-center">Please connect your wallet to continue using our platform.</p>
                    <button onClick={() => connect({ connector: connectors[0] })} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full mt-3">
                        🍀 Log in
                    </button>
                </div>
            )
        }
        return (
            <div>
                <p className="text-yellow-800 mt-2 text-center">Redirecting ⌛️</p>
            </div>
        );
    }, [isDisconnected])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-xl font-bold mt-4 text-center">Connect Your Wallet</h2>
                {content}
            </div>
        </div>
    );
}