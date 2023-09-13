import { ServiceFactory } from "@/services/serviceFactory";
import { redirect } from "next/navigation";
import { JobWidget } from "./widget";

interface Props {
    params: {
        address: string,
        event: string,
        jobId: string,
    }
}

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-75">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
        </div>
    );
}


export default async function Page({ params }: Props) {
    const factory = new ServiceFactory(params.event);
    const redeemSvc = await factory.getRedeemService();
    const operation = await redeemSvc.getRedeemById(params.jobId);
    if (!operation) {
        return redirect("/")
    }

    const jobWidgets = operation.userOps.map((op, idx) => {
        return (
            <div className="mb-4">
                <JobWidget key={idx} operation={operation} taskIdx={idx} />
            </div>
        );
    });

    return (
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-xl mx-auto">
            <h1 className="text-xl font-bold mb-6">Processing redeem of ENS domain {operation.params.normalizedDomainName}.eth</h1>
            {jobWidgets}
        </div>
    )
}