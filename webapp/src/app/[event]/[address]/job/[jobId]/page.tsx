import { ServiceFactory } from "@/services/serviceFactory";
import { JobWidget } from "./widget";
import { notFound } from "next/navigation";
import { EnsCommitmentOperation } from "@/base/userOps/ensCommitment";
import { ENSCommitmentWidget } from "./ensCommitment";
import { ENSRedeemWidget } from "./redeem";

interface Props {
    params: {
        address: string,
        event: string,
        jobId: string,
    }
}

export default async function Page({ params }: Props) {
    const factory = new ServiceFactory(params.event);
    const redeemSvc = await factory.getRedeemService();
    const operation = await redeemSvc.getCurrentRedeemForUser(params.address);
    if (!operation || operation.id !== params.jobId) {
        return notFound()
    }

    const jobWidgets = operation.userOps.map((op, idx) => {
        let content;
        switch (op.type) {
            case "completeENSRegistration":
                content = <ENSRedeemWidget operation={operation} taskIdx={idx} />;
                break;
            case "ensCommitment":
                content = <ENSCommitmentWidget operation={operation} taskIdx={idx} />;
                break;
            default:
                throw new Error(`Unknown operation type ${op.type}`)
        }
        return (
            <div className="mt-2">
                {content}
            </div>
        )
    });

    return (
        <div className="bg-white max-w-screen-lg rounded-lg w-full mx-auto">
            {/* <h1 className="text-xl font-bold mb-6">Processing redeem of ENS domain {operation.params.normalizedDomainName}.eth</h1> */}
            {/* Overview Section */}
            <div className="mx-auto mt-6 mb-8 px-2">
                <h1 className="text-3xl font-semibold mb-4">ENS Domain Registration Process</h1>
                <p className="text-gray-700 mb-4">Registering an Ethereum Name Service (ENS) domain is a vital step towards simplifying Ethereum addresses, making them more user-friendly and readable. The process consists of two main steps:</p>

                <ol className="list-decimal pl-5">
                    <li className="mb-2">
                        <strong>Commit to ENS Domain:</strong> Before acquiring your desired domain name, you need to express your sincere intent to register. This commitment process ensures fairness in domain acquisition, preventing abrupt domain squatting.
                    </li>
                    <li className="mb-2">
                        <strong>Finalize Registration:</strong> Once your commitment is approved, you can move on to the final registration. This phase involves associating your ENS name with an Ethereum address or other relevant data.
                    </li>
                </ol>

                <p className="text-gray-700 mt-4">Follow the steps outlined below to guide you through each phase. Make sure to complete each step in sequence to successfully register your ENS domain.</p>
            </div>

            {jobWidgets}

        </div>
    )
}



            // {/* Card 1 */}
            // <div className="max-w mx-auto">
            //     <a href="#" className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
            //         <div className="bg-blue-500 text-white p-2">
            //             <h1 className="text-2xl">Step 1 - Commit to ENS Domain</h1>
            //         </div>
            //         <div className="p-6">
            //             <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Commitment Process</h2>
            //             <p className="text-gray-600 mb-4">Initiate your intent to register an ENS name. This commitment ensures that users are sincere about their desired domain, preventing instant domain squatting.</p>
            //             <button className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition-colors duration-200">Begin commitment process</button>
            //         </div>
            //         <div className="px-6 py-2 bg-gray-100">
            //             <p className="text-sm text-gray-600">You will be asked to sign a message, we pay the gas.</p>
            //         </div>
            //     </a>
            // </div>

            // {/* Card 1 After Beginning Commitment Phase */}
            // <div className="max-w mx-auto mt-4">
            //     <a href="#" className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
            //         <div className="bg-blue-500 text-white p-2">
            //             <h1 className="text-2xl">Step 1 - Commit to ENS Domain</h1>
            //         </div>
            //         <div className="p-6">
            //             <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Commitment Process In Progress</h2>
            //             <p className="text-gray-600 mb-4">Your commitment to register the ENS name is currently in progress. A User Operation has been sent to ensure the registration process is underway. </p>
                        
            //             {/* Sample Hyperlink for the User Operation */}
            //             <a href="https://etherscan.io/tx/sample_tx_hash" className="text-blue-500 hover:underline mb-4 block">View your User Operation on Etherscan</a>
                        
            //             {/* Sample Progress Bar */}
            //             <div className="relative pt-1">
            //                 <div className="flex mb-2 items-center justify-between">
            //                     <div>
            //                         <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">Progress</span>
            //                     </div>
            //                     <div className="text-right">
            //                         <span className="text-xs font-semibold inline-block text-blue-600">50%</span>
            //                     </div>
            //                 </div>
            //                 <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
            //                     <div style={{ width: "50%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
            //                 </div>
            //             </div>
            //         </div>
            //     </a>
            // </div>

            // {/* Card 1 Success State */}
            // <div className="max-w mx-auto mt-4">
            //     <a href="#" className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
            //         <div className="bg-green-500 text-white p-2">
            //             <h1 className="text-2xl">Step 1 - Commitment Successful!</h1>
            //         </div>
            //         <div className="p-6">
            //             <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">ENS Domain Commitment</h2>
            //             <p className="text-gray-600 mb-4">Congratulations! Your commitment to register the ENS name has been successfully processed. You are now one step closer to owning your desired domain name.</p>
                        
            //             {/* Link to the Final User Operation */}
            //             <a href="https://etherscan.io/tx/final_tx_hash" className="text-green-500 hover:underline mb-4 block">View the final User Operation on Etherscan</a>
                        
            //             {/* Success Message */}
            //             <div className="text-green-600 border border-green-500 p-2 rounded">
            //                 <p>Your commitment was successful. Await further instructions to finalize the registration.</p>
            //             </div>
            //         </div>
            //     </a>
            // </div>


            // {/* Card 2 - Pending State */}
            // <div className="max-w mx-auto mt-4">
            //     <div className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
            //         <div className="bg-orange-300 text-white p-1">
            //             <h1 className="text-2xl">Step 2 - Awaiting Step 1 Completion</h1>
            //         </div>
            //         <div className="p-6">
            //             <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Finalize Registration</h2>
            //             <p className="text-gray-600 mb-4">Before moving to this step, please ensure that you've successfully completed the commitment process in Step 1. Once Step 1 is finalized, you can proceed to finalize the registration of your ENS domain here.</p>
                        
            //             {/* Pending Message */}
            //             <div className="text-orange-700 border border-orange-300 p-2 rounded">
            //                 <p>Pending... Awaiting completion of Step 1.</p>
            //             </div>
            //         </div>
            //     </div>
            // </div>

            // {/* Error State Card */}
            // <div className="max-w mx-auto mt-4">
            //     <div className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
            //         <div className="bg-red-500 text-white p-2">
            //             <h1 className="text-2xl">Error - Issue Detected</h1>
            //         </div>
            //         <div className="p-6">
            //             <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">ENS Domain Registration Error</h2>
            //             <p className="text-gray-600 mb-4">There seems to be a problem with the registration process. This could be due to a network issue, an incorrect entry, or another technical glitch.</p>
                        
            //             <div className="text-red-700 border border-red-500 p-2 rounded">
            //                 <p>An error occurred during registration. Please check the details you entered and try again. If the problem persists, contact support.</p>
            //             </div>

            //             <a href="#" className="mt-4 inline-block text-blue-500 hover:underline">Retry the process</a> or <a href="#" className="text-blue-500 hover:underline">contact support</a>.
            //         </div>
            //     </div>
            // </div>

            // <div className="max-w mx-auto mt-4">
            //     <a href="#" className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
            //         <div className="bg-blue-500 text-white p-2">
            //             <h1 className="text-2xl">Step 1 - Commit to ENS Domain</h1>
            //         </div>
            //         <div className="p-6">
            //             <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Commitment Process</h2>
            //             <p className="text-gray-600">Initiate your intent to register an ENS name. This commitment ensures that users are sincere about their desired domain, preventing instant domain squatting.</p>
            //         </div>
            //     </a>
            // </div>

            // <div className="max-w mx-auto mt-4">  {/* I've added mt-4 for a little margin between cards */}
            //     <a href="#" className="block bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in">
            //         <div className="bg-blue-500 text-white p-2">
            //             <h1 className="text-2xl">Step 2 - Finalize Registration</h1>
            //         </div>
            //         <div className="p-6">
            //             <h2 className="text-xl font-semibold mb-2 hover:text-gray-700 transition-colors duration-200">Finalization</h2>
            //             <p className="text-gray-600">Once your commitment is approved, finalize the registration process. This involves associating the ENS name with an Ethereum address or other relevant data.</p>
            //         </div>
            //     </a>
            // </div>

            // {/* Success Screen */}
            // <div className="max-w mx-auto mt-6 mb-8 text-center">
            //     <h1 className="text-3xl font-semibold mb-4 text-green-600">Registration Successful!</h1>
                
            //     <div className="mb-6 p-4 border rounded-lg">
            //         <p className="text-gray-700 mb-4">Congratulations! You've successfully registered your Ethereum Name Service (ENS) domain. This domain will help make Ethereum addresses more user-friendly and easily identifiable.</p>

            //         <img src="path_to_success_image.jpg" alt="Successful Registration" className="mx-auto mb-4" />

            //         <h2 className="text-2xl font-semibold mb-2">What's Next?</h2>
            //         <p className="text-gray-700 mb-4">You can now manage your domain, set up reverse records, or associate more data with your ENS name. Explore more options in your dashboard.</p>
            //     </div>

            //     <a href="path_to_dashboard" className="bg-green-500 text-white rounded px-6 py-3 hover:bg-green-600 transition-colors duration-200">Go to Dashboard</a>
            // </div>