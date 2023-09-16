import { ENSService } from "@/services/ensService";
import { getPolicySettingOr404 } from "@/services/policyService";
import { getEthersProvider } from "@/services/providerService";
import { ENTRYPOINT_ADDRESS, UserOperationService } from "@/services/userOperationService";
import { VoucherService } from "@/services/voucherService";
import { NextRequest, NextResponse } from "next/server";
import { SimpleAccount } from "userop/dist/preset/builder";
import { UserOperationBuilder } from "userop";
import { AbiCoder, ethers, keccak256 } from "ethers";
import { concatHex } from "viem";
import { Network } from "ethers";
import { AlchemyProvider } from "ethers";
import { RedeemService } from "@/services/redeemService";
import { notFound } from "next/navigation";



function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface Props {
    params: {
        event: string,
        address: string,
        domain: string
    }
}

export async function POST(request: NextRequest, props: Props): Promise<NextResponse> {
    const config = getPolicySettingOr404(props.params.event);

    const provider = getEthersProvider(config);
    const ens = await ENSService.fromProvider(provider, config);
    const voucher = new VoucherService(ens);
    const availability = await voucher.getDomainAvailability({
        domain: props.params.domain,
        owner: props.params.address,
        policyId: config.policyId,
    });
    if (!availability.isAvailable) {
        return notFound();
    }
    const redeemService = RedeemService.fromVoucherAndENS(voucher, ens);
    const redeemJob = await redeemService.startRedeemProcess(availability);
    return NextResponse.json(redeemJob);
}
