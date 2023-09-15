"use client"

import { PublicPolicyConfig } from "@/services/policyService";
import { PropsWithChildren, createContext, useContext, useState } from "react"
import { QueryClient, QueryClientProvider } from "react-query";
import { goerli } from "viem/chains";

import { WagmiConfig, configureChains, createConfig, mainnet } from 'wagmi'
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { PublicPolicyContext } from "./context";

const { publicClient, webSocketPublicClient } = configureChains(
  [mainnet, goerli],
  [alchemyProvider({
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY!,
  })],
)

const connector = new MetaMaskConnector({
  chains: [mainnet, goerli],
})

const wagmiConfig = createConfig({
  autoConnect: true,
  publicClient,
  webSocketPublicClient,
  connectors: [connector],
})

interface FrontendProps {
  config: PublicPolicyConfig;
}

export function Frontend({ children, config }: PropsWithChildren<FrontendProps>) {
  const [client] = useState(new QueryClient());
  return (
    <PublicPolicyContext.Provider value={config}>
      <QueryClientProvider client={client}>
        <WagmiConfig config={wagmiConfig}>
          {children}
        </WagmiConfig>
      </QueryClientProvider>
    </PublicPolicyContext.Provider>
  )
}