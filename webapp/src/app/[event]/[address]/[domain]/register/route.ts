import { enforceWhitelist } from "@/services/alchemyService";
import { ENSService } from "@/services/ensService";
import { getPolicySettingOrRedirect } from "@/services/policyService";
import { getEthersProvider } from "@/services/providerService";
import { VoucherService } from "@/services/voucherService";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    params: {
        event: string,
        address: string,
        domain: string
    }
}

export async function POST(_request: NextRequest, props: Props): Promise<NextResponse> {
    const config = getPolicySettingOrRedirect(props.params.event);
    await enforceWhitelist(config, props.params.address);

    const provider = getEthersProvider(config);
    const ens = await ENSService.fromProvider(provider, config);
    const voucher =  new VoucherService(ens);
    const availability = await voucher.getDomainAvailability({
        domain: props.params.domain,
        owner: props.params.address,
        policyId: config.policyId,
    });
    if (!availability.isAvailable) {
        return new NextResponse(JSON.stringify(availability), {
            status: 404,
        });
    }

    const transactions = await voucher.createTransactions(availability);
    console.log(transactions);
    return NextResponse.json({
        ok: true,
    })
}
