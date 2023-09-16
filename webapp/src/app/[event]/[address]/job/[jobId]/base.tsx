"use client"

import { DomainRedeemOperation, Operation, ReadyOperation } from "@/base/userOps/base";
import { useState } from "react";
import { useMutation, useQuery } from "react-query";
import { useWalletClient } from "wagmi";
import { GetWalletClientResult } from "wagmi/actions";
import { Account } from "viem";
import { UserOperationStruct } from "@/base/types";


interface RequestOptions {
    id: number,
    jsonrpc: '2.0',
    method: 'eth_sendUserOperation',
    params: [UserOperationStruct, string]
}

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
const JOB_REFRESH_MS = 5_000;


export const useGetJobStatus = (operation: DomainRedeemOperation, taskId: string) => {
    const [isComplete, setIsComplete] = useState(false);
    return useQuery(["redeem", operation.id, taskId], async () => {
        const query = await fetch(`/api/event/${operation.params.policyId}/job/${operation.id}/step/${taskId}`);
        const data: Operation = await query.json();
        if (data.status === "complete") setIsComplete(true);
        return data;
    }, {
        refetchInterval: JOB_REFRESH_MS,
        enabled: isComplete === false,
    });
}


// 1. Signature Signing Function
async function signMessage(walletClient: GetWalletClientResult, operation: ReadyOperation, redeem: DomainRedeemOperation) {
    const signedMessage = await walletClient?.signMessage({
        message: {
            raw: Buffer.from(operation.hash.split('0x')[1], 'hex'),
        },
        account: redeem.params.owner as any as Account,
    });
    if (!signedMessage) throw new Error("Could not sign message");
    return signedMessage;
}

// 2. Make Request Function
async function makeRequest(signedMessage: string, operation: ReadyOperation) {
    const requestOptions: RequestOptions = {
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_sendUserOperation',
        params: [
            {
                ...operation.userOp,
                signature: signedMessage
            },
            ENTRYPOINT,
        ]
    };
    const response = await fetch(process.env.NEXT_PUBLIC_RPC_URL!, {
        method: 'POST',
        body: JSON.stringify(requestOptions),
    });
    const json = await response.json();
    if (json.error) {
        throw new Error(json.error.message);
    }
    return true;
}

// Custom Hook: useSignUserOperation
export function useSignUserOperation(
    data: Operation | undefined,
    taskId: string,
    redeem: DomainRedeemOperation,
    operation: ReadyOperation
) {
    const { data: walletClient } = useWalletClient();

    return useMutation({
        mutationKey: ["submit", taskId],
        mutationFn: async () => {
            if (data?.status !== "ready") throw new Error("Operation is not ready");
            if (walletClient?.account.address.toLowerCase() !== redeem.params.owner.toLowerCase()) throw new Error("Wallet account does not match operation owner");

            const signedMessage = await signMessage(walletClient, operation, redeem);
            return await makeRequest(signedMessage, operation);
        },
    });
}
