"use client"

import { CompleteOperation, DomainRedeemOperation, ReadyOperation } from "@/base/userOps/base";
import { useSignUserOperation, useGetJobStatus } from "./base";
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



function Spinner() {
    return <div className="flex justify-center items-center mt-4">
        <svg aria-hidden="true" className="w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
        </svg>
    </div>;
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
