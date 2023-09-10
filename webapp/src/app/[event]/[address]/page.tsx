import { redirect } from "next/navigation";
import { getPolicySettingOrRedirect } from "../../../policyService";
import { z } from "zod";
import { AlchemyGasManagerService } from "@/alchemyService";
import { RegisterDomain } from "./registerDomain";
import { Frontend } from "./frontend";
import { getEthersProvider } from "@/providerService";


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
    const policy = getPolicySettingOrRedirect(params.event);
    const address = getEthereumAddressOrRedirect(params.address);

    const alchemyGasManagerService = new AlchemyGasManagerService(policy);
    const whitelist = await alchemyGasManagerService.getWhitelist();
    if (!whitelist.has(address.toLowerCase())) {
        return redirect("/")
    }
    return (
        <div className="container mx-auto mt-10 p-6 max-w-md bg-white rounded shadow-md">
            <h2 className="text-xl font-semibold mb-5">Register Domain</h2>
            <RegisterDomain address={params.address} event={params.event} />
        </div>
    )
}