import { ServiceFactory } from "@/services/serviceFactory";
import { notFound } from "next/navigation";
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
            <div key={idx} className="mt-2">
                {content}
            </div>
        )
    });

    return (
        <div className="bg-white max-w-screen-lg rounded-lg w-full mx-auto">
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