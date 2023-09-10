"use client"

import { PropsWithChildren, useState } from "react"
import { QueryClient, QueryClientProvider } from "react-query";

export function Frontend({children}: PropsWithChildren) {
    const [client] = useState(new QueryClient());
    return (
        <QueryClientProvider client={client}>
          {children}
        </QueryClientProvider>
    )
}