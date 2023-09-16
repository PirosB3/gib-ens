"use client"

import { CompleteOperation, DomainRedeemOperation, ReadyOperation } from "@/base/userOps/base";
import { useSignUserOperation, useGetJobStatus, Spinner } from "./base";
import { PropsWithChildren } from "react";


export interface ENSCommitmentWidgetProps {
    operation: DomainRedeemOperation,
    taskIdx: number,
}

export function CompleteENSCommitmentWidget(props: ENSCommitmentWidgetProps & { data: CompleteOperation }) {
    const task = props.operation.userOps[props.taskIdx];
    if (!task) throw new Error("Task not found")
    return (
        <div className="max-w mx-auto mt-4">
            <a href="#" className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
                <div className="bg-green-500 text-white p-2">
                    <h1 className="text-2xl">Step 1 - Commitment Successful!</h1>
                </div>
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">ENS Domain Commitment</h2>
                    <p className="text-gray-600 mb-4">Congratulations! Your commitment to register the ENS name has been successfully processed. You are now one step closer to owning your desired domain name.</p>

                    {props.data.userOpHash ? (
                        <a href={`https://www.jiffyscan.xyz/userOpHash/${props.data.userOpHash}`} className="text-green-500 hover:underline mb-4 block">View the final User Operation on Etherscan</a>
                    ) : null}
                    <div className="text-green-600 border border-green-500 p-2 rounded">
                    </div>
                </div>
            </a>
        </div>
    );
}

export function ReadyENSCommitmentWidget(props: ENSCommitmentWidgetProps & { data: ReadyOperation }) {
    const task = props.operation.userOps[props.taskIdx];
    if (!task) throw new Error("Task not found")

    const signMessageMutation = useSignUserOperation(props.data, task.id, props.operation, props.data);

    let innerContent;
    if (signMessageMutation.isSuccess) {
        innerContent = (
            <div className="p-6">
                <svg className="animate-spin h-5 w-5 mr-3 ..." viewBox="0 0 24 24"></svg>
                <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Commitment Process In Progress</h2>
                <p className="text-gray-600 mb-4">Your commitment to register the ENS name is currently in progress. A User Operation has been sent to ensure the registration process is underway. </p>
                <a target="_blank" href={`https://www.jiffyscan.xyz/userOpHash/${props.data.hash}`} className="text-blue-500 hover:underline mb-4 block">View your User Operation on Etherscan</a>
                <Spinner />
            </div>
        )
    } else {
        innerContent = (
            <div className="p-6">
                <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Commitment Process</h2>
                <p className="text-gray-600 mb-4">Initiate your intent to register an ENS name. This commitment ensures that users are sincere about their desired domain, preventing instant domain squatting.</p>
                <button onClick={(e) => signMessageMutation.mutate()} className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition-colors duration-200">Begin commitment process</button>
            </div>
        )
    }


    return (
        <div className="max-w mx-auto">
            <div className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
                <div className="bg-blue-500 text-white p-2">
                    <h1 className="text-2xl">Step 1 - Commit to ENS Domain</h1>
                </div>
                {innerContent}
                <div className="px-6 py-2 bg-gray-100">
                    <p className="text-sm text-gray-600">You will be asked to sign a message, we pay the gas.</p>
                </div>
            </div>
        </div>
    )
}

export function LoadingWidget(params: PropsWithChildren<{ title: string }>) {
    return (
        <div className="max-w mx-auto mt-4">
            <div className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
                <div className="bg-gray-300 text-white p-2">
                    <h1 className="text-2xl">{params.title}</h1>
                </div>
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Please Wait</h2>
                    <Spinner />
                </div>
            </div>
        </div>

    )
}


export function ENSCommitmentWidget(props: ENSCommitmentWidgetProps) {
    console.log("ENSCommitmentWidget", props)
    const task = props.operation.userOps[props.taskIdx];
    if (!task) throw new Error("Task not found")

    const { data } = useGetJobStatus(props.operation, task.id);
    if (data?.status === "ready") {
        return <ReadyENSCommitmentWidget {...props} data={data} />
    }
    if (data?.status === "complete") {
        return <CompleteENSCommitmentWidget {...props} data={data} />
    }
    return <LoadingWidget title="Step 1 - Commit to ENS Domain" />
}
