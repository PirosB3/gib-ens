import { redirect } from "next/navigation";
import { getPolicySettingOr404 } from "../../../services/policyService";
import { z } from "zod";
import { AlchemyGasManagerService } from "@/services/alchemyService";
import { RegisterDomain } from "./registerDomain";
import { ServiceFactory } from "@/services/serviceFactory";
import Link from "next/link";


interface HomeProps {
    params: {
        event: string;
        address: string;
    }
}

const ethereumAddressSchema = z.string().refine(value =>
    /^(0x)[0-9A-Fa-f]{40}$/.test(value),
    {
        message: "Invalid Ethereum address",
        path: [], // The path is relevant if this schema is a nested part of a larger schema.
    }
);


function getEthereumAddressOrRedirect(address: string) {
    try {
        return ethereumAddressSchema.parse(address);
    } catch (error) {
        redirect("/")
    }
}

export default async function Home({ params }: HomeProps) {
    const service = new ServiceFactory(params.event);
    const redeemSvc = await service.getRedeemService();
    const currentRedeem = await redeemSvc.getCurrentRedeemForUser(params.address);

    const voucherService = await service.getVoucherService();
    const isAlreadyRedeemed = await voucherService.isAlreadyRedeemed(params.address, params.event);

    let ui;
    if (isAlreadyRedeemed) {
        ui = (
            <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Note!</strong>
                <span className="block sm:inline"> You've already registered a domain for this event. As a result, new event registrations are not possible.</span>
            </div>
        );
    } else if (currentRedeem) {
        ui = (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Warning!</strong>
                <span className="block sm:inline"> You currently have an active redeem for domain <span className="font-medium">{currentRedeem.params.normalizedDomainName}</span>. You can't attempt to register another domain until this attempt expires.</span>
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                    <Link href={`/${params.event}/${params.address}/job/${currentRedeem.id}`} className="text-red-500 hover:text-red-700 underline">Click HERE</Link> to continue registration for <span className="font-medium">{currentRedeem.params.normalizedDomainName}</span>
                </span>
            </div>
        );
    }

    const forceDisabled = isAlreadyRedeemed || !!currentRedeem;
    return (
        <div>
            {ui}
            <div className="container mx-auto mt-10 p-6 max-w-md bg-white rounded shadow-md">
                <h2 className="text-xl font-semibold mb-5">Register Domain</h2>
                <RegisterDomain address={params.address} event={params.event} forceDisabled={forceDisabled} />
            </div>
        </div>
    )
}