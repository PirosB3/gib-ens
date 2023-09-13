"use client"

import { UserOperationStruct } from "@/base/types";
import { DomainRedeemOperation, Operation, ReadyOperation } from "@/base/userOps/base"
import { useState } from "react";
import { useMutation } from "react-query";
import { Client, UserOperationBuilder } from "userop";
import { useQuery, useWalletClient } from "wagmi"

export interface JobWidgetProps {
    operation: DomainRedeemOperation,
    taskIdx: number,
}

const TaskTypeToLabel = {
    'ensCommitment': 'Perform commitment of ENS domain.',
    'completeENSRegistration': 'Complete your ENS registration (available 75 seconds after commitment)'
}


interface RequestOptions {
    id: number,
    jsonrpc: '2.0',
    method: 'eth_sendUserOperation',
    params: [UserOperationStruct, string]
}



export function JobWidget(props: JobWidgetProps) {
    const task = props.operation.userOps[props.taskIdx];
    if (!task) throw new Error("Task not found")

    const [isComplete, setIsComplete] = useState(false);
    const { data: walletClient, isLoading: walletIsLoading } = useWalletClient();
    const { isLoading, data } = useQuery(["redeem", props.operation.id, task.id], async () => {
        const query = await fetch(`/api/event/${props.operation.params.policyId}/job/${props.operation.id}/step/${task.id}`);
        const data: Operation = await query.json();
        if (data.status === "complete") setIsComplete(true);
        return data;
    }, {
        refetchInterval: 10_000,
        enabled: isComplete === false,
    });

    const signMessageMutation = useMutation({
        mutationKey: ["submit", task.id],
        mutationFn: async (operation: ReadyOperation) => {
            const signedMessage = await walletClient?.signMessage({
                message: {
                    raw: Buffer.from(operation.hash.split('0x')[1], 'hex'),
                },
                account: props.operation.params.owner as any,
            });
            if (!signedMessage) throw new Error("Could not sign message");
            
            const requestOptions: RequestOptions = {
                id: 1,
                jsonrpc: '2.0',
                method: 'eth_sendUserOperation',
                params: [
                    {
                        ...operation.userOp,
                        signature: signedMessage
                    },
                    '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
                ]
            };
            const response = await fetch(process.env.NEXT_PUBLIC_RPC_URL!, {
                method: 'POST',
                body: JSON.stringify(requestOptions),
            });
            const json = await response.json();
        },
    });

    const onSignButtonClick = async () => {
        if (data?.status !== "ready") return;
        const signature = await signMessageMutation.mutateAsync(data);
        const client = await Client.init(process.env.NEXT_PUBLIC_RPC_URL!);

        const builder = new UserOperationBuilder();
    }

    const taskLabel = TaskTypeToLabel[task.type] ?? "N/A";
    let content;
    if (!walletIsLoading && walletClient?.account.address !== props.operation.params.owner) {
        content = (
            <div className="flex items-center">
                <span className="text-red-500">Status: not owner</span>
                <p>Please select account {props.operation.params.owner} from your wallet</p>
            </div>
        )
    } else if (isLoading) {
        content = (
            <div>
                <h3>Loading</h3>
            </div>
        );
    } else if (data?.status === "ready") {
        content = (
            <div className="flex items-center">
                <span className="text-green-500">Status: ready</span>
                <button onClick={onSignButtonClick} className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Click to start
                </button>
            </div>
        );
    } else if (data?.status === "pending") {
        content = (
            <div className="flex items-center">
                <span className="text-yellow-500">Status: pending on previous actions</span>
            </div>
        );
    } else if (data?.status === "complete") {
        content = (
            <div className="flex items-center">
                <span className="text-green-500">Status: complete</span>
            </div>
        );
    }

    return (
        <div className="mb-4">
            <div className="flex items-center mb-2">
                <span className="text-lg">Step {props.taskIdx + 1}:</span>
                <span className="ml-2">{taskLabel}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Explanation: this is needed to perform the registration</p>
            {content}
        </div>
    )
}