"use client"

import { DomainRedeemOperation, CompleteOperation, ReadyOperation, PendingOperation } from "@/base/userOps/base";
import { useGetJobStatus, useSignUserOperation } from "./base";
import { LoadingWidget } from "./ensCommitment";

export interface ENSRedeemWidgetProps {
    operation: DomainRedeemOperation,
    taskIdx: number,
}

export function CompleteENSRedeemWidget(props: ENSRedeemWidgetProps & { data: CompleteOperation }) {
    const task = props.operation.userOps[props.taskIdx];
    if (!task) throw new Error("Task not found")
    return (
        <div className="max-w mx-auto mt-4">
            <a href="#" className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
                <div className="bg-green-500 text-white p-2">
                    <h1 className="text-2xl">Step 2 - Redemption Successful!</h1>
                </div>
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">ENS Domain Redemption</h2>
                    <p className="text-gray-600 mb-4">Congratulations! You&apos;ve successfully redeemed your ENS name. Your domain is now fully registered and ready to use.</p>

                    {props.data.userOpHash ? (
                        <a href={`https://www.jiffyscan.xyz/userOpHash/${props.data.userOpHash}`} className="text-green-500 hover:underline mb-4 block">View the final User Operation on Etherscan</a>
                    ) : null}
                    <div className="text-green-600 border border-green-500 p-2 rounded">
                        <p>Your redemption was successful. You can now use your ENS domain!</p>
                    </div>
                </div>
            </a>
        </div>
    );
}

export function ReadyENSRedeemWidget(props: ENSRedeemWidgetProps & { data: ReadyOperation }) {
    const task = props.operation.userOps[props.taskIdx];
    if (!task) throw new Error("Task not found")

    const signMessageMutation = useSignUserOperation(props.data, task.id, props.operation, props.data);

    let innerContent;
    if (signMessageMutation.isSuccess) {
        innerContent = (
            <div className="p-6">
                <svg className="animate-spin h-5 w-5 mr-3 ..." viewBox="0 0 24 24"></svg>
                <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Redemption Process In Progress</h2>
                <p className="text-gray-600 mb-4">Your ENS name redemption is currently in progress. A User Operation has been sent to finalize the registration.</p>
                <a target="_blank" href={`https://www.jiffyscan.xyz/userOpHash/${props.data.hash}`} className="text-blue-500 hover:underline mb-4 block">View your User Operation on Etherscan</a>
            </div>
        )
    } else {
        innerContent = (
            <div className="p-6">
                <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Redemption Process</h2>
                <p className="text-gray-600 mb-4">Proceed to redeem your ENS name to finalize its registration and start using it.</p>
                <button onClick={(e) => signMessageMutation.mutate()} className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition-colors duration-200">Begin redemption process</button>
            </div>
        )
    }


    return (
        <div className="max-w mx-auto">
            <div className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
                <div className="bg-blue-500 text-white p-2">
                    <h1 className="text-2xl">Step 2 - Commit to ENS Domain</h1>
                </div>
                {innerContent}
                <div className="px-6 py-2 bg-gray-100">
                    <p className="text-sm text-gray-600">Ensure all details are correct to successfully redeem your domain.</p>
                </div>
            </div>
        </div>
    )
}

export function PendingENSRedeemWidget(props: ENSRedeemWidgetProps & { data: PendingOperation }) {
    const task = props.operation.userOps[props.taskIdx];
    if (!task) throw new Error("Task not found")

    const { pctComplete, reason } = props.data;
    if (reason === "ensCommitmentNotSettled") {
        return (
            <div className="max-w mx-auto mt-4">
                <a href="#" className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
                    <div className="bg-orange-300 text-white p-2">
                        <h1 className="text-2xl">Step 2 - Wait for Commitment to Settle</h1>
                    </div>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Commitment Process In Progress</h2>
                        <p className="text-gray-600 mb-4">Your commitment to register the ENS name is currently in progress. A User Operation has been sent to ensure the registration process is underway. </p>

                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-orange-600 bg-orange-200">Progress</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold inline-block text-orange-600">{pctComplete}%</span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-orange-200">
                                <div style={{ width: `${pctComplete}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500"></div>
                            </div>
                        </div>
                    </div>
                </a>
            </div>

        )
    }

    return (
        <div className="max-w mx-auto mt-4">
            <div className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
                <div className="bg-orange-300 text-white p-2">
                    <h1 className="text-2xl">Step 2 - Awaiting Step 1 Completion</h1>
                </div>
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Finalize Registration</h2>
                    <p className="text-gray-600 mb-4">Before moving to this step, please ensure that you&apos;ve successfully completed the commitment process in Step 1. Once Step 1 is finalized, you can proceed to finalize the registration of your ENS domain here.</p>

                    {/* Pending Message */}
                    <div className="text-orange-700 border border-orange-300 p-2 rounded">
                        <p>Pending... Awaiting completion of Step 1.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}


export function ENSRedeemWidget(props: ENSRedeemWidgetProps) {
    const task = props.operation.userOps[props.taskIdx];
    if (!task) throw new Error("Task not found")

    const { data } = useGetJobStatus(props.operation, task.id);
    if (data?.status === "ready") {
        return <ReadyENSRedeemWidget {...props} data={data} />
    }
    if (data?.status === "pending") {
        return <PendingENSRedeemWidget {...props} data={data} />
    }
    if (data?.status === "complete") {
        return <CompleteENSRedeemWidget {...props} data={data} />
    }
    return <LoadingWidget title="Step 2 - Commit to ENS Domain" />
}